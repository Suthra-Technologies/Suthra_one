# Role-Based Access Control (RBAC) System

This document details the specific permissions, capabilities, and restrictions for every role in the SaaS POV system.

## 1. Role Hierarchy & Definitions

The system uses a flat role structure where each user is assigned **one primary role**.

| Role | Operational Scope | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **Superadmin** | Global (SaaS) | System God Mode | Can manage Tenants (Restaurants), Plans, and Revenue. Cannot see inside Restaurant data by default unless impersonating. |
| **Admin** | Tenant (Restaurant) | Owner / Full Access | Complete control over *their specific* restaurant. Menus, Staff, inventory, Financials. |
| **Manager** | Tenant (Restaurant) | High Level | similar to Admin but restricted from "Subscription/Billing" and "Deleting Critical Data". |
| **Cashier** | Tenant (POS) | Front of House | limited to taking orders, accepting payments, and viewing basic daily sales. |
| **Waiter** | Tenant (POS) | Table Service | Can take orders and update status. **Restricted**: Can only see/edit their own active orders. |
| **Kitchen** | Tenant (BOH) | Order View Only | Can view "Active" orders (KOT). Can update item status (Preparing $\rightarrow$ Ready). |
| **Delivery** | Tenant (Logistics) | Disclaimer | Can view "Out for Delivery" orders and update delivery status. |
| **Customer** | Tenant (Public) | Personal Only | Can viewing Menu, placing "Online Orders", and viewing *their own* order history. |

---

## 2. Detailed Permission Matrix

### A. Operational Features (POS)

| Feature | Admin | Manager | Cashier | Waiter | Kitchen | Meaning |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Create Order** | ✅ | ✅ | ✅ | ✅ | ❌ | Placing new orders. |
| **View All Orders** | ✅ | ✅ | ✅ | ❌ | ✅ | Waiters only see *their* orders. Kitchen sees *all* active. |
| **Edit/Cancel Order**| ✅ | ✅ | ❌ | ❌ | ❌ | Only Admins/Managers can delete/void after submission. |
| **Settle Payment** | ✅ | ✅ | ✅ | ⚠️ | ❌ | Waiters might request bill, but Cashier settles it. |
| **KOT View** | ✅ | ✅ | ❌ | ❌ | ✅ | Kitchen Display System. |

### B. Management Features (Back Office)

| Feature | Admin | Manager | Cashier | Waiter | Kitchen |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage Menu** | ✅ | ✅ | ❌ | ❌ | ❌ | Changing prices, adding items. |
| **Inventory** | ✅ | ✅ | ❌ | ❌ | ⚠️ | Kitchen *consumes* inventory but doesn't *manage* suppliers. |
| **View Reports** | ✅ | ✅ | ⚠️ | ❌ | ❌ | Cashier sees "Shift Report", Admin sees "Profit/Loss". |
| **Manage Staff** | ✅ | ❌ | ❌ | ❌ | ❌ | Hiring/Firing users. |
| **Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | Tax rates, printer setup. |

---

## 3. Technical Implementation of Permissions

How the code enforces these rules (The "Connectivity"):

### 1. Guards
Endpoints are protected using NestJS Guards.
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager') // Only these roles can pass
@Delete('/inventory/:id')
deleteItem() { ... }
```

### 2. Context-Aware Filtering (The Logic)
For roles like **Waiter**, the controller programmatically filters results.
```typescript
// orders.controller.ts
if (user.role === 'waiter') {
   query.where({ createdBy: user.id }); // Only return MY orders
}
```

### 3. Tenant Isolation (Global)
**Every Role** (except Superadmin) is bound by the `TenantContext`.
```typescript
// inventory.service.ts
find(query) {
   // AUTO-INJECTED security
   query.tenantId = user.tenantId; 
   return db.find(query);
}
```
This ensures a **Manager** at "Pizza Hut" can never accidentally see "Domino's" inventory, even though they share the database.
