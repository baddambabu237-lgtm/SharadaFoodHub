import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sharadha_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for 401 handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sharadha_token');
      localStorage.removeItem('sharadha_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
