import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
