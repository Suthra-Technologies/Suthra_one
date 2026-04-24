// src/services/api.ts
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BRAND_CONFIG } from '../config/brandConfig';

const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const brandApiBase = (BRAND_CONFIG.apiBaseUrl as string | undefined)?.trim();

const rawApiBase =
 envApiBase ||
  brandApiBase ||
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  'http://localhost:5006';

// Ensure we append /api exactly once, even if env already includes /api
const normalizedBase = rawApiBase
  .replace(/\/api\/?$/, '') // drop trailing /api
  .replace(/\/$/, '');      // drop trailing slash

export const apiBaseUrl = (() => {
  try {
    const base = normalizedBase || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5006');
    return new URL('/api', base).toString().replace(/\/$/, '');
  } catch {
    return 'http://localhost:5006/api';
  }
})();

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // Increased from 10000 to 30000 (30 seconds)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach JWT if present
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('jwt');
    if (token && token !== 'undefined' && token !== '' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('jwt');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – generic error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');

      // Public customer-facing paths — don't force-redirect to login
      // Guests are allowed to browse these pages without being logged in
      const publicPaths = ['customer/order', 'customer/catering', 'customer/book-table'];
      const isPublicPath = publicPaths.some(p => window.location.pathname.includes(p));

      if (!isPublicPath) {
        toast.error('Session expired. Please login again.');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.');
      return Promise.reject(error);
    }
    // if (error.response?.status >= 500) {
    //   toast.error('Server error. Please try again later.');
    //   return Promise.reject(error);
    // }
    if (error.response?.status < 500 && error.response?.status >= 400) {
      console.warn('API Error:', message);
    }
    return Promise.reject(error);
  }
);

// -------------------- Auth API --------------------
export const authAPI = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  customerRegister: (userData: any) => api.post('/auth/customer/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData: any) => api.put('/auth/profile', userData),
  changePassword: (passwordData: any) => api.put('/auth/change-password', passwordData),
  verifyToken: () => api.get('/auth/verify'),
  getRoles: () => api.get('/auth/roles'),
  getPublicMenu: () => api.get('/menu/public'),
  resetPasswordWithToken: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  getCustomerCards: () => api.get('/auth/customer/cards'),
  saveCustomerCard: (cardData: any) => api.post('/auth/customer/cards', cardData),
  deleteCustomerCard: (index: number) => api.delete(`/auth/customer/cards/${index}`),
};


