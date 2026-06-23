import React from 'react';
import { Route, Routes, Outlet, Navigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import Layout from '../components/Layout';
import { RequireFeature } from '../components/RequireFeature';
import { RequireRole } from '../components/RequireRole';
import { Box, Typography } from '@mui/material';
import CouponsAdminPage from '../pages/admin/CouponsAdminPage';
import PromoCodePage from '../pages/admin/PromoCodePage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import BookingsAdminPage from '../pages/admin/BookingsAdminPage';
import CateringCommissionsPage from '../pages/admin/catering/CateringCommissionsPage';
import CateringManagementPage from '../pages/admin/catering/CateringManagementPage';
import CustomiseScreensPage from '../pages/admin/customise-screens/CustomiseScreensPage';
import ServiceUsagePage from '../pages/admin/ServiceUsagePage';
import CustomerActivitiesPage from '../pages/admin/CustomerActivitiesPage';
import AttendancePage from '../pages/AttendancePage';
import CateringPage from '../pages/catering/CateringPage';
import CateringTrackPage from '../pages/customer/CateringTrackPage';
import CustomersPage from '../pages/customers/CustomersPage';
import KitchenInterface from '../pages/kitchen/KitchenInterface';
import KitchenOrdersPage from '../pages/kitchen/KitchenOrdersPage';
import MenuPage from '../pages/menu/MenuPage';
import AddOnGroupsPage from '../pages/menu/AddOnGroupsPage';
import TraysPage from '../pages/menu/TraysPage';
import OrdersPage from '../pages/orders/OrdersPage';
import POSPage from '../pages/pos/POSPage';
import ProfilePage from '../pages/profile/ProfilePage';
import DashboardPage from '../pages/DashboardPage';
import GuestPOSPage from '../pages/guest/GuestPOSPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import WasteManagementPage from '../pages/inventory/WasteManagementPage';
import InvoiceDetailPage from '../pages/invoices/InvoiceDetailPage';
import InvoicesPage from '../pages/invoices/InvoicesPage';
import RecipesPage from '../pages/recipes/RecipesPage';
import CreateRecipePage from '../pages/recipes/CreateRecipePage';
import ReportsPage from '../pages/reports/ReportsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import SubscriptionPage from '../pages/subscription/SubscriptionPage';
import SubscriptionSuccess from '../pages/subscription/SubscriptionSuccess';
import SubscriptionCancel from '../pages/subscription/SubscriptionCancel';
import AdminSupportPage from '../pages/support/AdminSupportPage';
import CustomerSupportPage from '../pages/support/CustomerSupportPage';
import TablesPage from '../pages/tables/TablesPage';
import UsersPage from '../pages/users/UsersPage';
import CustomerRegisterPage from '../pages/auth/CustomerRegisterPage';
import FeedbackPage from '../pages/public/FeedbackPage';
import CheckoutPage from '../pages/CheckoutPage';
import TableBookingPage from '../pages/customer/TableBookingPage';
import MyBookingsPage from '../pages/customer/MyBookingsPage';
import CustomerOrderPage from '../pages/customer/CustomerOrderPage';
import GalleryPage from '../pages/customer/GalleryPage';
import CustomerAboutPage from '../pages/customer/CustomerAboutPage';
import CustomerHomePage from '../pages/customer/CustomerHomePage';
import PurchaseOrdersPage from '../pages/purchase-orders/PurchaseOrdersPage';
import CreatePOPage from '../pages/purchase-orders/CreatePOPage';
import PurchaseOrderDetailPage from '../pages/purchase-orders/PurchaseOrderDetailPage';
import VendorsPage from '../pages/vendors/VendorsPage';
import MaterialProvidersPage from '../pages/material-providers/MaterialProvidersPage';
import AssetDashboard from '../pages/assets/AssetDashboard';
import AssetList from '../pages/assets/AssetList';
import AssetView from '../pages/assets/AssetView';
import AssetForm from '../pages/assets/AssetForm';
import ExpensesPage from '../pages/expenses/ExpensesPage';
import CreateExpensePage from '../pages/expenses/CreateExpensePage';
import ExpenseDetailPage from '../pages/expenses/ExpenseDetailPage';
import DisputeList from '../pages/disputes/DisputeList';
import DisputeDetails from '../pages/disputes/DisputeDetails';

export const TenantRoutes = () => (
  <>
    <Route index element={<GuestPOSPage />} />
    <Route path="register" element={<CustomerRegisterPage />} />
    <Route path="feedback/:orderId" element={<FeedbackPage />} />

    {/* ─── Customer Routes (No Sidebar, Single Page Layout) ─── */}
    <Route element={<CustomerLayout />}>
      <Route path="customer" element={<Navigate replace to="home" />} />
      <Route path="customer/home" element={<CustomerHomePage />} />
      <Route path="customer/order" element={<CustomerOrderPage />} />
      <Route path="customer/checkout" element={<CheckoutPage />} />
      <Route path="customer/book-table" element={<TableBookingPage />} />
      <Route path="customer/bookings" element={<MyBookingsPage />} />
      <Route path="customer/profile" element={<ProfilePage />} />
      <Route path="customer/gallery" element={<GalleryPage />} />
      <Route path="customer/about" element={<CustomerAboutPage />} />
      {/* Guest-accessible customer catering routes */}
      <Route element={<RequireFeature feature="catering" guestAllowed />}>
        <Route path="customer/catering" element={<CateringPage />} />
        <Route path="customer/catering/track/:id" element={<CateringTrackPage />} />
      </Route>
    </Route>

    {/* ─── Admin/Staff Routes (With Sidebar Layout) ─── */}
    <Route element={<Layout />}>
      {/* Base staff area — must exclude customers, who otherwise reach the POS
          dashboard since these routes carried no role guard. */}
      <Route element={<RequireRole allowedRoles={['admin', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'kitchen', 'delivery']} />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="purchase-orders/create" element={<CreatePOPage />} />
        <Route path="purchase-orders/edit/:id" element={<CreatePOPage />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
      </Route>

      <Route element={<RequireRole allowedRoles={['admin', 'manager']} />}>
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/:id" element={<ExpenseDetailPage />} />
        <Route path="expenses/create" element={<CreateExpensePage />} />
        <Route path="expenses/edit/:id" element={<CreateExpensePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="global-add-ons" element={<AddOnGroupsPage />} />
        <Route element={<RequireFeature feature="inventory" />}>
          <Route path="inventory" element={<InventoryPage />} />
        </Route>
        <Route element={<RequireFeature feature="wastemanagement" />}>
          <Route path="inventory/waste" element={<WasteManagementPage />} />
        </Route>
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="material-providers" element={<MaterialProvidersPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/create" element={<CreateRecipePage />} />
        <Route path="recipes/:id/edit" element={<CreateRecipePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="customer-support" element={<CustomerSupportPage />} />
        <Route path="promocode" element={<PromoCodePage />} />
        <Route path="coupons" element={< CouponsAdminPage />} />
        <Route element={<RequireFeature feature="attendance" />}>
          <Route path="attendance" element={<AttendancePage />} />
        </Route>
        <Route path="customise-screens" element={<CustomiseScreensPage />} />
        <Route path="service-usage" element={<ServiceUsagePage />} />
        <Route path="customer-activities" element={<CustomerActivitiesPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="assets" element={<AssetList />} />
        <Route path="assets/:id" element={<AssetView />} />
        <Route path="assets/new" element={<AssetForm />} />
        <Route path="assets/:id/edit" element={<AssetForm />} />
        <Route path="disputes" element={<DisputeList />} />
        <Route path="disputes/:id" element={<DisputeDetails />} />
      </Route>

      <Route element={<RequireRole allowedRoles={['admin', 'superadmin']} />}>
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
      </Route>

      <Route element={<RequireRole allowedRoles={['admin']} />}>
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="subscription/success" element={<SubscriptionSuccess />} />
        <Route path="subscription/cancel" element={<SubscriptionCancel />} />
      </Route>

        <Route element={<RequireRole allowedRoles={['admin', 'manager', 'cashier']} />}>
          <Route path="tables" element={<TablesPage />} />
        </Route>

        <Route element={<RequireRole allowedRoles={['admin', 'manager', 'waiter']} />}>
          <Route path="bookings" element={<BookingsAdminPage />} />
        </Route>

      <Route path="profile" element={<ProfilePage />} />

      {/* Kitchen Routes */}
      <Route element={<RequireRole allowedRoles={['admin', 'manager', 'kitchen_staff']} />}>
        <Route path="kitchen" element={<KitchenInterface />} />
        <Route path="kot" element={<KitchenOrdersPage />} />
      </Route>

      {/* Protected admin catering routes */}
      <Route element={<RequireFeature feature="catering" />}>
        <Route path="catering-admin" element={<CateringManagementPage />} />
        <Route path="catering-commissions" element={<CateringCommissionsPage />} />
      </Route>
    </Route>
  </>
);
