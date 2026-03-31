# End-to-End SaaS POV Architecture & 9-Role Feature Matrix

This document provides a complete technical and functional breakdown of the SaaS Restaurant POS system, specifically analyzing the **9 Key Roles** and their end-to-end data flows.

---

## 1. System Architecture Overview

The system operates as a **Multi-Tenant SaaS** platform. A single backend instance serves multiple restaurants ("Tenants"), but data is strictly isolated.

### **Technology Stack**
*   **Frontend**: React.js (Vite) + Material UI.
    *   *Deployment*: Web Browser (Admin/Manager), Tablet App (Waiter/Kitchen), Mobile Web (Customer/Delivery).
*   **Backend**: NestJS (Node.js).
    *   *Security*: Passport JWT + RBAC (Role-Based Access Control).
*   **Database**: MongoDB (NoSQL).
    *   *Isolation*: `tenantId` is stamped on every document.
*   **Real-time**: Socket.io (For Kitchen KOTs and Runner alerts).

---

## 2. The 9-Role Feature Analysis

Here is the deep-dive analysis of features, permissions, and workflows for every requested role.

### 👑 1. Super Admin (SaaS Owner)
**End-to-End Scope**: The "God Mode" of the SaaS platform. Does not manage food, but manages the *business of selling* the POS software.
*   **Interface**: Web Dashboard (Desktop).
*   **Key Features**:
    1.  **Tenant Management**: Create new restaurants, suspend non-paying tenants.
    2.  **Subscription Plans**: Create "Gold", "Silver", "Free" plans with feature gating.
    3.  **Global Revenue**: View total earnings from all restaurant subscriptions.
    4.  **Platform Settings**: Configure global email gateways (AWS SES) and SMS gateways.
    5.  **Support Tickets**: Resolve issues raised by Restaurant Admins.
*   **Data Access**: All Tenants (High Level), Subscription Tables, Global Logs.

### 🏢 2. Admin (Restaurant Owner)
**End-to-End Scope**: The "CEO" of a single restaurant. Has full control over their specific data silo.
*   **Interface**: Web Dashboard (Desktop/Tablet).
*   **Key Features**:
    1.  **Menu Engineering**: Create categories, items, variants, and pricing.
    2.  **Staff Management**: Hire Managers, Waiters, Chefs; assign credentials.
    3.  **Financial Reports**: View Daily Sales, Profit & Loss, Tax Reports.
    4.  **Inventory Control**: Define recipes, suppliers, and stock alerts.
    5.  **Device Setup**: Configure Printers, Kitchen Displays, and Table QRs.
*   **Data Access**: Full Read/Write access to *their* Tenant's data only.

### 👔 3. Manager
**End-to-End Scope**: The "COO" of the restaurant. Handles day-to-day operations but is restricted from sensitive business settings.
*   **Interface**: Web Dashboard (Tablet/Desktop).
*   **Key Features**:
    1.  **Shift Management**: Open/Close cash registers (Till Management).
    2.  **Void/Refund**: Authority to delete items or cancel orders (Waiters cannot do this).
    3.  **Customer Feedback**: View and respond to diner ratings.
    4.  **Stock Requests**: Raise Purchase Orders for low inventory.
    5.  **Table Management**: oversee the floor plan and reservations.
*   **Restrictions**: Cannot view Subscription Billing or delete history data.

### 🤵 4. Waiter (Service Staff)
**End-to-End Scope**: Direct customer interaction. Speed and mobility are key.
*   **Interface**: Mobile App / Tablet.
*   **Key Features**:
    1.  **Table Ordering**: Punch orders directly at the table (Real-time sync to Kitchen).
    2.  **Menu Knowledge**: View item descriptions, allergens, and "Out of Stock" indicators.
    3.  **Guest Requests**: Add special notes ("No onion", "Extra spicy").
    4.  **Bill Request**: Trigger print command for the bill.
    5.  **Order Status**: See live status (Cooking -> Ready) to inform guests.
*   **Data Access**: Read/Write for *Active Orders* only.

### 💰 5. Cashier
**End-to-End Scope**: The Application's "Checkout" point. Focus on accuracy and speed.
*   **Interface**: Desktop POS Terminal (Touchscreen).
*   **Key Features**:
    1.  **Fast Billing**: Convert "Table Order" to "Invoice".
    2.  **Payment Processing**: Accept Cash, Card (Stripe Integration), UPI/QR.
    3.  **Split Bill**: Divide one bill across multiple guests.
    4.  **Takeaway Orders**: Create quick counter orders for walk-ins.
    5.  **Discounts/Coupons**: Apply validated promo codes.
