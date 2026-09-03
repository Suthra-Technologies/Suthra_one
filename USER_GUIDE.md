# Restaurant POS System - Comprehensive User Guide

Welcome to the **Restaurant POS System**, a complete solution designed to streamline your restaurant operations from front-of-house service to back-office management.

This guide covers every feature in detail to help you maximize the potential of your system.

![Dashboard Overview](/guide_images/dashboard.png)

---

## 📚 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Point of Sale (POS)](#point-of-sale-pos)
4. [Kitchen Display System (KDS)](#kitchen-display-system-kds)
5. [Table Management](#table-management)
6. [Inventory & Stock Control](#inventory--stock-control)
7. [Menu Management](#menu-management)
8. [Staff & User Management](#staff--user-management)
9. [Reports & Analytics](#reports--analytics)
10. [Catering & Events](#catering--events)
11. [Marketing & Coupons](#marketing--coupons)
12. [Support & Settings](#support--settings)

---

## <a id="getting-started"></a>1. Getting Started

### Logging In
1.  Navigate to the application URL in your web browser (Chrome or Edge recommended).
2.  Enter your registered **Email Address** and **Password**.
3.  Click **Login**.
    *   *Forgot Password?* Click the link to reset via email.

### Navigation Sidebar
The application uses a dynamic sidebar on the left.
*   **Role-Based Access:** You will only see modules relevant to your role (e.g., Kitchen Staff see KDS, Managers see everything).
*   **Collapse/Expand:** Use the toggle button to maximize screen space.
*   **Tenant Switching:** If you manage multiple locations, use the dropdown in the sidebar header to switch between them.

---

## <a id="dashboard-overview"></a>2. Dashboard Overview

The **Dashboard** is your command center, providing real-time insights into your day's performance.

*   **Key Metrics:**
    *   **Total Sales:** Real-time revenue for the current day.
    *   **Active Orders:** Number of orders currently being prepared or served.
    *   **Table Occupancy:** Percentage of tables currently seated.
*   **Visualizations:**
    *   **Sales Trend:** A line graph showing hourly or weekly sales performance.
    *   **Top Items:** A list of your best-selling dishes today.
    *   **Alerts:** Low stock warnings or urgent notifications.

---

## <a id="point-of-sale-pos"></a>3. Point of Sale (POS)

The **POS** module is optimized for speed and efficiency during service.

![POS Interface](/guide_images/pos.png)

### Creating an Order
1.  **Select Order Type:**
    *   **Dine-In:** Requires selecting a table.
    *   **Takeaway:** Requires customer name/phone.
    *   **Delivery:** Requires full address details.
2.  **Add Items:**
    *   Browse categories (e.g., Starters, Mains, Beverages) on the left sidebar.
    *   Tap an item card to add it to the cart.
    *   **Search:** Use the search bar to quickly find items by name or code.

### Customizing Items
Click on any item in the cart to open the **Modifier** menu:
*   **Notes:** Add special instructions (e.g., "No onions", "Allergy alert").
*   **Variants:** Select size (Small/Large) or options (Spicy/Mild).
*   **Quantity:** Adjust the number of items.

### Checkout & Payment
1.  Review the **Cart Summary** on the right.
2.  **Discounts:** Apply a coupon code or manual discount (if authorized).
3.  Click **Place Order** to send the ticket to the kitchen (KOT).
4.  Click **Pay Now** or **Settle Bill**:
    *   **Split Bill:** Divide the total by number of guests or by items.
    *   **Payment Methods:** Select Cash, Credit Card, UPI/QR, or On-Account.
    *   **Receipt:** Choose to Print, Email, or SMS the receipt.

---

## <a id="kitchen-display-system-kds"></a>4. Kitchen Display System (KDS)

Replace paper tickets with a digital workflow that tracks preparation times.

![Kitchen Display System](/guide_images/kitchen.png)

### Workflow
1.  **New Orders (Green):** Appear instantly when placed from POS. A loud notification sound alerts the staff.
2.  **In Prep (Yellow):** Tap **Accept** or **Start** to indicate cooking has begun. The timer starts tracking.
3.  **Ready (Blue/Green):** Mark items as complete. This notifies the Waiters (or serving staff).
4.  **Completed:** Once served, the order moves to history.

### Features
*   **Item Routing:** Drinks go to the Bar Screen, Food goes to the Kitchen Screen.
*   **Timers:** Orders exceeding standard prep time turn **Red** to alert the manager.
*   **Recall:** Accidentally bumped an order? Use the "Recall" feature to bring it back.

---

## <a id="table-management"></a>5. Table Management

Visualize your restaurant floor and manage seating efficiently.

![Table Management](/guide_images/tables.png)

### Color Codes
*   🟢 **Green / Available:** Table is empty and clean.
*   🔴 **Red / Occupied:** Guests are seated and dining.
*   🟠 **Orange / Reserved:** Booked for an upcoming reservation.
*   🟡 **Yellow / Payment:** Bill requested, awaiting payment.

### Actions
*   **Click a Table:**
    *   **Assign Order:** Start a new dine-in order.
    *   **View Details:** See current order items, running total, and time seated.
    *   **Merge/Move/Split:** Transfer orders between tables or join tables for large parties.
    *   **Clear Table:** Mark as clean after guests leave to make it available again.

---

## <a id="inventory--stock-control"></a>6. Inventory & Stock Control

Keep track of every ingredient to minimize waste and theft.

![Inventory Management](/guide_images/inventory.png)

### Features
*   **Raw Materials:** Define base ingredients (e.g., Flour, Tomatoes, Oil) with units of measure (kg, ltr, pcs).
*   **Recipes:** Link menu items to raw materials.
    *   *Example:* 1 "Burger" automatically deducts 1 Bun, 1 Patty, and 20g Sauce.
*   **Purchase Orders (PO):**
    *   Generate POs for vendors when stock is low.
    *   **Receive Stock:** Update inventory levels when deliveries arrive.
*   **Stock Audits:** Perform physical counts and reconcile with system levels ("Variance Report").
*   **Low Stock Alerts:** Set minimum thresholds to receive warnings on the dashboard.

---

## <a id="menu-management"></a>7. Menu Management

*   **Categories:** Create groups like "Breakfast", "Lunch", "Happy Hour".
*   **Items:** detailed setup including:
    *   **Price:** Base price and tax configurations.
    *   **Images:** Upload high-quality photos for the POS and Digital Menu.
    *   **Availability:** Toggle items "Out of Stock" instantly across all devices.
*   **Modifiers:** Create groups like "Steak Temperature" (Rare, Medium, Well) or "Add-ons" (Extra Cheese +$1).

---

## <a id="staff--user-management"></a>8. Staff & User Management

Control who can access what.

*   **Roles:** Pre-configured roles include Admin, Manager, Cashier, Waiter, Kitchen Staff, Delivery Driver.
*   **Permissions:** Granular control (e.g., allow "Void Order" only for Managers).
*   **Attendance:** (Optional) Clock-in/Clock-out tracking.
*   **Performance:** Track sales by waiter to identify top performers.

---

## <a id="reports--analytics"></a>9. Reports & Analytics

Make data-driven decisions with comprehensive reporting.

![Analytics & Reports](/guide_images/reports.png)

### Key Reports
*   **Sales Report:** Detailed breakdown by payment type, order type, and time period.
*   **Product Mix:** View profitability and popularity of each menu item.
*   **Labor Cost:** Compare staff costs vs. revenue.
*   **Inventory Usage:** Theoretical vs. Actual usage to spot pilferage.
*   **Void/Cancel Report:** Audit all cancelled orders for security.
*   **Export:** Download any report as PDF, Excel, or CSV.

---

## <a id="catering--events"></a>10. Catering & Events

Manage large-scale orders and events.
*   **Booking Calendar:** Visual calendar for event slots.
*   **Custom Menus:** Create special packages not on the regular menu.
*   **Resource Planning:** Automatically calculate total ingredients needed for 500 guests.
*   **Invoicing:** Generate professional event contracts and invoices.

---

## <a id="marketing--coupons"></a>11. Marketing & Coupons

*   **Discount Codes:** Create codes like `SAVE10` for 10% off.
*   **Buy One Get One (BOGO):** Configure complex rules.
*   **Loyalty:** (If enabled) Track customer points and redemptions.
*   **Campaigns:** Send SMS or Email blasts to your customer database.

---

## <a id="support--settings"></a>12. Support & Settings

### System Settings
*   **Restaurant Profile:** Logo, Address, Tax ID.
*   **Taxes:** Configure VAT/GST/Sales Tax rules.
*   **Printers:** Map KOT printers to specific categories (e.g., Drinks -> Bar Printer).

### Need Help?
If you encounter issues, use the built-in **Support Ticket** system:
1.  Go to **Support**.
2.  Click **Create Ticket**.
3.  Describe your issue and attach screenshots.
4.  Our support team will respond directly within the app.
