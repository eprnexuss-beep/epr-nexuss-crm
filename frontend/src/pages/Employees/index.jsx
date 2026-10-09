import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { accountApi } from '@/utils/crmApi';
export default function Employees() {
  const [users, setUsers] = useState([]), [legacy, setLegacy] = useState([]), [loading, setLoading] = useState(false), [open, setOpen] = useState(false), [resetUser, setResetUser] = useState(null), [error, setError] = useState('');
  const [form] = Form.useForm(), [linkForm] = Form.useForm(), [resetForm] = Form.useForm();
  const load = async () => { try { setError(''); const [u, l] = await Promise.all([accountApi.get('employees'), accountApi.get('employees/legacy-assignments')]); setUsers(u.data.data); setLegacy(l.data.data); } catch (e) { setError(e.response?.data?.message || 'Failed to load employees'); } };
  useEffect(() => { load(); }, []);
  const act = async (fn, success) => { setLoading(true); try { await fn(); message.success(success); await load(); return true; } catch (e) { message.error(e.response?.data?.message || 'Request failed'); return false; } finally { setLoading(false); } };
  const create = async values => { if (await act(() => accountApi.post('employees', values), 'Employee created')) { setOpen(false); form.resetFields(); } };
  const link = values => Modal.confirm({ title: 'Link existing leads to this employee?', content: `All unlinked leads with the selected old assignment name will become accessible to this employee. Notes and follow-ups will be retained.`, onOk: async () => { if (await act(() => accountApi.post('employees/link-legacy', values), 'Existing leads linked')) linkForm.resetFields(); } });
  const columns = [{ title: 'Name', render: (_, u) => [u.name, u.surname].filter(Boolean).join(' ') }, { title: 'Login Email', dataIndex: 'email' }, { title: 'Status', dataIndex: 'enabled', render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> }, { title: 'Actions', render: (_, u) => <Space wrap><Button onClick={() => { setResetUser(u); resetForm.resetFields(); }}>Reset Password</Button><Popconfirm title={u.enabled ? 'Deactivate employee? Leads will be retained.' : 'Activate employee?'} onConfirm={() => act(() => accountApi.patch(`employees/${u._id}`, { enabled: !u.enabled }), 'Employee updated')}><Button danger={u.enabled}>{u.enabled ? 'Deactivate' : 'Activate'}</Button></Popconfirm></Space> }];
  return <>
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 20 }}><h1>Employees</h1><Button type="primary" onClick={() => setOpen(true)}>Create Employee</Button></Space>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="_id" dataSource={users} columns={columns} />
    <Card title="Link Existing Lead Assignments" style={{ marginTop: 24 }}><p>Select the old assignment name and its correct employee account. Linking changes ownership fields only; it keeps the lead history.</p><Form form={linkForm} layout="vertical" onFinish={link}>
      <Form.Item name="legacyName" label="Old Assignment Name" rules={[{ required: true }]}><Select options={legacy.map(x => ({ value: x.name, label: `${x.name} (${x.count} leads)` }))} /></Form.Item>
      <Form.Item name="employeeId" label="Employee Account" rules={[{ required: true }]}><Select options={users.filter(x => x.enabled).map(x => ({ value: x._id, label: `${x.name} ${x.surname || ''} — ${x.email}` }))} /></Form.Item>
      <Button htmlType="submit" loading={loading}>Link Existing Leads</Button>
    </Form></Card>
    <Modal title="Create Employee Login" open={open} onCancel={() => setOpen(false)} footer={null}><Form form={form} layout="vertical" onFinish={create}>
      <Form.Item name="name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="surname" label="Last Name"><Input /></Form.Item>
      <Form.Item name="email" label="Login Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item><Form.Item name="password" label="Initial Password" rules={[{ required: true }, { min: 8 }]}><Input.Password autoComplete="new-password" /></Form.Item><Button type="primary" htmlType="submit" loading={loading}>Create Employee</Button>
    </Form></Modal>
    <Modal title={`Reset Password — ${resetUser?.name || ''}`} open={!!resetUser} onCancel={() => setResetUser(null)} footer={null}><Form form={resetForm} layout="vertical" onFinish={async values => { if (await act(() => accountApi.patch(`employees/${resetUser._id}`, values), 'Password reset; previous sessions signed out')) setResetUser(null); }}><Form.Item name="password" label="New Password" rules={[{ required: true }, { min: 8 }]}><Input.Password autoComplete="new-password" /></Form.Item><Button type="primary" htmlType="submit" loading={loading}>Reset Password</Button></Form></Modal>
  </>;
}
