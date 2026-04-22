import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic YWRtaW4yOkFkbWluMTIzNA==', // admin2:Admin1234 (solo desarrollo)
  },
});

export default api;