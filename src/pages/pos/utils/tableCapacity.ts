// Absolute ceiling used only until a table is selected and its real capacity is known.
export const MAX_GUESTS_WITHOUT_TABLE = 100;

export interface MergedGroup {
    primary: any;
    secondaries: any[];
    combinedCapacity: number;
    isPending: boolean;
}

/**
 * Resolves the table (or merged group of tables) backing the current dine-in
 * selection, along with the seats it can actually hold.
 */
export function getMergedGroup(
    selectedTable: any,
    tables: any[],
    pendingMergeSecondaryIds: string[] = []
): MergedGroup | null {
    if (!selectedTable) {
        return null;
    }

    // 1. If we have pending merges from the POS UI
    if (pendingMergeSecondaryIds.length > 0) {
        const secondaries = pendingMergeSecondaryIds.map(id => tables.find(t => t._id === id)).filter(Boolean);
        const combinedCapacity = (selectedTable.capacity || 0) + secondaries.reduce((sum, t) => sum + (t.capacity || 0), 0);
        return {
            primary: selectedTable,
            secondaries,
            combinedCapacity,
            isPending: true
        };
    }

    // 2. If the table is already merged in the DB
    if (selectedTable.isPrimary || selectedTable.mergedWith) {
        const primaryId = selectedTable.isPrimary ? selectedTable._id : selectedTable.mergedWith;
        const primary = tables.find(t => t._id === primaryId);
        const secondaries = tables.filter(t => t.mergedWith === primaryId);
        const combinedCapacity = (primary?.capacity || 0) + secondaries.reduce((sum, t) => sum + (t.capacity || 0), 0);

        return {
            primary,
            secondaries,
            combinedCapacity,
            isPending: false
        };
    }

    // 3. Single table
    return {
        primary: selectedTable,
        secondaries: [],
        combinedCapacity: selectedTable?.capacity || 0,
        isPending: false
    };
}

/**
 * Upper bound for the guest count field. Mirrors the server-side capacity check
 * in orders.service.ts so staff see the limit before submitting.
 */
export function getMaxGuests(mergedGroup: MergedGroup | null): number {
    return mergedGroup?.combinedCapacity || MAX_GUESTS_WITHOUT_TABLE;
}
