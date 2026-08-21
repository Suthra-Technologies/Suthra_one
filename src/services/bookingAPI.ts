import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { handleRequestStart, handleRequestEnd } from '../utils/globalLoader';
import { apiBaseUrl } from './api';

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  handleRequestStart(config.method);
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    handleRequestEnd(response.config.method);
    return response;
  },
  (error) => {
    handleRequestEnd(error.config?.method, true);
    return Promise.reject(error);
  }
);

export const tablesAPI = {
  getPublicTables: (params: any = {}) => api.get('/tables-new/public', { params }),
  getAvailableTables: (params: any) => api.get('/tables-new/available', { params }),
  getAvailableSlots: (params: any) => api.get('/tables-new/slots', { params }),
  getAllTables: () => api.get('/tables-new'),
  getTable: (id: string) => api.get(`/tables-new/${id}`),
  createTable: (data: any) => api.post('/tables-new', data),
  updateTable: (id: string, data: any) => api.put(`/tables-new/${id}`, data),
  deleteTable: (id: string) => api.delete(`/tables-new/${id}`),
  updateTableStatus: (id: string, status: string) => api.patch(`/tables-new/${id}/status`, { status }),
};

export const bookingsAPI = {
  createBooking: (data: any) => api.post('/bookings', data),
  getMyBookings: (params: any = {}) => api.get('/bookings/my-bookings', { params }),
  getGuestBookings: (email: string) => api.post('/bookings/guest-bookings', { email }),
  getBooking: (bookingId: string) => api.get(`/bookings/${bookingId}`),
  updateBooking: (bookingId: string, data: any) => api.put(`/bookings/${bookingId}`, data),
  cancelBooking: (bookingId: string) => api.patch(`/bookings/${bookingId}/cancel`),
  getAllBookings: (params: any = {}) => api.get('/bookings/admin/all', { params }),
};

export default api;
