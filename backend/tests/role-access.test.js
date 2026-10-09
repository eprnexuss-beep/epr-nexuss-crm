// Real HTTP routes and JWT auth; model storage is isolated in memory.
const test = require('node:test'), assert = require('node:assert/strict');
const mongoose = require('mongoose'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
const path = require('path');
require('module-alias').addAlias('@', path.resolve(__dirname, '../src'));
process.env.JWT_SECRET = 'test-only-secret'; process.env.OPENAI_API_KEY = 'test-only';
for (const file of require('glob').globSync('src/models/**/*.js')) require(path.resolve(file));
const User = mongoose.model('Admin'), Password = mongoose.model('AdminPassword'), Lead = mongoose.model('Lead');
const id = () => new mongoose.Types.ObjectId().toString();
const users = ['owner','employee','employee'].map((role,i) => ({ _id:id(), name:`User ${i}`, email:`u${i}@example.com`, role, enabled:true, removed:false }));
const passwords = [], leads = [];
const [admin,a,b] = users;
const tokens = users.map(u => { const token = jwt.sign({id:u._id},process.env.JWT_SECRET); passwords.push({user:u._id,salt:'salt',password:bcrypt.hashSync('saltpassword123',4),removed:false,loggedSessions:[token]}); return token; });
const same = (a,b) => a == null && b == null || String(a)===String(b);
const match = (r,f) => Object.entries(f).every(([k,v]) => {
 if(v && typeof v==='object' && !(v instanceof mongoose.Types.ObjectId)) {
  if('$in' in v) return v.$in.some(x=>same(r[k],x));
  return (!('$ne' in v)||!same(r[k],v.$ne))&&(!('$type' in v)||typeof r[k]===v.$type);
 } return same(r[k],v);
});
const query = v => ({select(){return this;},sort(){return this;},exec(){return Promise.resolve(v);},then(ok,fail){return Promise.resolve(v).then(ok,fail);}});
for(const [Model,store] of [[User,users],[Password,passwords],[Lead,leads]]) {
 Model.find=f=>query(store.filter(x=>match(x,f||{})));
 Model.findOne=f=>query(store.find(x=>match(x,f))||null);
 Model.findById=key=>query(store.find(x=>same(x._id,key))||null);
 Model.exists=async f=>store.some(x=>match(x,f));
 Model.countDocuments=async f=>store.filter(x=>match(x,f)).length;
 Model.create=async fields=>{const doc=new Model(fields), error=doc.validateSync();if(error)throw error;const v={...doc.toObject(),_id:String(doc._id),save:async function(){return this;}};store.push(v);return v;};
 Model.findOneAndUpdate=(f,u,o={})=>{const d=store.find(x=>match(x,f));if(d&&o.runValidators){const e=new Model({...d,...u.$set}).validateSync();if(e)throw e;}if(d){Object.assign(d,u.$set||u);if(u.$push)for(const[k,v]of Object.entries(u.$push))d[k].push(v);}return query(d||null);};
 Model.updateOne=async(f,u)=>{const d=store.find(x=>match(x,f));if(d)Object.assign(d,u.$set);return{modifiedCount:d?1:0};};
 Model.updateMany=async(f,u)=>{const rows=store.filter(x=>match(x,f));rows.forEach(x=>Object.assign(x,u.$set));return{matchedCount:rows.length,modifiedCount:rows.length};};
 Model.deleteOne=async f=>{const i=store.findIndex(x=>match(x,f));if(i>=0)store.splice(i,1);};
 Model.findByIdAndDelete=async key=>{const i=store.findIndex(x=>same(x._id,key));return i>=0?store.splice(i,1)[0]:null;};
}
for(const u of users)u.save=async function(){return this;};
Lead.aggregate=async()=>{const m=new Map();leads.filter(x=>!x.assignedUser&&x.assignedTo).forEach(x=>m.set(x.assignedTo,(m.get(x.assignedTo)||0)+1));return[...m].map(([_id,count])=>({_id,count}));};
const app=require('../src/app');
let base;
const req=async(route,t,method='GET',body)=>{const r=await fetch(base+route,{method,headers:{...(t?{Authorization:`Bearer ${t}`}:{ }), 'Content-Type':'application/json'},...(body && method!=='GET'?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};};
test('role access and data preservation through real application routes',async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;
 try{
 const [ta,te,tb]=tokens;
 assert.equal((await req('/lead')).status,401);
 assert.equal((await req('/api/login',null,'POST',{email:a.email,password:'password123'})).data.result.role,'employee');
 const la=(await req('/lead',te,'POST',{leadName:'A',status:'not_interested',assignedUser:b._id,createdBy:b._id,updates:[{message:'keep note'}],followUps:[{date:new Date().toISOString(),message:'keep follow-up'}]})).data.data;
 assert.equal(String(la.assignedUser),a._id);assert.equal(String(la.createdBy),a._id);
 const lb=(await req('/lead',ta,'POST',{leadName:'B',assignedUser:b._id})).data.data;
 assert.equal((await req('/lead',ta)).data.data.length,2);
 assert.equal((await req('/lead',te)).data.data.length,1);
 for(const [url,method]of [[`/lead/${lb._id}`,'GET'],[`/lead/${lb._id}`,'PUT'],[`/api/lead/read/${lb._id}`,'GET'],[`/api/lead/update/${lb._id}`,'PATCH']])assert.equal((await req(url,te,method,{leadName:'stolen'})).status,404,url);
 const edited=await req(`/lead/${la._id}`,te,'PUT',{status:'contacted',assignedUser:b._id,createdBy:b._id});assert.equal(String(edited.data.data.assignedUser),a._id);
 for(const [url,method]of [[`/lead/${la._id}`,'DELETE'],['/lead/import','POST'],['/api/employees','GET'],['/api/employees','POST'],[`/api/admin/password-update/${admin._id}`,'PATCH'],['/api/invoice/list','GET'],['/api/setting/create','POST'],['/download/invoice/invoice-test.pdf','GET'],['/public/download/invoice/invoice-test.pdf','GET'],['/lead/assign','POST']]) assert.equal((await req(url,te,method,method==='GET'?undefined:{})).status,403,url);
 assert.equal((await req('/lead/import',null,'POST')).status,401);
 assert.equal((await req('/lead/import',ta,'POST')).status,400);
 assert.equal((await req('/lead/assign',ta,'POST',{employeeId:a._id,leadIds:[la._id,id()]})).status,404);
 assert.equal((await req('/lead/assign',ta,'POST',{employeeId:b._id,leadIds:[la._id,lb._id]})).status,200);
 assert.equal((await req('/lead',te)).data.data.length,0);assert.equal((await req('/lead',tb)).data.data.length,2);
 const moved=(await req(`/lead/${la._id}`,tb)).data.data;assert.equal(moved.updates[0].message,'keep note');assert.equal(moved.followUps[0].message,'keep follow-up');
 assert.equal((await req('/lead/dashboard',tb)).data.data.counts.total,2);assert.equal((await req('/lead/dashboard',ta)).data.data.team.length,2);
 const oldId=id();leads.push({_id:oldId,leadName:'old',assignedTo:'Old Name',updates:[{message:'old note'}]});
 assert.equal((await req('/lead',tb)).data.data.length,2);
 assert.equal((await req('/api/employees/legacy-assignments',ta)).data.data[0].name,'Old Name');
 assert.equal((await req('/api/employees/link-legacy',ta,'POST',{employeeId:a._id,legacyName:'Old Name'})).data.data.linked,1);
 assert.equal((await req(`/lead/${oldId}`,te)).data.data.updates[0].message,'old note');
 const created=await req('/api/employees',ta,'POST',{name:'New Employee',email:'new@example.com',password:'secure123'});assert.equal(created.status,201);
 assert.equal((await req('/api/employees',ta,'POST',{name:'duplicate',email:'new@example.com',password:'secure123'})).status,400);
 const login=await req('/api/login',null,'POST',{email:'new@example.com',password:'secure123'});assert.equal(login.status,200);
 assert.equal((await req(`/api/employees/${created.data.data._id}`,ta,'PATCH',{password:'changed123'})).status,200);
 assert.equal((await req('/lead',login.data.result.token)).status,401);
 assert.equal((await req('/api/login',null,'POST',{email:'new@example.com',password:'changed123'})).status,200);
 assert.equal((await req('/lead',login.data.result.token)).status,401); // New login must not revive old session.
 assert.equal((await req('/api/employees',ta,'POST',{name:'Invalid',email:'invalid@example.com',password:'short'})).status,400);
 assert.equal((await req('/api/employees',ta,'POST',{name:'Escalate',email:'escalate@example.com',password:'secure123',role:'owner'})).status,400);
 assert.equal((await req('/api/admin/profile/password',te,'PATCH',{password:'ownpass123',passwordCheck:'ownpass123'})).status,200);
 assert.equal((await req('/api/login',null,'POST',{email:a.email,password:'ownpass123'})).status,200);
 const xlsx=require('xlsx'), workbook=xlsx.utils.book_new();
 xlsx.utils.book_append_sheet(workbook,xlsx.utils.json_to_sheet([{Name:'Imported lead','Service Type':'Biogas','Assigned To':a.email,Status:'not_interested',Notes:'Imported note'}]),'Leads');
 const form=new FormData();form.append('file',new Blob([xlsx.write(workbook,{type:'buffer',bookType:'xlsx'})]),'leads.xlsx');
 const upload=await fetch(base+'/lead/import',{method:'POST',headers:{Authorization:`Bearer ${ta}`},body:form});const uploaded=await upload.json();assert.equal(upload.status,200,JSON.stringify(uploaded));assert.equal(uploaded.result.imported,1);
 const imported=(await req('/lead',te)).data.data.find(x=>x.leadName==='Imported lead');assert.equal(imported.status,'not_interested');assert.equal(imported.updates[0].message,'Imported note');
 assert.equal((await req(`/api/employees/${b._id}`,ta,'PATCH',{enabled:false})).status,200);
 assert.equal((await req('/lead',tb)).status,401);assert.equal((await req('/api/login',null,'POST',{email:b.email,password:'password123'})).status,409);
 assert.equal((await req(`/lead/${la._id}`,ta,'PUT',{status:'won',assignedUser:b._id})).status,200);
 assert.equal((await req('/lead/assign',ta,'POST',{employeeId:b._id,leadIds:[oldId]})).status,400);
 assert.equal(leads.length,4);
 }finally{await new Promise(r=>server.close(r));}
});
