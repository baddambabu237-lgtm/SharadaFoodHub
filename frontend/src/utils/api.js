import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://sharadafoodhub1.onrender.com/api',
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
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('sharadha_token');
      localStorage.removeItem('sharadha_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