// -------------------- Users API --------------------
export const usersAPI = {
  getUsers: (params?: { page?: number; limit?: number; role?: string; isActive?: boolean; search?: string }) => api.get('/users', { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  createUser: (userData: any) => api.post('/users', userData),
  updateUser: (id: string, userData: any) => api.put(`/users/${id}`, userData),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  toggleUserStatus: (id: string) => api.patch(`/users/${id}/toggle-status`),
  resetPassword: (id: string, data: any) => api.put(`/users/${id}/reset-password`, data),
};

// -------------------- Billing API --------------------
export const billingAPI = {
  status: () => api.get('/billing/status'),
};

// -------------------- Orders API --------------------
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (orderData: any, config?: AxiosRequestConfig) =>
    api.post('/orders', orderData, { timeout: 60000, ...(config ?? {}) }),
  update: (id: string, orderData: any, config?: AxiosRequestConfig) =>
    api.put(`/orders/${id}`, orderData, { timeout: 60000, ...(config ?? {}) }),
  delete: (id: string) => api.delete(`/orders/${id}`),

  // Public/Guest Order
  // Public/Guest Order
  createPublic: (orderData: any, tenantSlug: string) =>
    api.post('/public/orders', orderData, { params: { tenantSlug } }),

  getPublicCoupons: (tenantSlug: string) =>
    api.get('/public/orders/coupons', { params: { tenantSlug } }),

  validatePublicCoupon: (code: string, tenantSlug: string, orderType?: string) =>
    api.post('/public/orders/validate-coupon', { code, orderType }, { params: { tenantSlug } }),

  getPublicSettings: (tenantSlug: string) =>
    api.get('/public/orders/settings', { params: { tenantSlug } }),

  getPublicPaymentConfig: (tenantSlug: string) =>
    api.get('/public/orders/payment-config', { params: { tenantSlug } }),

  createPublicPaymentIntent: (amount: number, tenantSlug?: string, currency?: string) =>
    api.post('/public/orders/create-payment-intent', { amount, currency, tenantSlug }),

  verifyPublicPaymentIntent: (tenantSlug: string, intentId: string) =>
    api.get(`/public/orders/verify-payment-intent/${intentId}`, { params: { tenantSlug } }),

  getDeliveryQuote: (deliveryAddress: any, items: any[], tenantSlug: string) =>
    api.post('/public/orders/delivery-quote', { deliveryAddress, items }, { params: { tenantSlug } }),

  // Filtering & search
  filter: (params: { status?: string; orderType?: string; search?: string; startDate?: string; endDate?: string; page?: number; limit?: number; isPreOrder?: boolean }) =>
    api.get('/orders/filter', { params }),
  getActive: () => api.get('/orders/active'),
  getKitchen: () => api.get('/orders/kitchen'),
  getCompleted: () => api.get('/orders/completed'),
  getCancelled: () => api.get('/orders/cancelled'),

  // Status management
  updateStatus: (id: string, status: string, notes?: string) =>
    api.post(`/orders/${id}/status`, { status, notes }),
  cancel: (id: string, reason?: string) =>
    api.patch(`/orders/${id}/cancel`, { reason }),

  // Add items to existing order
  addItems: (id: string, items: any[], kotNumber?: string) =>
    api.post(`/orders/${id}/items`, { items, kotNumber }),

  // Remove item from order
  removeItem: (id: string, itemIndex: number) =>
    api.delete(`/orders/${id}/items/${itemIndex}`),

  // Kitchen item-wise status updates
  updateItemStatus: (orderId: string, itemIndex: number, status: string, cancelReason?: string) =>
    api.patch(`/orders/${orderId}/items/${itemIndex}/status`, { status, cancelReason }),
  updateAllItemsStatus: (orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/items/all/status`, { status }),

  // Payment splits
  addPaymentSplit: (id: string, paymentData: any) =>
    api.post(`/orders/${id}/payments`, paymentData),
  removePaymentSplit: (id: string, paymentId: string) =>
    api.delete(`/orders/${id}/payments/${paymentId}`),

  // Bill generation
  getBillData: (id: string) => api.get(`/orders/${id}/bill`),

  // Coupon management
  validateCoupon: (code: string) => api.post('/orders/validate-coupon', { code }),
  getCoupons: () => api.get('/orders/coupons'),
  getMyOrders: () => api.get('/orders/my-orders'),
  createStripeCheckout: (orderId: string) => api.post(`/orders/${orderId}/checkout`),
  confirmStripeCheckout: (orderId: string, sessionId: string) => api.post(`/orders/${orderId}/confirm-payment`, { sessionId }),
  updateLocation: (id: string, lat: number, lng: number) => api.patch(`/orders/${id}/location`, { lat, lng }),
  syncUberEatsStatus: (orderId: string) => api.post(`/ubereats/sync/${orderId}`),
  syncDoordashStatus: (orderId: string) => api.post(`/doordash/sync/${orderId}`),
  dispatchUberEatsDelivery: (orderId: string) => api.post(`/ubereats/dispatch/${orderId}`),
  simulateUberEatsStatus: (orderId: string, status: string) => api.post(`/ubereats/simulate/${orderId}`, { status }),
};

// -------------------- Uber Direct API --------------------
export const ubereatsAPI = {
  // Deliveries
  createDelivery: (payload: any) => api.post('/ubereats/deliveries', payload),
  listDeliveries: (params?: any) => api.get('/ubereats/deliveries', { params }),
  getDelivery: (deliveryId: string) => api.get(`/ubereats/deliveries/${deliveryId}`),
  updateDelivery: (deliveryId: string, payload: any) => api.post(`/ubereats/deliveries/${deliveryId}`, payload),
  cancelDelivery: (deliveryId: string, payload?: any) => api.post(`/ubereats/deliveries/${deliveryId}/cancel`, payload),
  getProofOfDelivery: (deliveryId: string) => api.get(`/ubereats/deliveries/${deliveryId}/proof-of-delivery`),

  // Quotes
  createQuote: (payload: any) => api.post('/ubereats/quotes', payload),

  // Stores
  findStores: (latitude: number, longitude: number) => api.get('/ubereats/stores', { params: { latitude, longitude } }),

  // Organizations
  createOrganization: (payload: any) => api.post('/ubereats/organizations', payload),
  getOrganization: (organizationId: string) => api.get(`/ubereats/organizations/${organizationId}`),
  inviteMember: (organizationId: string, payload: any) => api.post(`/ubereats/organizations/${organizationId}/memberships/invite`, payload),

  // Business Locations
  getBusinessLocations: (organizationId: string) => api.get(`/ubereats/organizations/${organizationId}/business-locations`),
  getBusinessLocation: (organizationId: string, businessLocationId: string) => api.get(`/ubereats/organizations/${organizationId}/business-locations/${businessLocationId}`),
  updateBusinessLocation: (organizationId: string, businessLocationId: string, payload: any) => api.patch(`/ubereats/organizations/${organizationId}/business-locations/${businessLocationId}`, payload),

  // Refunds
  submitRefund: (payload: any) => api.post('/ubereats/refund', payload),

  // Webhooks
  listWebhooks: () => api.get('/ubereats/webhooks'),
  registerWebhook: (url: string) => api.post('/ubereats/webhooks/register', { url }),
  deleteWebhook: (webhookId: string) => api.delete(`/ubereats/webhooks/${webhookId}`),
};

// -------------------- Rewards API --------------------
export const rewardsAPI = {
  getCustomerInfo: (params: { search?: string; email?: string; phone?: string }) => api.get('/orders/rewards/customer-info', { params }),
};

// -------------------- Attendance API --------------------
export const attendanceAPI = {
  getStatus: () => api.get('/attendance/status'),
  clockIn: (data: { location?: { lat: number; lng: number; accuracy?: number }; note?: string }) =>
    api.post('/attendance/clock-in', data),
  clockOut: (data: { location?: { lat: number; lng: number; accuracy?: number } }) =>
    api.post('/attendance/clock-out', data),
  getMyHistory: () => api.get('/attendance/my-history'),
  getAllAttendance: (filters: any) => api.get('/attendance/admin/all', { params: filters }),
  createManual: (data: any) => api.post('/attendance/admin/manual', data),
  update: (id: string, data: any) => api.patch(`/attendance/admin/${id}`, data),
};

// -------------------- Menu API --------------------
export const menuAPI = {
  getAll: (params?: { search?: string; cursor?: string; limit?: number; category?: string; subcategory?: string; foodType?: string; isAvailable?: boolean; isCateringAvailable?: boolean }) => api.get('/menu', { params }),
  getAllCategories: () => api.get('/menu/categories'),
  getAllSubcategories: (categoryId?: string) => api.get('/menu/subcategories', { params: categoryId ? { categoryId } : undefined }),
  getOne: (id: string) => api.get(`/menu/${id}`),
  create: (menuData: any) => api.post('/menu', menuData),
  bulkCreate: (items: any[]) => api.post('/menu/bulk', items),
  update: (id: string, menuData: any) => api.put(`/menu/${id}`, menuData),
  delete: (id: string) => api.delete(`/menu/${id}`),
  getPublicMenu: (tenantSlug?: string, search?: string) => api.get('/menu/public', { params: { tenantSlug, search } }),

  // Category management
  createCategory: (categoryData: any) => api.post('/menu/categories', categoryData),
  updateCategory: (id: string, categoryData: any) => api.put(`/menu/categories/${id}`, categoryData),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
  createSubcategory: (subcategoryData: any) => api.post('/menu/subcategories', subcategoryData),
  updateSubcategory: (id: string, subcategoryData: any) => api.put(`/menu/subcategories/${id}`, subcategoryData),
  deleteSubcategory: (id: string) => api.delete(`/menu/subcategories/${id}`),
};

// -------------------- Tax Categories API (External) --------------------
export const taxCategoriesAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    axios.get('https://tax.evergreenfarmsusa.com/tax-categories', { params }),
};

// -------------------- Tax Calculation API --------------------
export const taxAPI = {
  calculate: (data: any) => api.post('/tax/calculate', data),
};

// -------------------- Trays API --------------------
export const traysAPI = {
  getAll: () => api.get('/trays'),
  getOne: (id: string) => api.get(`/trays/${id}`),
  create: (trayData: any) => api.post('/trays', trayData),
  update: (id: string, trayData: any) => api.put(`/trays/${id}`, trayData),
  delete: (id: string) => api.delete(`/trays/${id}`),
};

// -------------------- Tables API --------------------
export const tablesAPI = {
  getAll: () => api.get('/tables'),
  getOne: (id: string) => api.get(`/tables/${id}`),
  create: (tableData: any) => api.post('/tables', tableData),
  update: (id: string, tableData: any) => api.put(`/tables/${id}`, tableData),
  delete: (id: string) => api.delete(`/tables/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/tables/${id}/status`, { status }),
  merge: (primaryId: string, secondaryIds: string[]) => api.post('/tables/merge', { primaryId, secondaryIds }),
  unmerge: (primaryId: string) => api.post('/tables/unmerge', { primaryId }),
};

// -------------------- Inventory API --------------------
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getOne: (id: string) => api.get(`/inventory/${id}`),
  create: (itemData: any) => api.post('/inventory', itemData),
  update: (id: string, itemData: any) => api.put(`/inventory/${id}`, itemData),
  delete: (id: string) => api.delete(`/inventory/${id}`),

  // Raw materials specific
  // Raw Materials specific
  getRawMaterials: (params?: { page: number; limit: number }) => api.get('/inventory/raw-materials/all', { params }),
  bulkUploadRawMaterials: (items: any[]) => api.post('/inventory/raw-materials/bulk-upload', { items }),

  // Usage tracking
  recordUsage: (id: string, usageData: { quantity: number; reason: string }) =>
    api.post(`/inventory/${id}/usage`, usageData),
  getDailyUsageReport: (date: string) =>
    api.get('/inventory/reports/daily-usage', { params: { date } }),
  getUsageReport: (fromDate: string, toDate: string, params?: { page: number; limit: number; type?: string }) =>
    api.get('/inventory/reports/usage-range', { params: { fromDate, toDate, ...params } }),
  getUsageHistory: (id: string, startDate: string, endDate: string) =>
    api.get(`/inventory/${id}/usage-history`, { params: { startDate, endDate } }),
  restockBulk: (items: Array<{ inventoryId: string; quantity: number; costPrice?: number }>) =>
    api.post('/inventory/restock-bulk', { items }),
};


// -------------------- Reports API --------------------
export const reportsAPI = {
  getDashboard: (params?: any) => api.get('/reports/dashboard', { params }),
  getBestSellingItems: (params?: any) => api.get('/reports/best-selling-items', { params }),
  getOrdersByType: (params?: any) => api.get('/reports/orders-by-type', { params }),
  getWaiterPerformance: (params?: any) => api.get('/reports/waiter-performance', { params }),
  getMaterialUsage: (params?: any) => api.get('/reports/material-usage', { params }),
  getSalesReport: (params?: any) => api.get('/reports/sales-report', { params }),
  getComprehensive: (params?: any) => api.get('/reports/comprehensive', { params }),
  // New critical reports
  getPeakHours: (params?: any) => api.get('/reports/peak-hours', { params }),
  getPaymentAnalytics: (params?: any) => api.get('/reports/payment-analytics', { params }),
  getCategoryPerformance: (params?: any) => api.get('/reports/category-performance', { params }),
  getCancellationAnalysis: (params?: any) => api.get('/reports/cancellation-analysis', { params }),
  getProfitLoss: (params?: any) => api.get('/reports/profit-loss', { params }),
  getCustomerAnalytics: (params?: any) => api.get('/reports/customer-analytics', { params }),
  getInventoryStockLevels: () => api.get('/reports/inventory-stock'),
  getCouponAnalytics: (params?: any) => api.get('/reports/coupon-analytics', { params }),
  getPromoSummary: (params?: any) => api.get('/reports/promo-summary', { params }),
  getPromoRedemptions: (params?: any) => api.get('/reports/promo-redemptions', { params }),
  getPromoCompensation: (params?: any) => api.get('/reports/promo-compensation', { params }),
  getDeliveryReport: (params?: any) => api.get('/reports/delivery-report', { params }),
  exportExcel: (params?: any) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
};

// -------------------- Printer API --------------------
export const printersAPI = {
  testPrint: (config: any) => api.post('/printers/test-print', config),

  // Print Agent Pairing
  createAgent: (data: { name: string; roles?: string[] }) => api.post('/printers/agents', data),
  listAgents: () => api.get('/printers/agents'),
  revokeAgent: (id: string) => api.delete(`/printers/agents/${id}`),
  regenerateAgentToken: (id: string) => api.patch(`/printers/agents/${id}/regenerate-token`),
};

// -------------------- Settings API --------------------
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  get: (category: string) => api.get(`/settings/${category}`),
  update: (category: string, settings: any) => api.put(`/settings/${category}`, settings),
  getTaxRate: (zipCode: string, state?: string) =>
    api.get(`/settings/tax-rate/${zipCode}`, { params: state ? { state } : {} }),
  getPublicHours: (slug: string) => api.get(`/settings/public/${slug}/hours`),
};

// -------------------- Subscription API --------------------
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  subscribe: (planId: string) => api.post('/subscription/subscribe', { planId }),
  cancel: () => api.post('/subscription/cancel'),
  createCheckoutSession: (data: {
    planId: string;
    amount: number;
    successUrl: string;
    cancelUrl: string;
  }) => api.post('/payments/create-checkout-session', data),
  verifySession: (sessionId: string) => api.post(`/payments/verify-session/${sessionId}`),
};

// -------------------- Coupons API --------------------
export const couponsAPI = {
  getAll: (params?: { page: number; limit: number; search?: string }) => api.get('/coupons', { params }),
  getActive: (orderType?: string, billAmount?: number) =>
    api.get('/coupons/active', { params: { orderType, billAmount } }),
  validate: (code: string, orderType: string, billAmount: number, customerId?: string) =>
    api.get(`/coupons/validate/${code}`, { params: { orderType, billAmount, customerId } }),
  getOne: (id: string) => api.get(`/coupons/${id}`),
  create: (couponData: any) => api.post('/coupons', couponData),
  update: (id: string, couponData: any) => api.put(`/coupons/${id}`, couponData),
  delete: (id: string) => api.delete(`/coupons/${id}`),
  apply: (id: string, orderId: string, customerId?: string) =>
    api.post(`/coupons/${id}/apply`, { orderId, customerId }),
};

// New Promos API – separate endpoints for promo codes
export const promosAPI = {
  getAll: (params?: { page: number; limit: number }) => api.get('/promos', { params }),
  getActive: (orderType?: string, billAmount?: number) =>
    api.get('/promos/active', { params: { orderType, billAmount } }),
  validate: (code: string, orderType: string, billAmount: number, customerId?: string) =>
    api.get(`/promos/validate/${code}`, { params: { orderType, billAmount, customerId } }),
  getOne: (id: string) => api.get(`/promos/${id}`),
  create: (promoData: any) => api.post('/promos', promoData),
  update: (id: string, promoData: any) => api.put(`/promos/${id}`, promoData),
  delete: (id: string) => api.delete(`/promos/${id}`),
  // apply endpoint can be added if needed
};

// -------------------- Bookings API --------------------
export const bookingsAPI = {
  create: (data: any) => api.post('/bookings', data),
  getAll: (params?: any) => api.get('/bookings', { params }),
  getByCustomer: () => api.get('/bookings'),
  checkAvailability: (params: any) => api.get('/bookings/availability', { params }),
  cancel: (id: string) => api.patch(`/bookings/${id}/cancel`),
  updateStatus: (id: string, status: string, note?: string) => api.patch(`/bookings/${id}/status`, { status, note }),
  getUnavailableSlots: (date: string, guests: number) => api.get('/bookings/unavailable-slots', { params: { date, guests } }),
  checkIn: (id: string) => api.post(`/bookings/${id}/check-in`),

  // Public (no auth) — for guest users
  publicGetUnavailableSlots: (tenantSlug: string, date: string, guests: number) =>
    api.get('/bookings/public/unavailable-slots', { params: { tenantSlug, date, guests } }),
  publicCheckAvailability: (tenantSlug: string, params: any) =>
    api.get('/bookings/public/availability', { params: { tenantSlug, ...params } }),
};

// -------------------- Payments API --------------------
export const paymentsAPI = {
  createIntent: (data: { amount: number; currency?: string }) =>
    api.post('/payments/create-intent', data),
  getConfig: () => api.post('/payments/config'),
  getWebhookUrl: () => api.get('/payments/webhook-url'),
  createTerminalIntent: (data: { amount: number; currency?: string }) =>
    api.post('/payments/terminal/create-intent', data),
  createTerminalConnectionToken: () => api.post('/payments/terminal/connection-token'),
  verifyIntent: (intentId: string) => api.get(`/payments/verify-intent/${intentId}`),
  checkTerminalReader: () => api.get('/payments/terminal/reader-check'),
};

// -------------------- Invoices API --------------------
export const invoicesAPI = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getAllAdmin: (params?: any) => api.get('/invoices', { params }), // Same endpoint, but superadmin role allows seeing all
  getById: (id: string) => api.get(`/invoices/${id}`),
  downloadPDF: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  resend: (id: string) => api.post(`/invoices/${id}/resend`),
};

// -------------------- Super / Support APIs --------------------
export const superAPI = {
  listTenants: (params?: any) => api.get('/superadmin/tenants', { params }),
  listAdmins: () => api.get('/superadmin/admins'),
  updateTenantSubscription: (tenantId: string, payload: any) =>
    api.patch(`/superadmin/tenants/${tenantId}/subscription`, payload),
  listSupportTickets: (params?: any) => api.get('/superadmin/support-tickets', { params }),
  replySupportTicket: (ticketId: string, payload: any) =>
    api.post(`/superadmin/support-tickets/${ticketId}/reply`, payload),

  // Plans management
  listPlans: () => api.get('/superadmin/plans'),
  createPlan: (data: any) => api.post('/superadmin/plans', data),
  updatePlan: (id: string, data: any) => api.patch(`/superadmin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/superadmin/plans/${id}`),

  // Demo requests management
  listDemoRequests: (params?: any) => api.get('/superadmin/demo-requests', { params }),
  updateDemoRequest: (id: string, data: any) => api.patch(`/superadmin/demo-requests/${id}`, data),
  deleteDemoRequest: (id: string) => api.delete(`/superadmin/demo-requests/${id}`),
};

export const superAdminAPI = superAPI; // alias for compatibility

export const supportAPI = {
  listMine: () => api.get('/support/mine'),
  listCustomerTickets: () => api.get('/support/tickets/customers'),
  create: (payload: any) => api.post('/support', payload),
  reply: (id: string, payload: any) => api.post(`/support/${id}/reply`, payload),
  resolve: (id: string, payload: any) => api.post(`/support/${id}/resolve`, payload),
};



// -------------------- Tenant API --------------------
export const tenantAPI = {
  getCurrent: () => api.get('/tenants/current'),
  update: (data: any) => api.patch('/tenants/current', data),
  getSettings: () => api.get('/tenants/settings'),
  updateSettings: (data: any) => api.patch('/tenants/settings', data),
  getStripeSettings: () => api.get('/tenants/stripe-settings'),
  updateStripeSettings: (data: any) => api.patch('/tenants/stripe-settings', data),
  // Restaurant open/close status
  updateRestaurantStatus: (data: { isOpen: boolean; reopenAt?: string; closeReason?: string; customerMessage?: string }) => api.patch('/tenants/restaurant-status', data),
  getRestaurantStatus: (slug: string) => api.get(`/tenants/${slug}/status`),
  // ── White-Label Branding ──────────────────────────────────────────────
  /** Public — no auth required. Called by BrandContext at app startup. */
  getBranding: (slug: string) => api.get(`/tenants/${slug}/branding`),
  /** Admin — saves brand colors from the Settings page. */
  updateBranding: (data: {
    primaryColor?:   string;
    secondaryColor?: string;
    accentColor?:    string;
    splashBg?:       string;
    fontFamily?:     string;
    appName?:        string;
  }) => api.patch('/tenants/branding', data),
};

// -------------------- Purchase Orders API --------------------
export const purchaseOrdersAPI = {
  create: (data: any) => api.post('/purchase-orders', data),
  getAll: (params?: any) => api.get('/purchase-orders', { params }),
  getOne: (id: string) => api.get(`/purchase-orders/${id}`),
  update: (id: string, data: any) => api.put(`/purchase-orders/${id}`, data),
  delete: (id: string) => api.delete(`/purchase-orders/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/purchase-orders/${id}/status`, { status }),
  receive: (id: string) => api.patch(`/purchase-orders/${id}/receive`),
  getAnalytics: (params?: any) => api.get('/purchase-orders/analytics', { params }),
  extractInvoice: (formData: FormData) => api.post('/purchase-orders/extract-invoice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// -------------------- Vendors API --------------------
export const vendorsAPI = {
  create: (data: any) => api.post('/vendors', data),
  getAll: (params?: any) => api.get('/vendors', { params }),
  getOne: (id: string) => api.get(`/vendors/${id}`),
  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
  toggleStatus: (id: string) => api.patch(`/vendors/${id}/toggle-status`),
  getReorderAlerts: (id: string) => api.get(`/vendors/${id}/reorder-alerts`),
};

// -------------------- Recipes API --------------------
export const recipesAPI = {
  create: (data: any) => api.post('/recipes', data),
  getAll: (params?: any) => api.get('/recipes', { params }),
  getOne: (id: string) => api.get(`/recipes/${id}`),
  getByMenuItem: (menuItemId: string) => api.get(`/recipes/menu-item/${menuItemId}`),
  update: (id: string, data: any) => api.put(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  recalculateCost: (id: string) => api.post(`/recipes/${id}/calculate-cost`),
};

// -------------------- Upload API --------------------
export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds
    });
  },
};

// -------------------- Gallery API --------------------
export const galleryAPI = {
  getAll: () => api.get('/gallery'),
  getPublic: (tenantSlug: string) => api.get('/gallery/public', { params: { tenantSlug } }),
  create: (data: any) => api.post('/gallery', data),
  update: (id: string, data: any) => api.patch(`/gallery/${id}`, data),
  delete: (id: string) => api.delete(`/gallery/${id}`),
};

// -------------------- Catering API --------------------
export const cateringAPI = {
  create: (data: any) => api.post('/catering', data),
  getAll: (params?: any) => api.get('/catering', { params }),
  getOne: (id: string) => api.get(`/catering/${id}`),
  getRequirements: (id: string) => api.get(`/catering/${id}/requirements`),
  update: (id: string, data: any) => api.put(`/catering/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/catering/${id}/status`, { status }),
  getCommissions: (params?: any) => commissionAPI.getAll(params),
  sendEmail: (id: string) => api.post(`/catering/${id}/email`),
  addMessage: (id: string, message: string) => api.post(`/catering/${id}/messages`, { message }),
  downloadPDF: (id: string) => api.get(`/catering/${id}/pdf`, { responseType: 'blob' }),
  track: (slug: string, token: string) => api.get(`/catering/public/track/${slug}/${token}`),
  addCustomerMessage: (slug: string, token: string, message: string) => api.post(`/catering/public/track/${slug}/${token}/messages`, { message }),
  addPublicPayment: (slug: string, token: string, data: any) => api.post(`/catering/public/track/${slug}/${token}/payments`, data),
  downloadPublicPDF: (slug: string, token: string) => api.get(`/catering/public/track/${slug}/${token}/pdf`, { responseType: 'blob' }),
};

// -------------------- Commission API --------------------
export const commissionAPI = {
  getAll: (params?: any) => api.get('/commission', { params }),
  getOne: (id: string) => api.get(`/commission/${id}`),
  update: (id: string, data: any) => api.put(`/commission/${id}`, data),
  approve: (id: string) => api.put(`/commission/${id}/approve`),
  markPaid: (id: string, data: any) => api.put(`/commission/${id}/mark-paid`, data),
  cancel: (id: string, reason: string) => api.put(`/commission/${id}/cancel`, { reason }),
  delete: (id: string) => api.delete(`/commission/${id}`),
};

export const feedbackAPI = {
  submitPublic: (tenantSlug: string, feedbackData: any) =>
    api.post('/public/feedback', feedbackData, { params: { tenantSlug } }),

  getOrderForFeedback: (tenantSlug: string, orderId: string) =>
    api.get(`/public/feedback/order/${orderId}`, { params: { tenantSlug } }),

  getAll: (params?: any) => api.get('/feedback', { params }),
  getItemWiseReport: () => api.get('/feedback/reports/item-wise'),
};

export const wasteAPI = {
  create: (data: any) => api.post('/waste', data),
  getAll: (params?: any) => api.get('/waste', { params }),
  getSummary: (startDate?: string, endDate?: string) =>
    api.get('/waste/summary', { params: { startDate, endDate } }),
};

// -------------------- Customers API --------------------
export const customersAPI = {
  getAll: (params?: { page: number; limit: number; search?: string }) => api.get('/customers', { params }),
  getRewardDetails: (id: string) => api.get(`/customers/${id}/rewards`),
  adjustRewards: (id: string, points: number, reason: string) => api.put(`/customers/${id}/rewards/adjust`, { points, reason }),
};

// -------------------- Audit Logs API --------------------
export const auditLogsAPI = {
  getAll: (params?: { module?: string; action?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/audit-logs', { params }),
};

// -------------------- Maps API --------------------
export const mapsAPI = {
  getNearby: (location: string, radius: number, type: string) =>
    api.get('/maps/nearby', { params: { location, radius, type } }),
};

// -------------------- Homepage API --------------------
export const homepageAPI = {
  getContent: () => api.get('/homepage'),
  updateContent: (htmlContent: string, sections?: any[]) => api.put('/homepage', { htmlContent, sections }),
  getPublicContent: (tenantSlug: string) => api.get('/homepage/public', { params: { tenantSlug } }),
};

// -------------------- SMS API --------------------
export const smsAPI = {
  getLogs: (params: { page: number; limit: number; type?: string; startDate?: string; endDate?: string }) =>
    api.get('/sms/logs', { params }),
  getSummary: () => api.get('/sms/summary'),
  sendTest: (to: string, message: string) => api.post('/sms/test', { to, message }),
};

export default api;
