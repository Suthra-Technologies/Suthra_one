import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    alpha,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { notificationsAPI } from '../../../services/api';

interface Props {
    open: boolean;
    editing?: any | null;
    onClose: () => void;
    onSaved: () => void;
}

interface CategoryState {
    _id: string;
    category: string;
    events: Array<{ _id: string; eventName: string; enabled: boolean }>;
}

const prettify = (value: string) => value.replace(/_/g, ' ');

const roleLabel = (role: string) =>
    role
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const NotificationConfigDialog: React.FC<Props> = ({ open, editing, onClose, onSaved }) => {
    const isEdit = Boolean(editing);

    const [targetType, setTargetType] = useState<'user' | 'role'>('user');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [categories, setCategories] = useState<CategoryState[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Selections are keyed by event id, independent of category grouping.
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    // The ceiling for a user target: the events their roles grant. null means
    // "not a user target", so no restriction applies.
    const [allowedEventIds, setAllowedEventIds] = useState<Set<string> | null>(null);
    const [allowedLoading, setAllowedLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [enumsRes, categoriesRes, usersRes] = await Promise.all([
                notificationsAPI.getEnums(),
                notificationsAPI.getCategories({ limit: 100 }),
                notificationsAPI.getAssignableUsers(),
            ]);

            const cats: CategoryState[] = (categoriesRes.data?.data || []).map((c: any) => ({
                _id: String(c._id),
                category: c.category,
                events: (c.events || []).map((e: any) => ({
                    _id: String(e._id),
                    eventName: e.eventName,
                    enabled: e.enabled !== false,
                })),
            }));

            setCategories(cats);
            setRoles(enumsRes.data?.roles || []);
            setUsers(usersRes.data || []);

            if (editing) {
                // Rehydrate from the saved config, matching on event id.
                const next: Record<string, boolean> = {};
                for (const item of editing.notifications || []) {
                    for (const event of item.events || []) {
                        next[String(event.eventId)] = event.enabled === true;
                    }
                }
                setSelected(next);
                setTargetType(editing.user ? 'user' : 'role');
                setSelectedRole(editing.role || null);
                setSelectedUser(
                    editing.user
                        ? (usersRes.data || []).find(
                            (u: any) => String(u._id) === String(editing.user),
                        ) || { _id: editing.user, name: editing.name }
                        : null,
                );
            } else {
                setSelected({});
                setTargetType('user');
                setSelectedUser(null);
                setSelectedRole(null);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load notification options');
        } finally {
            setLoading(false);
        }
    }, [editing]);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    // A role config grants; a user config may only narrow within their roles'
    // grants. Fetch that ceiling whenever the user target changes.
    useEffect(() => {
        if (!open || targetType !== 'user' || !selectedUser?._id) {
            setAllowedEventIds(null);
            return;
        }

        let cancelled = false;
        setAllowedLoading(true);
        notificationsAPI
            .getAllowedEvents(String(selectedUser._id))
            .then((res) => {
                if (cancelled) return;
                const allowed = new Set<string>(
                    (res.data?.allowedEventIds || []).map((id: any) => String(id)),
                );
                setAllowedEventIds(allowed);
                // Drop anything already ticked that the roles do not grant, so
                // the UI never shows a selection the server would strip.
                setSelected((prev) => {
                    const next: Record<string, boolean> = {};
                    for (const [id, on] of Object.entries(prev)) {
                        next[id] = on && allowed.has(id);
                    }
                    return next;
                });
            })
            .catch(() => {
                if (!cancelled) setAllowedEventIds(new Set());
            })
            .finally(() => {
                if (!cancelled) setAllowedLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, targetType, selectedUser?._id]);

    /** An event is selectable unless the user's roles do not grant it. */
    const isAllowed = useCallback(
        (eventId: string) => !allowedEventIds || allowedEventIds.has(eventId),
        [allowedEventIds],
    );

    const allEventIds = useMemo(
        () => categories.flatMap((c) => c.events.map((e) => e._id)),
        [categories],
    );

    // Counts and bulk toggles only ever consider what can actually be selected.
    const selectableEventIds = useMemo(
        () => allEventIds.filter(isAllowed),
        [allEventIds, isAllowed],
    );

    const selectedCount = selectableEventIds.filter((id) => selected[id]).length;
    const allSelected =
        selectableEventIds.length > 0 && selectedCount === selectableEventIds.length;
    const someSelected = selectedCount > 0 && !allSelected;

    const toggleAll = (checked: boolean) => {
        setSelected((prev) => {
            const next = { ...prev };
            for (const id of selectableEventIds) next[id] = checked;
            return next;
        });
    };

    const toggleCategory = (category: CategoryState, checked: boolean) => {
        setSelected((prev) => {
            const next = { ...prev };
            for (const event of category.events) {
                if (isAllowed(event._id)) next[event._id] = checked;
            }
            return next;
        });
    };

    const toggleEvent = (eventId: string) => {
        if (!isAllowed(eventId)) return;
        setSelected((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    const handleSave = async () => {
        if (targetType === 'user' && !selectedUser) {
            toast.error('Select a staff member');
            return;
        }
        if (targetType === 'role' && !selectedRole) {
            toast.error('Select a role');
            return;
        }

        // Always send the complete desired state so unchecking persists.
        const notifications = categories.map((category) => ({
            category: category._id,
            events: category.events.map((event) => ({
                event: event._id,
                enabled: Boolean(selected[event._id]),
            })),
        }));

        setSaving(true);
        try {
            if (isEdit) {
                await notificationsAPI.update(editing._id, { notifications });
                toast.success('Notification configuration updated');
            } else {
                await notificationsAPI.create({
                    ...(targetType === 'user'
                        ? { user: selectedUser._id }
                        : { role: selectedRole }),
                    notifications,
                });
                toast.success('Notification configuration created');
            }
            onSaved();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ pr: 6 }}>
                {isEdit ? 'Edit' : 'Add'} Notification Configuration
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                    size="small"
                >
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={2.5}>
                        {isEdit ? (
                            <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {editing?.user ? 'Staff member' : 'Role'}
                                </Typography>
                                <Typography fontWeight={600}>{editing?.name || '—'}</Typography>
                            </Paper>
                        ) : (
                            <>
                                <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    value={targetType}
                                    onChange={(_, next) => {
                                        if (!next) return;
                                        setTargetType(next);
                                        setSelectedUser(null);
                                        setSelectedRole(null);
                                    }}
                                >
                                    <ToggleButton value="user" sx={{ px: 3 }}>
                                        User
                                    </ToggleButton>
                                    <ToggleButton value="role" sx={{ px: 3 }}>
                                        Role
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                {targetType === 'user' ? (
                                    <Autocomplete
                                        options={users}
                                        value={selectedUser}
                                        onChange={(_, next) => setSelectedUser(next)}
                                        getOptionLabel={(option: any) => option?.name || ''}
                                        isOptionEqualToValue={(option, value) =>
                                            String(option._id) === String(value?._id)
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                label="Staff member"
                                                placeholder="Search staff"
                                            />
                                        )}
                                    />
                                ) : (
                                    <Autocomplete
                                        options={roles}
                                        value={selectedRole}
                                        onChange={(_, next) => setSelectedRole(next)}
                                        getOptionLabel={(option) => roleLabel(String(option))}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                label="Role"
                                                placeholder="Search roles"
                                            />
                                        )}
                                    />
                                )}
                            </>
                        )}

                        <Divider />

                        {targetType === 'user' && selectedUser && (
                            <Typography variant="caption" color="text.secondary">
                                {allowedLoading
                                    ? 'Checking which events this role grants…'
                                    : selectableEventIds.length === 0
                                        ? 'This user’s role grants no events yet. Enable them on the role configuration first.'
                                        : `Limited to the ${selectableEventIds.length} event(s) granted by ${(selectedUser.roles || []).map(prettify).join(', ') || 'their role'}.`}
                            </Typography>
                        )}

                        {selectableEventIds.length > 0 && (
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography fontWeight={700}>
                                    Events{' '}
                                    <Typography component="span" variant="body2" color="text.secondary">
                                        ({selectedCount}/{selectableEventIds.length} enabled)
                                    </Typography>
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={allSelected}
                                            indeterminate={someSelected}
                                            onChange={(e) => toggleAll(e.target.checked)}
                                        />
                                    }
                                    label="Select all"
                                />
                            </Stack>
                        )}

                        {categories.map((category) => {
                            // Only what the user's roles grant is offered at all; a
                            // category granting nothing is left out entirely.
                            const grantedEvents = category.events.filter((e) => isAllowed(e._id));
                            if (!grantedEvents.length) return null;

                            const catSelected = grantedEvents.filter((e) => selected[e._id]).length;
                            const catAll = catSelected === grantedEvents.length;
                            const catSome = catSelected > 0 && !catAll;

                            return (
                                <Paper key={category._id} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        sx={{
                                            px: 1.5,
                                            py: 0.75,
                                            bgcolor: alpha('#94a3b8', 0.07),
                                            borderRadius: '8px 8px 0 0',
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {category.category}
                                        </Typography>
                                        <Checkbox
                                            size="small"
                                            checked={catAll}
                                            indeterminate={catSome}
                                            onChange={(e) => toggleCategory(category, e.target.checked)}
                                        />
                                    </Stack>
                                    <Box
                                        sx={{
                                            p: 1,
                                            display: 'grid',
                                            gridTemplateColumns: {
                                                xs: '1fr',
                                                sm: 'repeat(2, 1fr)',
                                                md: 'repeat(3, 1fr)',
                                            },
                                            gap: 0.5,
                                        }}
                                    >
                                        {grantedEvents.map((event) => (
                                                <FormControlLabel
                                                    key={event._id}
                                                    sx={{ m: 0 }}
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={Boolean(selected[event._id])}
                                                            onChange={() => toggleEvent(event._id)}
                                                        />
                                                    }
                                                    label={
                                                        <Stack>
                                                            <Typography variant="body2">
                                                                {prettify(event.eventName)}
                                                            </Typography>
                                                            {!event.enabled && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="warning.main"
                                                                >
                                                                    Disabled for all staff
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    }
                                                />
                                        ))}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
                    {saving && <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />}
                    {isEdit ? 'Update' : 'Create'} Configuration
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NotificationConfigDialog;
