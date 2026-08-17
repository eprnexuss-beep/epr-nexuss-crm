import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, message, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { EMPLOYEES } from '@/config/employees';
import { SERVICE_TYPES } from '@/config/serviceTypes';

const API_URL = import.meta.env.VITE_FILE_BASE_URL;
const { Option } = Select;

const LeadForm = ({ initialValues, onSuccess, isEdit = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState([{ date: null, message: '', status: 'pending' }]);
  const [updates, setUpdates] = useState([{ message: '' }]);
  const selectedServiceType = Form.useWatch('serviceType', form);

  // Load initial data properly
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        leadName: initialValues.leadName,
        assignedTo: initialValues.assignedTo,
        serviceType: initialValues.serviceType,
        otherServiceType: initialValues.otherServiceType,
        phone: initialValues.phone,
        email: initialValues.email,
        source: initialValues.source,
        status: initialValues.status,
      });

      if (initialValues.followUps && initialValues.followUps.length > 0) {
        const formattedFollowUps = initialValues.followUps.map(fu => ({
          date: fu.date ? dayjs(fu.date) : null,
          message: fu.message || '',
          status: fu.status || 'pending'
        }));
        setFollowUps(formattedFollowUps);
      }
      if (initialValues.updates && initialValues.updates.length > 0) {
        const formattedUpdates = initialValues.updates.map(u => ({
          message: u.message || '',
          date: u.date,
        }));
        setUpdates(formattedUpdates);
      }
    }
  }, [initialValues, form]);

  const addFollowUp = () => {
    setFollowUps([...followUps, { date: null, message: '', status: 'pending' }]);
  };

  const removeFollowUp = (index) => {
    if (followUps.length === 1) return;
    setFollowUps(followUps.filter((_, i) => i !== index));
  };

  const addUpdate = () => {
    setUpdates([...updates, { message: '' }]);
  };

  const removeUpdate = (index) => {
    if (updates.length === 1) return;
    setUpdates(updates.filter((_, i) => i !== index));
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        followUps: followUps
          .map(fu => ({
            date: fu.date ? dayjs(fu.date).toISOString() : null,
            message: fu.message?.trim() || '',
            status: fu.status || 'pending'
          }))
          .filter(fu => fu.date),
        updates: updates
          .map(u => ({ message: u.message?.trim() || '' }))
          .filter(u => u.message)
      };

      if (isEdit && initialValues?._id) {
        await axios.put(`${API_URL}lead/${initialValues._id}`, payload);
        message.success('Lead updated successfully');
      } else {
        await axios.post(`${API_URL}lead`, payload);
        message.success('Lead created successfully');
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Update Error:', error.response?.data || error);
      message.error(error.response?.data?.message || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {/* Basic Fields */}
      <Form.Item name="leadName" label="Lead Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="assignedTo" label="Assigned To">
        <Select placeholder="Select employee" allowClear>
          {EMPLOYEES.map(name => (
            <Option key={name} value={name}>{name}</Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="serviceType" label="Service Type">
        <Select placeholder="Select service type" allowClear>
          {SERVICE_TYPES.map(type => (
            <Option key={type} value={type}>{type}</Option>
          ))}
        </Select>
      </Form.Item>

      {selectedServiceType === 'Other' && (
        <Form.Item
          name="otherServiceType"
          label="Please specify service type"
          rules={[{ required: true, message: 'Please enter the service type' }]}
        >
          <Input placeholder="Enter service type" />
        </Form.Item>
      )}

      <Form.Item name="phone" label="Phone">
        <Input />
      </Form.Item>

      <Form.Item name="email" label="Email">
        <Input type="email" />
      </Form.Item>

      <Form.Item name="source" label="Source">
        <Input />
      </Form.Item>

      <Form.Item name="status" label="Status">
        <Select>
          <Option value="new">New</Option>
          <Option value="contacted">Contacted</Option>
          <Option value="qualified">Qualified</Option>
          <Option value="lost">Lost</Option>
        </Select>
      </Form.Item>

      {/* Follow-ups Section */}
      <Card title="Follow-ups" style={{ marginBottom: 16 }}>
        {followUps.map((fu, index) => (
          <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <DatePicker
                showTime={{ format: 'hh:mm A' }}
                format="DD/MM/YYYY hh:mm A"
                style={{ width: '100%' }}
                placeholder="Follow-up Date & Time"
                value={fu.date}
                onChange={(date) => {
                  const newFollowUps = [...followUps];
                  newFollowUps[index].date = date;
                  setFollowUps(newFollowUps);
                }}
              />
              <Input.TextArea
                rows={2}
                placeholder="Follow-up Message"
                value={fu.message}
                onChange={(e) => {
                  const newFollowUps = [...followUps];
                  newFollowUps[index].message = e.target.value;
                  setFollowUps(newFollowUps);
                }}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFollowUp(index)}
                disabled={followUps.length === 1}
              >
                Remove
              </Button>
            </Space>
          </div>
        ))}

        <Button type="dashed" onClick={addFollowUp} block icon={<PlusOutlined />}>
          + Add Another Follow-up
        </Button>
      </Card>

      <Card title="Client Updates" style={{ marginBottom: 16 }}>
        {updates.map((u, index) => (
          <div key={index} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.TextArea
                rows={2}
                placeholder="What happened when you connected with the client?"
                value={u.message}
                onChange={(e) => {
                  const newUpdates = [...updates];
                  newUpdates[index].message = e.target.value;
                  setUpdates(newUpdates);
                }}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeUpdate(index)}
                disabled={updates.length === 1}
              >
                Remove
              </Button>
            </Space>
          </div>
        ))}

        <Button type="dashed" onClick={addUpdate} block icon={<PlusOutlined />}>
          + Add Another Update
        </Button>
      </Card>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {isEdit ? 'Update Lead' : 'Create Lead'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LeadForm;