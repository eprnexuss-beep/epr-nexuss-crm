import axios from 'axios';
import { BASE_URL, API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
export const crmApi = axios.create({ baseURL: BASE_URL });
export const accountApi = axios.create({ baseURL: API_BASE_URL });
for (const client of [crmApi, accountApi]) client.interceptors.request.use(config => {
  const token = storePersist.get('auth')?.current?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
