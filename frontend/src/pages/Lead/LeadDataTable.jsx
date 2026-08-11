import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Popconfirm, message } from 'antd';
import axios from 'axios';

const API_URL = import.meta.env.VITE_FILE_BASE_URL;
const LeadDataTable = ({ onEdit, onViewDetails }) => {
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

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}lead/${id}`);
      message.success('Lead deleted successfully');
      fetchLeads();           // Refresh table
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete lead');
    }
  };

  const columns = [
    { title: 'Lead Name', dataIndex: 'leadName', key: 'leadName' },
    { title: 'Company', dataIndex: 'company', key: 'company' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'new' ? 'blue' : 'green'}>{status}</Tag>,
    },
        {
      title: 'Follow-up Date',
      key: 'followUpDate',
      render: (_, record) => {
        if (!record.followUps || record.followUps.length === 0) return '-';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter pending + future follow-ups and sort by date DESC (Latest first)
        const upcoming = record.followUps
          .filter(fu => fu.date && new Date(fu.date) >= today)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (upcoming.length > 0) {
          return new Date(upcoming[0].date).toLocaleDateString();
        }
        return '-';
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click
              onEdit(record);
            }}
          >
            Edit
          </Button>
          <Popconfirm 
            title="Delete this lead?" 
            okText="Yes" 
            cancelText="No"
            onConfirm={(e) => {
              e.stopPropagation(); // Important
              handleDelete(record._id);
            }}
            onCancel={(e) => e.stopPropagation()}
          >
            <Button 
              size="small" 
              danger
              onClick={(e) => e.stopPropagation()} // Extra safety
            >
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
          // Only open details if click is NOT on action buttons
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
};

export default LeadDataTable;