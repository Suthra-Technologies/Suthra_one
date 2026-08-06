export interface Category {
    _id: string;
    name: string;
    description?: string;
    icon?: string;
    image?: string;
    color?: string;
    order?: number;
    parentCategory?: string | Category | null;
    taxCode?: string;
    itemCount?: number;
    actionHistory?: any[];
}

export interface Subcategory extends Category {
    parentCategory: string | Category;
}

export interface Variant {
    name: string;
    price: number;
    description?: string;
}

export interface ModifierOption {
    name: string;
    price: number;
    qty?: number;                    // Serving quantity given to the customer for this option
    isDefault?: boolean;
    linkedInventoryItem?: string;   // ObjectId of an InventoryItem (deducts directly)
    consumptionQty?: number;        // Qty to deduct per selection (default: 1)
    consumptionUnit?: string;       // Unit override
}

export interface ModifierGroup {
    name: string;
    selectionType: 'single' | 'multiple';
    required: boolean;
    minSelection?: number;
    maxSelection?: number;
    options: ModifierOption[];
}

export interface ModifierGroupTemplate extends ModifierGroup {
    _id: string;
    isActive: boolean;
    menuItems?: string[];
}

export interface SpiceLevel {
    value: string;
    label: string;
    description?: string;
}

/** A reusable, named scale of spice levels shared across many menu items. */
export interface SpiceLevelSet {
    _id: string;
    name: string;
    description?: string;
    levels: SpiceLevel[];
    isDefault?: boolean;
    isActive?: boolean;
    isDeleted?: boolean;
    /** How many menu items currently use this set (returned by the list endpoint). */
    menuItemCount?: number;
}

export interface TrayOption {
    tray: string;
    price: number;
    servingSize?: number;
    isActive?: boolean;
}

export interface IMenuItem {
    _id: string;
    name: string;
    description?: string;
    price: number;
    category: string | Category;
    subcategory?: string | Subcategory | null;
    categories?: (string | Category)[];
    image?: string;
    isAvailable: boolean;
    variants?: Variant[];
    modifierGroups?: ModifierGroup[];
    linkedGroups?: (string | ModifierGroupTemplate)[];
    addOns?: string[];
    actionHistory?: any[];
    taxRate?: number | null;
    isCateringAvailable: boolean;
    isAutoDebit?: boolean;
    foodType?: 'veg' | 'non-veg';
    trayOptions?: TrayOption[];
    quantityType?: 'number' | 'tray';
    baseTray?: string;
    servingSize?: number;
    // Levels come from the linked SpiceLevelSet; spiceLevels/spiceLevelData are
    // resolved server-side from that set and are read-only on the client.
    spiceLevel?: string;
    isSpiceLevelAvailable?: boolean;
    spiceLevelSet?: string | SpiceLevelSet | null;
    spiceLevels?: string[];
    spiceLevelData?: Record<string, string>;
    availableDays?: string[];
    isWeeklyScheduleEnabled?: boolean;
    availabilityType?: 'highlight' | 'available_only';
    displayOption?: 'normal' | 'weekly_special' | 'weekend_special' | 'todays_special';
    validFrom?: Date | null;
    validTo?: Date | null;
    priority?: number;
    linkedInventoryItem?: string | any;
    inventoryConsumptionQty?: number;
    inventoryTrackingMode?: 'recipe' | 'direct';
}
