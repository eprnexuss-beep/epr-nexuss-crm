import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { crmApi } from '@/utils/crmApi';
import { useRole } from '@/utils/roleAccess';
export default function RoleDashboard() {
  const { user, isAdmin } = useRole();
  const [data, setData] = useState(null), [error, setError] = useState('');
  const load = async () => { try { setError(''); setData((await crmApi.get('lead/dashboard')).data.data); } catch (e) { setError(e.response?.data?.message || 'Failed to load dashboard'); } };
  useEffect(() => { load(); }, []);
  const metrics = [['total', 'Total Leads'], ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['won', 'Won'], ['not_interested', 'Not Interested'], ['overdue', 'Overdue Follow-ups'], ['upcoming', 'Follow-ups in Next 24 Hours'], ...(isAdmin ? [['unassigned', 'Leads Awaiting Account Assignment']] : [])];
  return <>
    <h1>{isAdmin ? 'Admin Dashboard' : 'My Dashboard'}</h1>
    <p>Welcome, {user?.name}. {isAdmin ? 'Manage your team and all CRM leads.' : 'Manage your assigned leads and follow-ups.'}</p>
    <Space wrap style={{ marginBottom: 24 }}><Link to="/lead"><Button type="primary">{isAdmin ? 'Manage Leads' : 'My Leads'}</Button></Link><Link to="/not-interested-leads"><Button>Not Interested Leads</Button></Link>{isAdmin && <Link to="/employees"><Button>Manage Employees</Button></Link>}<Button onClick={load}>Refresh</Button></Space>
    {error && <Alert type="error" showIcon message={error} />}
    <Row gutter={[16, 16]}>{metrics.map(([key, title]) => <Col xs={24} sm={12} lg={8} key={key}><Card loading={!data && !error}><Statistic title={title} value={data?.counts[key] ?? 0} /></Card></Col>)}</Row>
    {isAdmin && <Card title="Team Lead Overview" style={{ marginTop: 24 }}><Table rowKey="_id" dataSource={data?.team || []} columns={[{ title: 'Employee', dataIndex: 'name' }, { title: 'Account', dataIndex: 'enabled', render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> }, { title: 'Total Leads', dataIndex: 'total' }, { title: 'Won', dataIndex: 'won' }, { title: 'Not Interested', dataIndex: 'notInterested' }]} /></Card>}
  </>;
}
