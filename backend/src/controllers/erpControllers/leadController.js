const mongoose = require('mongoose');
const Lead = require('../../models/erpModels/Lead');
const { isAdmin, leadScope, pickLeadFields } = require('../../middlewares/roleAccess');
const validId = id => typeof id === 'string' && mongoose.isValidObjectId(id);
const employee = id => mongoose.model('Admin').findOne({ _id: id, removed: false, enabled: true, role: 'employee' });
const safe = fn => async (req, res) => { try { await fn(req, res); } catch (e) { res.status(400).json({ success: false, message: e.message }); } };
const assignFields = async (body) => {
  if (!body.assignedUser) return { assignedUser: null, assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo.trim() : '' };
  if (!validId(body.assignedUser)) throw new Error('Invalid employee');
  const user = await employee(body.assignedUser);
  if (!user) throw new Error('Choose an active employee');
  return { assignedUser: user._id, assignedTo: [user.name, user.surname].filter(Boolean).join(' ') };
};
const create = safe(async (req, res) => {
  const data = pickLeadFields(req.body);
  Object.assign(data, isAdmin(req.admin) ? await assignFields(req.body) : { assignedUser: req.admin._id, assignedTo: [req.admin.name, req.admin.surname].filter(Boolean).join(' ') });
  const lead = await Lead.create({ ...data, createdBy: req.admin._id });
  res.status(201).json({ success: true, data: lead });
});
const list = safe(async (req, res) => {
  const leads = await Lead.find(leadScope(req.admin)).sort({ createdAt: -1 });
  res.json({ success: true, data: leads });
});
const read = safe(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid lead ID' });
  const lead = await Lead.findOne({ _id: req.params.id, ...leadScope(req.admin) });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, data: lead });
});
const update = safe(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid lead ID' });
  const data = pickLeadFields(req.body);
  if (isAdmin(req.admin) && (Object.hasOwn(req.body, 'assignedUser') || Object.hasOwn(req.body, 'assignedTo'))) {
    const current = await Lead.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!req.body.assignedUser || String(current.assignedUser || '') !== req.body.assignedUser) Object.assign(data, await assignFields(req.body));
  }
  const lead = await Lead.findOneAndUpdate({ _id: req.params.id, ...leadScope(req.admin) }, { $set: data }, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, data: lead });
});
const deleteLead = safe(async (req, res) => {
  if (!isAdmin(req.admin)) return res.status(403).json({ success: false, message: 'Admin access required' });
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid lead ID' });
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, message: 'Lead deleted' });
});
const assign = safe(async (req, res) => {
  if (!isAdmin(req.admin)) return res.status(403).json({ success: false, message: 'Admin access required' });
  const ids = req.body.leadIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(validId)) return res.status(400).json({ success: false, message: 'Select 1 to 500 valid leads' });
  const uniqueIds = [...new Set(ids)];
  if (await Lead.countDocuments({ _id: { $in: uniqueIds } }) !== uniqueIds.length) return res.status(404).json({ success: false, message: 'Some leads no longer exist; refresh and retry' });
  const fields = await assignFields({ assignedUser: req.body.employeeId });
  if (!fields.assignedUser) throw new Error('Choose an active employee');
  const result = await Lead.updateMany({ _id: { $in: uniqueIds } }, { $set: fields });
  res.json({ success: true, data: { matched: result.matchedCount, modified: result.modifiedCount }, message: 'Leads assigned' });
});
const dashboard = safe(async (req, res) => {
  const leads = await Lead.find(leadScope(req.admin)).select('status assignedUser assignedTo followUps');
  const now = new Date(), tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const counts = { total: leads.length, new: 0, contacted: 0, qualified: 0, won: 0, not_interested: 0, unassigned: 0, overdue: 0, upcoming: 0 };
  for (const lead of leads) {
    if (Object.hasOwn(counts, lead.status)) counts[lead.status]++;
    if (!lead.assignedUser) counts.unassigned++;
    for (const fu of lead.followUps || []) if (fu.status !== 'done' && fu.date) {
      const date = new Date(fu.date);
      if (date < now) counts.overdue++;
      else if (date < tomorrow) counts.upcoming++;
    }
  }
  let team = [];
  if (isAdmin(req.admin)) {
    const users = await mongoose.model('Admin').find({ removed: false, role: 'employee' }).select('name surname enabled');
    team = users.map(user => {
      const own = leads.filter(lead => String(lead.assignedUser) === String(user._id));
      return { _id: user._id, name: [user.name, user.surname].filter(Boolean).join(' '), enabled: user.enabled, total: own.length, won: own.filter(x => x.status === 'won').length, notInterested: own.filter(x => x.status === 'not_interested').length };
    });
  }
  res.json({ success: true, data: { counts, team } });
});
module.exports = { create, list, listAll: list, read, update, delete: deleteLead, assign, dashboard };
