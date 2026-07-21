import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, message, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

const LeadForm = ({ initialValues, onSuccess, isEdit = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState([{ date: null, message: '', status: 'pending' }]);

  // Load initial data properly
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        leadName: initialValues.leadName,
        company: initialValues.company,
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
    }
  }, [initialValues, form]);

  const addFollowUp = () => {
    setFollowUps([...followUps, { date: null, message: '', status: 'pending' }]);
  };

  const removeFollowUp = (index) => {
    if (followUps.length === 1) return;
    setFollowUps(followUps.filter((_, i) => i !== index));
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
          .filter(fu => fu.date) // Only send follow-ups with dates
      };

      if (isEdit && initialValues?._id) {
        await axios.put(`http://localhost:8888/lead/${initialValues._id}`, payload);
        message.success('Lead updated successfully');
      } else {
        await axios.post('http://localhost:8888/lead', payload);
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

      <Form.Item name="company" label="Company">
        <Input />
      </Form.Item>

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
                style={{ width: '100%' }}
                placeholder="Follow-up Date"
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

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {isEdit ? 'Update Lead' : 'Create Lead'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LeadForm;