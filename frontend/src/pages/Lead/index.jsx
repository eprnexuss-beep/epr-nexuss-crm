import React, { useState } from 'react';
import { Button, Modal, Descriptions, Tag, Space, Typography } from 'antd';
import LeadDataTable from './LeadDataTable';
import LeadForm from './LeadForm';
import dayjs from 'dayjs';
import LeadImport from '@/components/LeadImport/LeadImport';
const { Text } = Typography;

const Lead = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);

  const showModal = () => {
    setEditingLead(null);
    setIsModalOpen(true);
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleViewDetails = (lead) => {
    setViewingLead(lead);
    setIsDetailModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleDetailCancel = () => {
    setIsDetailModalOpen(false);
    setViewingLead(null);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingLead(null);
    window.location.reload(); // temporary refresh
  };

  return (
    <>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Leads</h1>
        <Space>
          <LeadImport onSuccess={() => window.location.reload()} />
          <Button type="primary" onClick={showModal}>
            + Add New Lead
          </Button>
        </Space>
      </div>

      <LeadDataTable
        onEdit={handleEdit}
        onViewDetails={handleViewDetails}
      />

      {/* Add / Edit Modal */}
      <Modal
        title={editingLead ? 'Edit Lead' : 'Add New Lead'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={600}
        destroyOnClose
      >
        <LeadForm
          initialValues={editingLead}
          isEdit={!!editingLead}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* View Details Modal */}
      {/* View Details Modal */}
      <Modal
        title="Lead Details"
        open={isDetailModalOpen}
        onCancel={handleDetailCancel}
        footer={null}
        width={700}
      >
        {viewingLead && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Lead Name" span={2}>
              <strong>{viewingLead.leadName}</strong>
            </Descriptions.Item>

            <Descriptions.Item label="Assigned To">
              {viewingLead.assignedTo || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Service Type">
              {viewingLead.serviceType === 'Other'
                ? (viewingLead.otherServiceType || 'Other')
                : (viewingLead.serviceType || '-')}
            </Descriptions.Item>

            <Descriptions.Item label="Phone">
              {viewingLead.phone || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Email">
              {viewingLead.email || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Source">
              {viewingLead.source || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <Tag color={viewingLead.status === 'new' ? 'blue' : 'green'}>
                {viewingLead.status}
              </Tag>
            </Descriptions.Item>

            {/* Fixed: Show Next Follow-up Date & Message */}
            {/* Show Latest Upcoming Follow-up */}
            <Descriptions.Item label="Follow-up Date">
              {(() => {
                if (!viewingLead.followUps || viewingLead.followUps.length === 0) return '-';

                const today = new Date();
                const upcoming = viewingLead.followUps
                  .filter(fu => fu.date && new Date(fu.date) >= today)
                  .sort((a, b) => new Date(b.date) - new Date(a.date)); // Latest first

                return upcoming.length > 0
                  ? dayjs(upcoming[0].date).format('DD/MM/YYYY hh:mm A')
                  : '-';
              })()}
            </Descriptions.Item>

            <Descriptions.Item label="Follow-up Message" span={2}>
              {(() => {
                if (!viewingLead.followUps || viewingLead.followUps.length === 0)
                  return 'No message added';

                const today = new Date();
                const upcoming = viewingLead.followUps
                  .filter(fu => fu.date && new Date(fu.date) >= today)
                  .sort((a, b) => new Date(b.date) - new Date(a.date)); // Latest first

                return upcoming.length > 0 && upcoming[0].message
                  ? upcoming[0].message
                  : 'No message added';
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Latest Update" span={2}>
              {(() => {
                if (!viewingLead.updates || viewingLead.updates.length === 0) return 'No updates added';
                const sorted = [...viewingLead.updates].sort((a, b) => new Date(b.date) - new Date(a.date));
                const latest = sorted[0];
                return (
                  <>
                    {latest.message}
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(latest.date).format('DD/MM/YYYY hh:mm A')}
                    </Text>
                  </>
                );
              })()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default Lead;