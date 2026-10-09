import { message } from 'antd';
import storePersist from '@/redux/storePersist';
export async function downloadDocument(url) {
  try {
    const token = storePersist.get('auth')?.current?.token;
    const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error('Unable to download document');
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl; link.download = url.split('/').pop(); link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (e) { message.error(e.message); }
}
