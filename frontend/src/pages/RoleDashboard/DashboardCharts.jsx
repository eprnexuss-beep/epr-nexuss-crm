import { Card, Col, Empty, Row, Typography } from 'antd';

const colors = ['#1677ff', '#13c2c2', '#722ed1', '#52c41a', '#fa8c16', '#8c8c8c'];

function Bars({ items, emptyText }) {
  const max = Math.max(0, ...items.map(item => item.value));
  if (!max) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  return <div role="list">{items.map((item, index) => <div role="listitem" key={item.key} style={{ marginBottom: 15 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}><span>{item.label}</span><strong>{item.value}</strong></div>
    <div style={{ height: 12, background: '#f0f2f5', borderRadius: 8, overflow: 'hidden' }}><div style={{ width: `${(item.value / max) * 100}%`, height: '100%', borderRadius: 8, background: colors[index % colors.length] }} /></div>
  </div>)}</div>;
}

export default function DashboardCharts({ data, isAdmin, loading }) {
  const c = data?.counts || {};
  const status = [
    { key: 'new', label: 'New', value: c.new || 0 },
    { key: 'contacted', label: 'Contacted', value: c.contacted || 0 },
    { key: 'qualified', label: 'Qualified', value: c.qualified || 0 },
    { key: 'won', label: 'Won', value: c.won || 0 },
    { key: 'not_interested', label: 'Not Interested', value: c.not_interested || 0 },
  ];
  const other = Math.max(0, (c.total || 0) - status.reduce((sum, item) => sum + item.value, 0));
  if (other) status.push({ key: 'other', label: 'Other / unspecified', value: other });
  const followUps = [{ key: 'overdue', label: 'Overdue', value: c.overdue || 0 }, { key: 'upcoming', label: 'Due in next 24 hours', value: c.upcoming || 0 }];
  const team = (data?.team || []).map(employee => ({ key: employee._id, label: `${employee.name || 'Unnamed employee'}${employee.enabled ? '' : ' (inactive)'}`, value: employee.total || 0 })).sort((a, b) => b.value - a.value);
  return <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
    <Col xs={24} lg={12}><Card title="Leads by status" loading={loading}><Typography.Paragraph type="secondary">{isAdmin ? 'All CRM leads' : 'Your assigned leads'}</Typography.Paragraph><Bars items={status} emptyText="No leads to show" /></Card></Col>
    <Col xs={24} lg={12}><Card title="Pending follow-ups" loading={loading}><Typography.Paragraph type="secondary">Number of follow-ups, not leads. Later follow-ups are not included.</Typography.Paragraph><Bars items={followUps} emptyText="No overdue or upcoming follow-ups" /></Card></Col>
    {isAdmin && <Col xs={24}><Card title="Leads by employee" loading={loading}><Typography.Paragraph type="secondary">Assigned leads for each employee. Leads without an account assignment are not included.</Typography.Paragraph><Bars items={team} emptyText="No employee assignments to show" /></Card></Col>}
  </Row>;
}
