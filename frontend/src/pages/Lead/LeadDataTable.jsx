import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Table, Tag, Button, Space, Popconfirm, Select, message } from 'antd';
import { crmApi, accountApi } from '@/utils/crmApi';
import { useRole } from '@/utils/roleAccess';
import { useSearchParams } from 'react-router-dom';

import { filterLeadsByStatus } from './leadStatus.mjs';

const API_URL = import.meta.env.VITE_FILE_BASE_URL;

const LeadDataTable = forwardRef(({ onEdit, onViewDetails, notInterestedOnly = false }, ref) => {
  const { isAdmin } = useRole();
  const [employees, setEmployees] = useState([]), [selectedKeys, setSelectedKeys] = useState([]), [employeeId, setEmployeeId] = useState(null), [assigning, setAssigning] = useState(false);
  useEffect(() => {
    if (isAdmin) accountApi.get('employees').then(res => setEmployees(res.data.data)).catch(() => message.error('Failed to load employee accounts'));
  }, [isAdmin]);
  const assignSelected = async () => {
    if (!selectedKeys.length || !employeeId) return message.warning('Select leads and an employee');
    setAssigning(true);
    try { await crmApi.post('lead/assign', { leadIds: selectedKeys, employeeId }); message.success('Leads assigned successfully'); setSelectedKeys([]); await fetchLeads(); }
    catch (e) { message.error(e.response?.data?.message || 'Assignment failed'); }
    finally { setAssigning(false); }
  };
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await crmApi.get(`lead`);
      setLeads(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      message.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchLeads
  }));

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id) => {
    try {
      await crmApi.delete(`lead/${id}`);
      message.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete lead');
    }
  };

  const pageLeads = filterLeadsByStatus(leads, notInterestedOnly);

  const assignedToFilters = [...new Set(
    pageLeads.map(lead => lead.assignedTo).filter(name => name && name.trim() !== '')
  )].sort().map(name => ({ text: name, value: name }));

  const statusFilters = [
    { text: 'New', value: 'new' },
    { text: 'Contacted', value: 'contacted' },
    { text: 'Qualified', value: 'qualified' },
    { text: 'Won', value: 'won' },
    ...(notInterestedOnly ? [{ text: 'Not Interested', value: 'not_interested' }] : []),
  ];
  const filteredLeads = searchQuery
  ? pageLeads.filter(lead => {
      const q = searchQuery.toLowerCase();
      return (
        (lead.leadName && lead.leadName.toLowerCase().includes(q)) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.assignedTo && lead.assignedTo.toLowerCase().includes(q))
      );
    })
  : pageLeads;

  const serviceTypeFilters = [
    { text: 'Lithium Recycling', value: 'Lithium Recycling' },
    { text: 'Tyre Recycling', value: 'Tyre Recycling' },
    { text: 'Plastic Recycling', value: 'Plastic Recycling' },
    { text: 'E-waste Recycling', value: 'E-waste Recycling' },
    { text: 'RVSF', value: 'RVSF' },
    { text: 'Biogas', value: 'Biogas' },
    { text: 'Digital Marketing', value: 'Digital Marketing' },
    { text: 'Other', value: 'Other' },
  ];

  const columns = [
    { title: 'Lead Name', dataIndex: 'leadName', key: 'leadName' },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      filters: assignedToFilters,
      onFilter: (value, record) => record.assignedTo === value,
    },
    {
      title: 'Service Type',
      dataIndex: 'serviceType',
      key: 'serviceType',
      filters: serviceTypeFilters,
      onFilter: (value, record) => record.serviceType === value,
      render: (serviceType, record) =>
        serviceType === 'Other' ? (record.otherServiceType || 'Other') : (serviceType || '-'),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: statusFilters,
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        const colorMap = {
          new: 'blue',
          contacted: 'gold',
          qualified: 'purple',
          won: 'green',
          not_interested: 'red',
        };
        const labelMap = {
          new: 'New',
          contacted: 'Contacted',
          qualified: 'Qualified',
          won: 'Won',
          not_interested: 'Not Interested',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Follow-up Date',
      key: 'followUpDate',
      render: (_, record) => {
        if (!record.followUps || record.followUps.length === 0) return '-';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = record.followUps
          .filter(fu => fu.date && new Date(fu.date) >= today)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        if (upcoming.length > 0) {
          return new Date(upcoming[0].date).toLocaleString();
        }
        return '-';
      },
    },
    {
      title: 'Latest Update',
      key: 'latestUpdate',
      render: (_, record) => {
        if (!record.updates || record.updates.length === 0) return '-';
        const sorted = [...record.updates].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        return latest.message.length > 40
          ? latest.message.substring(0, 40) + '...'
          : latest.message;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={(e) => { e.stopPropagation(); onEdit(record); }}>
            Edit
          </Button>
          {isAdmin && <Popconfirm
            title="Delete this lead?"
            okText="Yes"
            cancelText="No"
            onConfirm={(e) => { e.stopPropagation(); handleDelete(record._id); }}
            onCancel={(e) => e.stopPropagation()}
          >
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>
              Delete
            </Button>
          </Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <>
    {isAdmin && <Space wrap style={{ marginBottom: 16 }}>
      <span>{selectedKeys.length} selected</span>
      <Select style={{ minWidth: 260 }} placeholder="Assign to employee" value={employeeId} onChange={setEmployeeId} options={employees.filter(x => x.enabled).map(x => ({ value: x._id, label: `${x.name} ${x.surname || ''} — ${x.email}` }))} />
      <Button type="primary" onClick={assignSelected} loading={assigning} disabled={!selectedKeys.length || !employeeId}>Assign Selected Leads</Button>
      <Button onClick={() => setSelectedKeys([])} disabled={!selectedKeys.length}>Clear Selection</Button>
    </Space>}
    <Table
      rowSelection={isAdmin ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys, selections: [Table.SELECTION_ALL, Table.SELECTION_NONE] } : undefined}
      columns={columns}
      dataSource={filteredLeads}
      loading={loading}
      rowKey="_id"
      onRow={(record) => ({
        onClick: (e) => {
          const isActionClick = e.target.closest('button') || e.target.closest('.ant-popconfirm');
          if (!isActionClick) {
            onViewDetails(record);
          }
        },
        style: { cursor: 'pointer' }
      })}
      scroll={{ x: true }}
    />
    </>
  );
});

export default LeadDataTable;