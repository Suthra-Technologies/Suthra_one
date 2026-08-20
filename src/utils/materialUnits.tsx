import { ListSubheader, MenuItem } from '@mui/material';
import React from 'react';
import { IMPERIAL_UNITS } from '../context/SettingsContext';

/**
 * US customary units a material provider quotes in, shared by every screen that
 * touches a provider's catalog: the superadmin's provider form, the provider's
 * own portal, and the tenant's order / receive dialogs.
 *
 * All of them must offer the same values — an order placed in a unit the
 * catalog does not use, or that the backend rejects, breaks the handoff into
 * Purchase Orders. Sourced from the app's shared IMPERIAL_UNITS so there is
 * exactly one list, not four copies drifting apart.
 */

const UNIT_GROUP_LABELS: Record<string, string> = {
    weight: 'Weight',
    volume: 'Volume',
    count: 'Count',
};

export const UNIT_OPTIONS = ['weight', 'volume', 'count'].flatMap((type) =>
    IMPERIAL_UNITS.filter((u) => u.type === type).map((u) => ({ ...u, group: UNIT_GROUP_LABELS[type] })),
);

/** Just the values, for validating a unit before sending it to the API. */
export const UNIT_VALUES = UNIT_OPTIONS.map((u) => u.value);

export const isValidUnit = (value?: string) => !!value && UNIT_VALUES.includes(value);

/** Full label for a unit value, e.g. 'lb' -> 'Pounds (lb)'. */
export const unitLabel = (value?: string) =>
    IMPERIAL_UNITS.find((u) => u.value === value)?.label || value || '';

/**
 * Options for a `TextField select` / `Select`, grouped by measurement type.
 *
 * MUI's Select does not support nested <optgroup>, so group headers are
 * rendered as ListSubheaders. React.Children.toArray flattens the nested
 * arrays and strips the nulls, so value matching still works.
 *
 * @param includeEmpty renders a leading "no unit" choice.
 */
export const renderUnitOptions = (includeEmpty = true, emptyLabel = 'Select unit') => [
    includeEmpty ? (
        <MenuItem key="__empty" value="">
            <em>{emptyLabel}</em>
        </MenuItem>
    ) : null,
    ...UNIT_OPTIONS.map((u, idx) => {
        const isFirstOfGroup = idx === 0 || UNIT_OPTIONS[idx - 1].group !== u.group;
        return [
            isFirstOfGroup ? (
                <ListSubheader key={`${u.group}-header`} sx={{ lineHeight: '32px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {u.group}
                </ListSubheader>
            ) : null,
            <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>,
        ];
    }),
];
