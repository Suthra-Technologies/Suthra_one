import React, { useState } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import toast from 'react-hot-toast';
import { ubereatsAPI } from '../../services/api';

const UberDirectPage: React.FC = () => {
    const [customerId, setCustomerId] = useState('');
    const [customerIdInput, setCustomerIdInput] = useState('');

    const [uberOrg, setUberOrg] = useState<any>(null);
    const [uberOrgLoading, setUberOrgLoading] = useState(false);
    const [uberLocations, setUberLocations] = useState<any[]>([]);
    const [uberLocationsLoading, setUberLocationsLoading] = useState(false);
    const [editLocationDialog, setEditLocationDialog] = useState<any>(null);

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
            await ubereatsAPI.updateBusinessLocation(customerId, editLocationDialog.business_location_id, {
                name: editLocationDialog.name,
                phone_number: editLocationDialog.phone_number,
                detailed_address: editLocationDialog.detailed_address,
                external_business_location_id: editLocationDialog.external_business_location_id,
            });
            toast.success('Location updated');
            setEditLocationDialog(null);
            loadUberLocations();
        } catch {
            toast.error('Failed to update location');
        }
    };

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
                    billing_type: 'BILLING_TYPE_DECENTRALIZED',
                    merchant_type: 'MERCHANT_TYPE_RESTAURANT',
                    point_of_contact: {
                        email: createOrgForm.email,
                        first_name: createOrgForm.first_name,
                        last_name: createOrgForm.last_name,
                        phone_details: { phone_number: createOrgForm.phone, country_code: '1', subscriber_number: createOrgForm.phone.slice(-10) },
                    },
                    contract_type: 'CONTRACT_TYPE_PARENT',
                    address: { street1: createOrgForm.street1, city: createOrgForm.city, state: createOrgForm.state, zipcode: createOrgForm.zipcode, country_iso2: createOrgForm.country_iso2 },
                },
                hierarchy_info: { parent_organization_id: customerId },
                options: { onboarding_invite_type: 'ONBOARDING_INVITE_TYPE_INVALID' },
            });
            toast.success(`Organization created: ${res.data?.organization_id}`);
            setCreateOrgDialog(false);
            loadUberOrg();
        } catch {
            toast.error('Failed to create organization');
        } finally {
            setCreateOrgLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Uber Direct Management</Typography>

            {/* Customer ID Input */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Uber Eats Customer ID</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        size="small"
                        label="Customer ID"
                        value={customerIdInput}
                        onChange={(e) => setCustomerIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSetCustomerId()}
                        sx={{ width: 320 }}
                    />
                    <Button variant="contained" onClick={handleSetCustomerId} disabled={!customerIdInput.trim()}>
                        Set
                    </Button>
                    {customerId && (
                        <Typography variant="body2" color="text.secondary">
                            Active: <strong>{customerId}</strong>
                        </Typography>
                    )}
                </Stack>
            </Paper>

            {/* Actions */}
            {customerId && (
                <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Actions</Typography>
                        <Stack direction="row" spacing={1}>
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
                                <Typography variant="body2"><strong>Billing Status:</strong> {uberOrg.billing_info?.billing_status || '—'}</Typography>
                                <Typography variant="body2"><strong>Contact:</strong> {uberOrg.info?.point_of_contact?.email}</Typography>
                            </Stack>
                        </Paper>
                    )}

                    {/* Business Locations */}
                    {uberLocations.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Business Locations</Typography>
                            <TableContainer>
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
                                                    <IconButton size="small" onClick={() => setEditLocationDialog({ ...loc })}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
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
                        <Stack direction="row" spacing={2}>
                            <TextField fullWidth label="First Name" value={createOrgForm.first_name} onChange={(e) => setCreateOrgForm(f => ({ ...f, first_name: e.target.value }))} />
                            <TextField fullWidth label="Last Name" value={createOrgForm.last_name} onChange={(e) => setCreateOrgForm(f => ({ ...f, last_name: e.target.value }))} />
                        </Stack>
                        <TextField fullWidth label="Phone" value={createOrgForm.phone} onChange={(e) => setCreateOrgForm(f => ({ ...f, phone: e.target.value }))} />
                        <TextField fullWidth label="Street Address" value={createOrgForm.street1} onChange={(e) => setCreateOrgForm(f => ({ ...f, street1: e.target.value }))} />
                        <Stack direction="row" spacing={2}>
                            <TextField fullWidth label="City" value={createOrgForm.city} onChange={(e) => setCreateOrgForm(f => ({ ...f, city: e.target.value }))} />
                            <TextField fullWidth label="State" value={createOrgForm.state} onChange={(e) => setCreateOrgForm(f => ({ ...f, state: e.target.value }))} />
                            <TextField fullWidth label="Zip" value={createOrgForm.zipcode} onChange={(e) => setCreateOrgForm(f => ({ ...f, zipcode: e.target.value }))} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOrgDialog(false)}>Cancel</Button>
                    <Button variant="contained" disabled={createOrgLoading || !createOrgForm.name} onClick={handleCreateOrg}>
                        {createOrgLoading ? <CircularProgress size={18} /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Invite Member Dialog */}
            <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField fullWidth label="First Name" value={inviteForm.first_name} onChange={(e) => setInviteForm(f => ({ ...f, first_name: e.target.value }))} />
                            <TextField fullWidth label="Last Name" value={inviteForm.last_name} onChange={(e) => setInviteForm(f => ({ ...f, last_name: e.target.value }))} />
                        </Stack>
                        <TextField fullWidth label="Email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                        <TextField fullWidth label="Phone" value={inviteForm.phone} onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
                    <Button variant="contained" disabled={inviteLoading || !inviteForm.email} onClick={handleInviteMember}>
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
                            <TextField fullWidth label="Phone" value={editLocationDialog.phone_number || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, phone_number: e.target.value }))} />
                            <TextField fullWidth label="External Store ID" value={editLocationDialog.external_business_location_id || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, external_business_location_id: e.target.value }))} />
                            <TextField fullWidth label="Street" value={editLocationDialog.detailed_address?.street_address_1 || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, street_address_1: e.target.value } }))} />
                            <Stack direction="row" spacing={2}>
                                <TextField fullWidth label="City" value={editLocationDialog.detailed_address?.city || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, city: e.target.value } }))} />
                                <TextField fullWidth label="State" value={editLocationDialog.detailed_address?.state || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, state: e.target.value } }))} />
                                <TextField fullWidth label="Zip" value={editLocationDialog.detailed_address?.zip_code || ''} onChange={(e) => setEditLocationDialog((l: any) => ({ ...l, detailed_address: { ...l.detailed_address, zip_code: e.target.value } }))} />
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditLocationDialog(null)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateLocation}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UberDirectPage;
