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
    linkedMenuItem?: string;        // ObjectId of a MenuItem (deducts via its Recipe)
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
    spiceLevel?: 'mild' | 'medium' | 'hot' | 'very_hot';
    isSpiceLevelAvailable?: boolean;
    spiceLevels?: string[];
    spiceLevelData?: any;
    availableDays?: string[];
    isWeeklyScheduleEnabled?: boolean;
    availabilityType?: 'highlight' | 'available_only';
    displayOption?: 'normal' | 'weekly_special' | 'todays_special';
    validFrom?: Date | null;
    validTo?: Date | null;
    priority?: number;
    linkedInventoryItem?: string | any;
    inventoryConsumptionQty?: number;
    inventoryTrackingMode?: 'recipe' | 'direct';
}
