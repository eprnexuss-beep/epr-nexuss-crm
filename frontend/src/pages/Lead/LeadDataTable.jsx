import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Table, Tag, Button, Space, Popconfirm, message } from 'antd';
import axios from 'axios';

const API_URL = import.meta.env.VITE_FILE_BASE_URL;

const LeadDataTable = forwardRef(({ onEdit, onViewDetails }, ref) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_URL}lead`);
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
      await axios.delete(`${API_URL}lead/${id}`);
      message.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete lead');
    }
  };

  const assignedToFilters = [...new Set(
    leads.map(lead => lead.assignedTo).filter(name => name && name.trim() !== '')
  )].sort().map(name => ({ text: name, value: name }));

  const statusFilters = [
    { text: 'New', value: 'new' },
    { text: 'Contacted', value: 'contacted' },
    { text: 'Qualified', value: 'qualified' },
    { text: 'Won', value: 'won' },
    { text: 'Not Interested', value: 'not_interested' },
  ];

  const serviceTypeFilters = [
    { text: 'Lithium Recycling', value: 'Lithium Recycling' },
    { text: 'Tyre Recycling', value: 'Tyre Recycling' },
    { text: 'Plastic Recycling', value: 'Plastic Recycling' },
    { text: 'E-waste Recycling', value: 'E-waste Recycling' },
    { text: 'RVSF', value: 'RVSF' },
    { text: 'Biogas', value: 'Biogas' },
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
          <Popconfirm
            title="Delete this lead?"
            okText="Yes"
            cancelText="No"
            onConfirm={(e) => { e.stopPropagation(); handleDelete(record._id); }}
            onCancel={(e) => e.stopPropagation()}
          >
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={leads}
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
  );
});

export default LeadDataTable;