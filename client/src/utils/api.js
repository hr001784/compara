import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 120000,
});

export async function sendChatMessage({ message, layout, history }) {
  const { data } = await api.post('/chat', { message, layout, history });
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}
