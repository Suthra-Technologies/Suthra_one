# End-to-End SaaS Architecture & Workflow

This document outlines the complete technical architecture and operational workflows of the Restaurant SaaS Application. It covers the connectivity, security (Role-Based Access Control), and business logic flows from the user interface down to the database.

---

## 1. System Topology (High-Level Architecture)

The system is built as a **Modular Monolith** using a layered architecture. It ensures scalability for multiple tenants (restaurants) while sharing a single codebase.

```mermaid
graph TD
    %% Clients
    User[End User / Guest]
    Staff[Restaurant Staff / Admin]
    Super[SaaS Superadmin]

    %% Frontend Layer
    subgraph "Frontend Layer (React + Vite)"
        Web[Web Browser]
        Mobile[Mobile App (Capacitor)]
        Store[Redux / Context API]
    end

    %% Communication Layer
    subgraph "Connectivity"
        REST[REST API (HTTPS)]
        WS[WebSockets (Socket.io)]
    end

    %% Backend Layer
    subgraph "Backend Layer (NestJS)"
        Gateway[API Gateway / Controllers]
        Auth[Auth Guard (JWT)]
        Modules[Feature Modules]
        
        subgraph "Core Modules"
            Tenants[Tenant Manager]
            Orders[Order Processing]
            Inventory[Inventory Engine]
        end
    end

    %% Data Layer
    subgraph "Infrastructure"
        DB[(MongoDB Cluster)]
        Cache[(Redis - Optional)]
        Ext[External APIs]
    end

    %% External Services
    Stripe[Stripe Payments]
    AWS[AWS S3 Storage]
    Email[AWS SES / SMTP]

    %% Connections
    User --> Web
    Staff --> Web
    Staff --> Mobile
    Web --> Store
    Store --> REST
    Store --> WS
    
    REST --> Gateway
    WS --> Gateway
    
    Gateway --> Auth
    Auth --> Modules
    
    Modules --> DB
    Modules --> Ext
    
    Ext --> Stripe
    Ext --> AWS
    Ext --> Email
```

---

## 2. Authentication & Security Workflow (RBAC)

This flow details how "Roles" and "Logins" work securely across the application. This resolves doubts about how a user is identified and restricted.

### The Security Pipeline
1.  **Identity**: "Who are you?" (Authentication)
2.  **Context**: "Which Restaurant (Tenant) do you belong to?" (Multi-tenancy)
3.  **Permission**: "Are you allowed to do this?" (Authorization)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant App as Frontend (React)
    participant API as Backend (NestJS)
    participant DB as MongoDB

    Note over User, App: 1. Login Phase
    User->>App: Enters Email & Password
    App->>API: POST /auth/login
    API->>DB: Find User (email) + Verify Password (bcrypt)
    
    alt Invalid Credentials
        API-->>App: 401 Unauthorized
        App-->>User: Show Error Message
    else Valid Credentials
        API->>API: Generate JWT Token
        Note right of API: Token contains: { userId, tenantId, role }
        API-->>App: Return Access Token
        App->>App: Store Token in LocalStorage
    end

    Note over User, App: 2. Protected Action (e.g., Delete Item)
    User->>App: Clicks "Delete User"
    App->>App: Retrieve Token from Storage
    App->>API: DELETE /users/123 (Header: Bearer eyJhbGci...)

    Note over API: 3. Guard Verification
    API->>API: Verify Token Signature (Is it fake?)
    API->>API: Extract 'tenantId' & 'role'
    
    Note over API: 4. Role Check (The "Doubts" Solver)
    alt Role == 'waiter'
        API-->>App: 403 Forbidden (Insufficient Privileges)
        App-->>User: "Access Denied"
    else Role == 'admin'
        API->>DB: Delete User WHERE ID=123 AND Tenant=tenantId
        DB-->>API: Success
        API-->>App: 200 OK
    end
```

---

## 3. Core Business Logic Workflows

### A. The "Order-to-Inventory" Lifecycle (End-to-End)
This demonstrates the connectivity between **Orders**, **Kitchen**, and **Inventory**.

```mermaid
flowchart TD
    %% Actors
    Waiter[Waiter / Customer]
    Kitchen[Kitchen Display]
    Stock[Inventory System]

    %% Steps
    Start(Order Placed) -->|1. Create Order| API[Backend API]
    
    subgraph "Backend Processing"
        API -->|2. Validate Menu ITems| MenuDB[(Menu DB)]
        API -->|3. Save Order| OrderDB[(Order DB)]
        
        %% Realtime Branch
        OrderDB -->|4. Emit Event| Socket[Socket Service]
        
        %% Inventory Branch
        OrderDB -->|5. Trigger Deduction| InvService[Inventory Service]
        InvService -->|6. Get Recipes| RecipeDB[(Recipe DB)]
        RecipeDB -->|7. Calculate Ingredients| Calc[Calculator]
        Calc -->|8. Update Stock| StockDB[(Raw Materials DB)]
    end

    %% outputs
    Socket -->|9. Push Notification| Kitchen
    StockDB -->|10. Low Stock Alert| Admin[Admin Dashboard]
```

### B. Multi-Tenant SaaS Isolation
How the system ensures Restaurant A cannot see Restaurant B's data.

*   **Middleware Strategy**:
    *   Every request must carry a **JWT**.
    *   The backend extracts `tenantId` from the JWT.
    *   **Automated Injection**: The Service layer automatically adds `.find({ tenant: request.user.tenantId })` to *every* database query.
    *   **Result**: complete data isolation without needing separate databases.

---

## 4. Technical Request Flow (The Code Path)

When a user interacts with the app, the code executes in this exact order:

1.  **React Component** (`pages/orders/OrderPage.tsx`)
    *   User clicks "Place Order".
    *   Calls `ordersAPI.create()`.
2.  **Axios Interceptor** (`services/api.ts`)
    *   Catches the request.
    *   Attaches `Authorization: Bearer <token>`.
3.  **NestJS Controller** (`modules/orders/orders.controller.ts`)
    *   Endpoint: `@Post('/')`.
    *   Decorator: `@UseGuards(JwtAuthGuard, RolesGuard)`.
    *   Decorator: `@Roles('admin', 'waiter')`.
4.  **NestJS Service** (`modules/orders/orders.service.ts`)
    *   Received validated data.
    *   Executes business logic (calculations, validation).
5.  **Mongoose Model** (`models/order.schema.ts`)
    *   Validates data types.
    *   Writes to MongoDB.
6.  **Response**:
    *   Data flows back up the chain to the React Component.
    *   UI updates (Toast message "Order Placed Successfully").

---

## 5. Deployment Architecture

To ensure high availability and responsiveness:

*   **Frontend**: Hosted on CDN (e.g., Vercel / Netlify / AWS CloudFront) for fast global access.
*   **Backend**: Hosted on Scalable Compute (AWS EC2 / ECS / DigitalOcean Droplets).
    *   Uses **PM2** to manage processes.
*   **Database**: MongoDB Atlas (Cloud Managed) with auto-scaling and backups.
*   **Storage**: AWS S3 for saving menu images and user avatars permanently.

