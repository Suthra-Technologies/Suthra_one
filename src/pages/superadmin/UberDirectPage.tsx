import React, { useState } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import toast from 'react-hot-toast';
import { ubereatsAPI, superAPI } from '../../services/api';
import GooglePlacesAutocomplete from '../../components/common/GooglePlacesAutocomplete';
import { useSettings } from '../../context/SettingsContext';

// E.164: leading "+", country code (1–9), then 9–14 more digits (e.g. +19763567844).
const PHONE_RE = /^\+[1-9]\d{9,14}$/;
// Keep only a leading "+" and digits — strips stray chars like "!" from a mistyped "+1".
const sanitizePhone = (v: string) => v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
const PHONE_HELP = 'Enter a valid E.164 number, e.g. +19763567844 (+ country code, 10–14 digits).';

const UberDirectPage: React.FC = () => {
    const { settings } = useSettings();
    const googleMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || settings?.system?.googleMapsApiKey;
    const [customerId, setCustomerId] = useState('');
    const [customerIdInput, setCustomerIdInput] = useState('');
    const [resolvedTenantId, setResolvedTenantId] = useState('');

    const [uberOrg, setUberOrg] = useState<any>(null);
    const [uberOrgLoading, setUberOrgLoading] = useState(false);
    const [uberLocations, setUberLocations] = useState<any[]>([]);
    const [uberLocationsLoading, setUberLocationsLoading] = useState(false);
    const [editLocationDialog, setEditLocationDialog] = useState<any>(null);
    const [linkingLocationId, setLinkingLocationId] = useState<string | null>(null);

    const [inviteDialog, setInviteDialog] = useState(false);
    const [inviteForm, setInviteForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [inviteLoading, setInviteLoading] = useState(false);

    const [createOrgDialog, setCreateOrgDialog] = useState(false);
    const [createOrgLoading, setCreateOrgLoading] = useState(false);
    const [createOrgForm, setCreateOrgForm] = useState({
        name: '', email: '', first_name: '', last_name: '', phone: '',
        street1: '', city: '', state: '', zipcode: '', country_iso2: 'US',
    });



    const handleSetCustomerId = () => {
        if (!customerIdInput.trim()) return;
        setCustomerId(customerIdInput.trim());
        setUberOrg(null);
        setUberLocations([]);
        setResolvedTenantId('');
    };

    const handleLinkLocation = async (loc: any) => {
        if (!resolvedTenantId) {
            toast.error('Enter the Tenant ID below to link a location');
            return;
        }
        setLinkingLocationId(loc.business_location_id);
        try {
            const res = await superAPI.linkUberPickupLocation(resolvedTenantId, customerId, loc.business_location_id);
            toast.success(`Linked! Pickup lat/lng saved for ${res.data?.tenantSlug}`);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to link location';
            toast.error(msg);
        } finally {
            setLinkingLocationId(null);
        }
    };

    const loadUberOrg = async () => {
        if (!customerId) return;
        setUberOrgLoading(true);
        try {
            const res = await ubereatsAPI.getOrganization(customerId);
            setUberOrg(res.data);
        } catch {
            toast.error('Failed to load organization details');
        } finally {
            setUberOrgLoading(false);
        }
    };

    const loadUberLocations = async () => {
        if (!customerId) return;
        setUberLocationsLoading(true);
        try {
            const res = await ubereatsAPI.getBusinessLocations(customerId);
            setUberLocations(res.data?.business_locations || []);
        } catch {
            toast.error('Failed to load business locations');
        } finally {
            setUberLocationsLoading(false);
        }
    };

    const handleUpdateLocation = async () => {
        if (!customerId || !editLocationDialog) return;
        try {
            const res = await ubereatsAPI.updateBusinessLocation(customerId, editLocationDialog.business_location_id, {
                name: editLocationDialog.name,
                phone_number: editLocationDialog.phone_number,
                detailed_address: editLocationDialog.detailed_address,
                external_business_location_id: editLocationDialog.external_business_location_id,
            });
            if (res.data?._addressUpdateSkipped) {
                toast('Saved — but address was not updated because there are orders in progress. Try again once all deliveries are complete.', { icon: '⚠️' });
            } else {
                toast.success('Location updated');
            }
            setEditLocationDialog(null);
            loadUberLocations();
        } catch (err: any) {
            const msg = err?.response?.data?.message || '';
            if (msg.includes('Orders in progress')) {
                toast.error('Address cannot be updated while deliveries are in progress. Wait until all active orders are complete, then try again.');
            } else {
                toast.error('Failed to update location');
            }
        }
    };

    const invitePhoneValid = PHONE_RE.test(inviteForm.phone.trim());
    const orgPhoneValid = PHONE_RE.test(createOrgForm.phone.trim());
    const editPhoneValid = PHONE_RE.test((editLocationDialog?.phone_number || '').trim());

    const handleInviteMember = async () => {
        if (!customerId) return;
        setInviteLoading(true);
        try {
            await ubereatsAPI.inviteMember(customerId, {
                user_details: {
                    email: inviteForm.email,
                    first_name: inviteForm.first_name,
                    last_name: inviteForm.last_name,
                    phone_details: { phone_number: inviteForm.phone, country_code: '1', subscriber_number: inviteForm.phone.slice(-10) },
                },
                roles: ['ROLE_ADMIN'],
            });
            toast.success('Invitation sent');
            setInviteDialog(false);
            setInviteForm({ first_name: '', last_name: '', email: '', phone: '' });
        } catch {
            toast.error('Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCreateOrg = async () => {
        setCreateOrgLoading(true);
        try {
            const res = await ubereatsAPI.createOrganization({
                info: {
                    name: createOrgForm.name,
                    billing_type: 'BILLING_TYPE_CENTRALIZED',
                    merchant_type: 'MERCHANT_TYPE_RESTAURANT',
                    point_of_contact: {
                        email: createOrgForm.email,
                        first_name: createOrgForm.first_name,
                        last_name: createOrgForm.last_name,
                        phone_details: { phone_number: createOrgForm.phone, country_code: '1', subscriber_number: createOrgForm.phone.slice(-10) },
                    },
                    address: { street1: createOrgForm.street1, city: createOrgForm.city, state: createOrgForm.state, zipcode: createOrgForm.zipcode, country_iso2: createOrgForm.country_iso2 },
                },
                hierarchy_info: { parent_organization_id: customerId },
                // Suthra One-managed (centralized) onboarding: do NOT email the sub-org's
                // point_of_contact. Suthra One (the parent org, set to CONTRACT_TYPE_PARENT)
                // provisions and links the sub-org's business location centrally.
                // ONBOARDING_INVITE_TYPE_INVALID is the "no invite sent" value.
                options: { onboarding_invite_type: 'ONBOARDING_INVITE_TYPE_INVALID' },
            });
            const newOrgId = res.data?.organization_id;
            // Suthra One-managed: no email goes to the sub-org. Suthra One now provisions the
            // sub-org's location centrally — switch the workspace to the new sub-org so
            // its business locations can be loaded and linked from here.
            toast.success(`Sub-org created under Suthra One: ${newOrgId}`);
            setCreateOrgDialog(false);
            if (newOrgId) {
                setCustomerId(newOrgId);
                setCustomerIdInput(newOrgId);
                setUberOrg(null);
                setUberLocations([]);
                setResolvedTenantId('');
            } else {
                loadUberOrg();
            }
        } catch {
            toast.error('Failed to create organization');
        } finally {
            setCreateOrgLoading(false);
        }
    };

    return (
        <Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3 }, pb: { xs: 1.5, sm: 2.5, md: 3 }, pt: { xs: 0.5, sm: 2.5, md: 3 } }}>
            <Typography
                variant="h4"
                fontWeight="bold"
                gutterBottom
                sx={{ textAlign: { xs: 'center', sm: 'left' }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
            >
                Uber Direct Management
            </Typography>

            {/* Customer ID Input */}
            <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Uber Eats Customer ID</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                        size="small"
                        label="Customer ID"
                        value={customerIdInput}
                        onChange={(e) => setCustomerIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSetCustomerId()}
                        sx={{ width: { xs: '100%', sm: 320 } }}
                    />
                    <Button variant="contained" onClick={handleSetCustomerId} disabled={!customerIdInput.trim()} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        Set
                    </Button>
                    {customerId && (
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            Active: <strong>{customerId}</strong>
                        </Typography>
                    )}
                </Stack>
            </Paper>

            {/* Tenant ID for linking */}
            {customerId && (
                <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Link Pickup Location</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Enter the Tenant ID (MongoDB _id) to link a business location as the pickup point for that restaurant.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                            size="small"
                            label="Tenant ID"
                            value={resolvedTenantId}
                            onChange={(e) => setResolvedTenantId(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 320 } }}
                            placeholder="e.g. 64abc..."
                        />
                        {resolvedTenantId && (
                            <Chip size="small" label="Ready to link" color="success" variant="outlined" />
                        )}
                    </Stack>
                </Paper>
            )}

            {/* Actions */}
            {customerId && (
                <Box>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        spacing={1.5}
                        sx={{ mb: 2 }}
                    >
                        <Typography variant="h6" fontWeight="bold">Actions</Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                            <Button
                                size="small" variant="outlined"
                                startIcon={uberOrgLoading ? <CircularProgress size={14} /> : <RefreshIcon />}
                                onClick={loadUberOrg} disabled={uberOrgLoading}
                            >
                                Load Org
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => setCreateOrgDialog(true)}>
                                Create Sub-Org
                            </Button>
                            <Button
                                size="small" variant="outlined"
                                startIcon={uberLocationsLoading ? <CircularProgress size={14} /> : <RefreshIcon />}
                                onClick={loadUberLocations} disabled={uberLocationsLoading}
                            >
                                Load Locations
                            </Button>
                            <Button size="small" variant="contained" onClick={() => setInviteDialog(true)}>
                                Invite Member
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Org Info */}
                    {uberOrg && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Organization Details</Typography>
                            <Stack spacing={0.5}>
                                <Typography variant="body2"><strong>ID:</strong> {uberOrg.organization_id}</Typography>
                                <Typography variant="body2"><strong>Name:</strong> {uberOrg.info?.name}</Typography>
                                <Typography variant="body2"><strong>Billing Type:</strong> {uberOrg.info?.billing_type}</Typography>
                                <Typography variant="body2"><strong>Contract Type:</strong> {uberOrg.info?.contract_type || uberOrg.contract_type || '—'}</Typography>
                                <Typography variant="body2"><strong>Billing Status:</strong> {uberOrg.billing_info?.billing_status || '—'}</Typography>
                                <Typography variant="body2"><strong>Contact:</strong> {uberOrg.info?.point_of_contact?.email}</Typography>
                            </Stack>
                        </Paper>
                    )}

                    {/* Business Locations */}
                    {uberLocations.length > 0 && (
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Business Locations</Typography>
                            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Name</strong></TableCell>
                                            <TableCell><strong>Address</strong></TableCell>
                                            <TableCell><strong>Phone</strong></TableCell>
                                            <TableCell><strong>External ID</strong></TableCell>
                                            <TableCell align="right"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {uberLocations.map((loc: any) => (
                                            <TableRow key={loc.business_location_id}>
                                                <TableCell>{loc.name}</TableCell>
                                                <TableCell>{loc.address}</TableCell>
                                                <TableCell>{loc.phone_number}</TableCell>
                                                <TableCell>{loc.external_business_location_id}</TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Set as pickup location for tenant">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleLinkLocation(loc)}
                                                                disabled={linkingLocationId === loc.business_location_id}
                                                                color="primary"
                                                            >
                                                                {linkingLocationId === loc.business_location_id
                                                                    ? <CircularProgress size={16} />
                                                                    : <LinkIcon fontSize="small" />}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <IconButton size="small" onClick={() => setEditLocationDialog({ ...loc })}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                <Stack spacing={1.25}>
                                    {uberLocations.map((loc: any) => (
                                        <Paper key={loc.business_location_id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                            <Stack spacing={0.75}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
                                                    {loc.name || '—'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                                                    {loc.address || '—'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                    <strong>Phone:</strong> {loc.phone_number || '—'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                    <strong>External ID:</strong> {loc.external_business_location_id || '—'}
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        startIcon={linkingLocationId === loc.business_location_id
                                                            ? <CircularProgress size={14} />
                                                            : <LinkIcon fontSize="small" />}
                                                        onClick={() => handleLinkLocation(loc)}
                                                        disabled={linkingLocationId === loc.business_location_id}
                                                    >
                                                        Set as Pickup
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<EditIcon fontSize="small" />}
                                                        onClick={() => setEditLocationDialog({ ...loc })}
                                                    >
                                                        Edit
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        </Paper>
                    )}
                </Box>
            )}

            {/* Create Sub-Org Dialog */}
            <Dialog open={createOrgDialog} onClose={() => setCreateOrgDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Sub-Organization</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField fullWidth label="Organization Name" value={createOrgForm.name} onChange={(e) => setCreateOrgForm(f => ({ ...f, name: e.target.value }))} />
                        <TextField fullWidth label="Contact Email" value={createOrgForm.email} onChange={(e) => setCreateOrgForm(f => ({ ...f, email: e.target.value }))} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth label="First Name" value={createOrgForm.first_name} onChange={(e) => setCreateOrgForm(f => ({ ...f, first_name: e.target.value }))} />
                            <TextField fullWidth label="Last Name" value={createOrgForm.last_name} onChange={(e) => setCreateOrgForm(f => ({ ...f, last_name: e.target.value }))} />
                        </Stack>
                        <TextField
                            fullWidth
                            label="Phone (e.g. +19763567844)"
                            value={createOrgForm.phone}
                            onChange={(e) => setCreateOrgForm(f => ({ ...f, phone: sanitizePhone(e.target.value) }))}
                            error={!!createOrgForm.phone && !orgPhoneValid}
                            helperText={createOrgForm.phone && !orgPhoneValid ? PHONE_HELP : ' '}
                            inputProps={{ inputMode: 'tel' }}
                        />
                        <GooglePlacesAutocomplete
                            label="Search address (Google)"
                            placeholder="Start typing the store address"
                            types={['address']}
                            includeCurrentLocation={false}
                            apiKey={googleMapsApiKey}
                            onPlaceSelect={(placeData: any) => {
                                if (!placeData?.components) return;
                                const c = placeData.components;
                                setCreateOrgForm(f => ({
                                    ...f,
                                    street1: c.street || f.street1,
                                    city: c.city || f.city,
                                    state: c.state || f.state,
                                    zipcode: c.zipCode || f.zipcode,
                                    country_iso2: c.country ? 'US' : f.country_iso2,
                                }));
                            }}
                        />
                        <TextField fullWidth label="Street Address" value={createOrgForm.street1} onChange={(e) => setCreateOrgForm(f => ({ ...f, street1: e.target.value }))} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth label="City" value={createOrgForm.city} onChange={(e) => setCreateOrgForm(f => ({ ...f, city: e.target.value }))} />
                            <TextField fullWidth label="State" value={createOrgForm.state} onChange={(e) => setCreateOrgForm(f => ({ ...f, state: e.target.value }))} />
                            <TextField fullWidth label="Zip" value={createOrgForm.zipcode} onChange={(e) => setCreateOrgForm(f => ({ ...f, zipcode: e.target.value }))} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOrgDialog(false)}>Cancel</Button>
                    <Button variant="contained" disabled={createOrgLoading || !createOrgForm.name || !orgPhoneValid} onClick={handleCreateOrg}>
                        {createOrgLoading ? <CircularProgress size={18} /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Invite Member Dialog */}
            <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth label="First Name" value={inviteForm.first_name} onChange={(e) => setInviteForm(f => ({ ...f, first_name: e.target.value }))} />
                            <TextField fullWidth label="Last Name" value={inviteForm.last_name} onChange={(e) => setInviteForm(f => ({ ...f, last_name: e.target.value }))} />
                        </Stack>
                        <TextField fullWidth label="Email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                        <TextField
                            fullWidth
                            label="Phone (e.g. +19763567844)"
                            value={inviteForm.phone}
                            onChange={(e) => setInviteForm(f => ({ ...f, phone: sanitizePhone(e.target.value) }))}
                            error={!!inviteForm.phone && !invitePhoneValid}
                            helperText={inviteForm.phone && !invitePhoneValid ? PHONE_HELP : ' '}
                            inputProps={{ inputMode: 'tel' }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
                    <Button variant="contained" disabled={inviteLoading || !inviteForm.email || !invitePhoneValid} onClick={handleInviteMember}>
                        {inviteLoading ? <CircularProgress size={18} /> : 'Send Invite'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Business Location Dialog */}
            <Dialog open={!!editLocationDialog} onClose={() => setEditLocationDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Business Location</DialogTitle>
                <DialogContent>
                    {editLocationDialog && (
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField fullWidth label="Name" value={editLocationDialog.name || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, name: e.target.value }))} />
                            <TextField
                                fullWidth
                                label="Phone (e.g. +19763567844)"
                                value={editLocationDialog.phone_number || ''}
                                onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, phone_number: sanitizePhone(e.target.value) }))}
                                error={!!editLocationDialog.phone_number && !editPhoneValid}
                                helperText={editLocationDialog.phone_number && !editPhoneValid ? PHONE_HELP : ' '}
                                inputProps={{ inputMode: 'tel' }}
                            />
                            <TextField fullWidth label="External Store ID" value={editLocationDialog.external_business_location_id || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, external_business_location_id: e.target.value }))} />
                            <TextField fullWidth label="Street" value={editLocationDialog.detailed_address?.street_address_1 || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, street_address_1: e.target.value } }))} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField fullWidth label="City" value={editLocationDialog.detailed_address?.city || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, city: e.target.value } }))} />
                                <TextField fullWidth label="State" value={editLocationDialog.detailed_address?.state || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, state: e.target.value } }))} />
                                <TextField fullWidth label="Zip" value={editLocationDialog.detailed_address?.zip_code || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, zip_code: e.target.value } }))} />
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditLocationDialog(null)}>Cancel</Button>
                    <Button variant="contained" disabled={!editPhoneValid} onClick={handleUpdateLocation}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UberDirectPage;
