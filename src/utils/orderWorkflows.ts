// Order workflow utilities and helper functions

export interface OrderWorkflow {
    type: string;
    statuses: string[];
    label: string;
}

export const ORDER_WORKFLOWS: Record<string, OrderWorkflow> = {
    dine_in: {
        type: 'dine_in',
        label: 'Dine In',
        statuses: ['pending', 'confirmed', 'preparing', 'ready', 'approved', 'served', 'completed', 'cancelled']
    },
    takeaway: {
        type: 'takeaway',
        label: 'Takeaway',
        statuses: ['pending', 'confirmed', 'preparing', 'ready_to_takeaway', 'completed', 'cancelled']
    },
    online_takeaway: {
        type: 'online_takeaway',
        label: 'Online Takeaway',
        statuses: ['pending', 'confirmed', 'preparing', 'ready_to_pickup', 'completed', 'cancelled']
    },
    global_dine_in: {
        type: 'global_dine_in',
        label: 'Online Dine In',
        statuses: ['pending', 'confirmed', 'preparing', 'ready', 'approved', 'served', 'completed', 'cancelled']
    },
    global_takeaway: {
        type: 'global_takeaway',
        label: 'Online Takeaway',
        statuses: ['pending', 'confirmed', 'preparing', 'ready_to_takeaway', 'completed', 'cancelled']
    },
    delivery: {
        type: 'delivery',
        label: 'Online Delivery',
        statuses: ['pending', 'confirmed', 'preparing', 'ready_to_pickup', 'on_the_way', 'delivered', 'completed', 'cancelled']
    }
};

export const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    approved: 'Approved',
    served: 'Served',
    completed: 'Completed',
    ready_to_takeaway: 'Ready to Takeaway',
    ready_to_pickup: 'Ready for Takeaway',
    on_the_way: 'On the Way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    // Legacy/invalid statuses
    'in-progress': 'In Progress',
    ready_to_pick: 'Ready for Takeaway'
};

export const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'primary',
    ready: 'success',
    approved: 'info',
    served: 'success',
    completed: 'success',
    ready_to_takeaway: 'success',
    ready_to_pick: 'success',
    on_the_way: 'primary',
    delivered: 'success',
    cancelled: 'error',
    // Legacy/invalid statuses
    'in-progress': 'primary',
    ready_to_pickup: 'success'
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
    dine_in: 'Dine In',
    takeaway: 'Takeaway',
    online_takeaway: 'Online Takeaway',
    delivery: 'Delivery',
    global_dine_in: 'Global Dine In',
    global_takeaway: 'Global Takeaway'
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'CASH',
    card: 'CARD',
    upi: 'UPI',
    wallet: 'WALLET',
    online: 'ONLINE',
    zelle: 'ZELLE',
    venmo: 'VENMO',
    cod: 'COD'
};

/**
 * Get available next statuses based on current status and order type
 */
export function getAvailableStatuses(currentStatus: string, orderType: string): string[] {
    const workflow = ORDER_WORKFLOWS[orderType];
    if (!workflow) return [];

    const currentIndex = workflow.statuses.indexOf(currentStatus);
    if (currentIndex === -1) return [];

    // Can always cancel (if not already cancelled or completed)
    const nextStatuses = workflow.statuses.slice(currentIndex + 1);

    // Filter out terminal states if already in one
    if (currentStatus === 'completed' || currentStatus === 'delivered' || currentStatus === 'cancelled') {
        return [];
    }

    // Always allow cancellation
    if (!nextStatuses.includes('cancelled')) {
        nextStatuses.push('cancelled');
    }

    return nextStatuses;
}

/**
 * Get all possible statuses for a given order type
 */
export function getAllStatusesForType(orderType: string): string[] {
    const workflow = ORDER_WORKFLOWS[orderType];
    if (!workflow) return [];
    return workflow.statuses;
}

/**
 * Get status color for badge
 */
export function getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    return STATUS_COLORS[status] || 'default';
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
}

/**
 * Get order type label for display
 */
export function getOrderTypeLabel(orderType: string, order?: any): string {
    if (order?.source === 'website' || order?.source === 'online' || order?.customerUser) {
        if (orderType === 'dine_in' || orderType === 'global_dine_in') return 'Online Dine In';
        if (orderType === 'takeaway' || orderType === 'online_takeaway' || orderType === 'global_takeaway') return 'Online Takeaway';
    }
    return ORDER_TYPE_LABELS[orderType] || orderType;
}

/**
 * Get payment method label for display. Supports multiple methods comma separated.
 */
export function getPaymentMethodLabel(paymentMethod: string | string[]): string {
    if (Array.isArray(paymentMethod)) {
        if (paymentMethod.length === 0) return 'UNKNOWN';
        // Unique map to ensure we don't say "CASH, CASH". Unlikely given design, but safe.
        const uniqueMethods = Array.from(new Set(paymentMethod));
        return uniqueMethods.map(pm => PAYMENT_METHOD_LABELS[pm] || pm.toUpperCase()).join(' & ');
    }
    return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod?.toUpperCase() || 'UNKNOWN';
}

/**
 * Check if an order is a Global Dine In order (placed via website, already paid)
 */
export function isGlobalDineIn(order: any): boolean {
    return order?.orderType === 'global_dine_in' || (order?.orderType === 'dine_in' && order?.source === 'website');
}

/**
 * Check if items can be added to an order
 * Note: Global Dine In orders have already paid, so no items can be added
 */
export function canAddItems(status: string, orderType: string, order?: any): boolean {
    // Global Dine In orders have already paid - don't allow adding items
    if (order && isGlobalDineIn(order)) {
        return false;
    }
    // Allow adding items for dine-in orders in active statuses
    if (orderType === 'dine_in') {
        return ['pending', 'confirmed', 'preparing', 'ready', 'approved', 'served'].includes(status);
    }
    return false;
}

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string, orderType: string): boolean {
    const availableStatuses = getAvailableStatuses(currentStatus, orderType);
    return availableStatuses.includes(newStatus);
}

/**
 * Check if order is active (not completed or cancelled)
 */
export function isOrderActive(status: string): boolean {
    return !['completed', 'delivered', 'cancelled'].includes(status);
}

/**
 * Check if order is completed
 */
export function isOrderCompleted(status: string): boolean {
    return ['completed', 'delivered'].includes(status);
}

/**
 * Check if order is cancelled
 */
export function isOrderCancelled(status: string): boolean {
    return status === 'cancelled';
}

/**
 * Format currency for display
 */
/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Calculate time elapsed since order creation
 */
export function getTimeElapsed(createdAt: string | Date): string {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}
