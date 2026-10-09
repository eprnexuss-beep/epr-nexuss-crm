import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';


export default function LeadImport({ onSuccess }) {
  const auth = storePersist.get('auth');

  const uploadUrl = `${BASE_URL}lead/import`;

  const props = {
    name: 'file',
    action: uploadUrl,
    headers: auth ? { Authorization: `Bearer ${auth.current.token}` } : {},
    showUploadList: false,
    beforeUpload(file) {
      return true;
    },
    onChange(info) {
      if (info.file.status === 'done') {
        const { imported, skippedCount } = info.file.response.result;
        message.success(`Imported ${imported} leads, skipped ${skippedCount}`);
        if (onSuccess) onSuccess();
      } else if (info.file.status === 'error') {
        console.error('Upload error details:', info.file.error, info.file.response);
        message.error('Import failed. Please check your file and try again.');
      }
    },
  };

  return (
    <Upload {...props} accept=".csv,.xlsx,.xls">
      <Button icon={<UploadOutlined />}>Import Leads from Sheet</Button>
    </Upload>
  );
}