*   **Data Access**: Orders (Read), Invoices (Write), Payments (Write).

### 👨‍🍳 6. KOT (Kitchen Staff)
**End-to-End Scope**: The production engine. 100% Real-time view.
*   **Interface**: Kitchen Display System (Large Screen / Tablet).
*   **Key Features**:
    1.  **Live KOT Stream**: Orders pop up instantly when Waiter punches them.
    2.  **Color Coding**: New (Green) -> Late (Red) -> Priority indicators.
    3.  **Item Control**: Mark specific items as "Cooking" or "Ready".
    4.  **Recipe View**: (Optional) Click item to see ingredients/plating guide.
    5.  **Stock Out**: Quickly mark an ingredient as "Finished" to stop Waiters from ordering it.
*   **Data Access**: Orders (Read/Partial Update), Inventory (Read).

### 🏃 7. Food Runner
**End-to-End Scope**: The logistics bridge between Kitchen and Table.
*   **Interface**: Mobile App / Simple Pager.
*   **Key Features**:
    1.  **"Ready" Alerts**: notification when Kitchen marks food as Ready.
    2.  **Delivery to Table**: View Table Number and Seat Number for accurate serving.
    3.  **Mark Served**: Updates status from "Ready" to "Served" (Stops the service timer).
    4.  **Table Clearing**: Notify when tables are dirty/cleared.
*   **Data Access**: Active Orders (Read/Update Status).

### 🛵 8. Delivery Driver
**End-to-End Scope**: External logistics for home delivery orders.
*   **Interface**: Mobile App.
*   **Key Features**:
    1.  **Delivery Dashboard**: View assigned orders awaiting pickup.
    2.  **Navigation**: Integration with Google Maps for customer address.
    3.  **Status Updates**: "Picked Up" -> "Arrived" -> "Delivered".
    4.  **Digital POD**: Capture customer signature/photo or collecting cash on delivery.
*   **Data Access**: Delivery Orders (Read/Update).

### 🤳 9. Customer
**End-to-End Scope**: Self-service user experience.
*   **Interface**: Mobile Browser (QR Scan) or Consumer App.
*   **Key Features**:
    1.  **Digital Menu**: Browse photos, prices, and descriptions.
    2.  **Self-Ordering**: Place orders directly (Contactless Dining).
    3.  **Payment**: Pay online via Stripe/Apple Pay.
    4.  **Order Tracking**: Live view of their pizza/food progress.
    5.  **Loyalty**: Earn points for every order.
*   **Data Access**: Public Menu (Read), Own Order (Read/Write).

---

## 3. End-to-End Data Workflow Example

**Scenario**: A "Dine-In" lifecycle involving 5 roles.

1.  **Customer** sits and scans QR Code $\rightarrow$ Views Menu.
2.  **Waiter** approaches, takes order on Tablet $\rightarrow$ `POST /orders` (Backend Validates & Saves).
3.  **Backend** emits `socket.emit('new_kot')`.
4.  **Kitchen** Screen beeps $\rightarrow$ Chef sees "Table 5: 2 Burgers".
5.  **Chef** clicks "Ready" $\rightarrow$ Backend updates status.
6.  **Food Runner** gets notification "Table 5 Ready" $\rightarrow$ Picks up food, serves, clicks "Served".
7.  **Customer** asks for check.
8.  **Cashier** sees "Table 5" on PC $\rightarrow$ Generates Bill $\rightarrow$ Collects Cash $\rightarrow$ Closes Order.
9.  **Admin** (at home) checks phone $\rightarrow$ "Sales Report" increases by $40.

---

## 4. Security Architecture (Role-Based)

How the backend distinguishes these 9 roles (Code Implementation):

1.  **Token Payload**: When a user logs in, their JWT contains:
    ```json
    { "role": "food_runner", "tenantId": "rest_123" }
    ```
2.  **Guard Decorators**:
    *   `@Roles('admin', 'manager')`: Only these can change the Menu.
    *   `@Roles('kitchen', 'admin', 'manager')`: These can view KOTs.
    *   `@Roles('waiter', 'runner', 'admin')`: These can update table status.
3.  **Data Filtering**:
    *   If Role == `waiter`: API returns `orders.filter(owner == me)`.
    *   If Role == `delivery`: API returns `orders.filter(type == 'delivery' && status == 'ready')`.

This architecture ensures complete "End-to-End" coverage while maintaining security and efficiency for all 9 stakeholder types.
