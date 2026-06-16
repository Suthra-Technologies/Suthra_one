import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Straighten as StraightenIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { traysAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import CustomInput from '../../components/common/CustomInput';

interface Tray {
    _id: string;
    name: string;
    description?: string;
    width?: string;
    length?: string;
    depth?: string;
    isActive: boolean;
}

interface TraysPageProps {
    hideHeader?: boolean;
}

const TraysPage: React.FC<TraysPageProps> = ({ hideHeader = false }) => {
    const [trays, setTrays] = useState<Tray[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTray, setEditingTray] = useState<Tray | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        width: '',
        length: '',
        depth: '',
        isActive: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    const fetchTrays = async () => {
        try {
            setLoading(true);
            const response = await traysAPI.getAll();
            setTrays(response.data);
        } catch (error) {
            toast.error('Failed to fetch trays');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrays();
    }, []);

    const handleOpenDialog = (tray?: Tray) => {
        if (tray) {
            setEditingTray(tray);
            setFormData({
                name: tray.name,
                description: tray.description || '',
                width: tray.width || '',
                length: tray.length || '',
                depth: tray.depth || '',
                isActive: tray.isActive,
            });
        } else {
            setEditingTray(null);
            setFormData({
                name: '',
                description: '',
                width: '',
                length: '',
                depth: '',
                isActive: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingTray(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (submitting) return;
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Tray Name is required');
            return;
        }
        if (!formData.width || parseFloat(formData.width) <= 0) {
            toast.error('Valid width is required (greater than 0)');
            return;
        }
        if (!formData.length || parseFloat(formData.length) <= 0) {
            toast.error('Valid length is required (greater than 0)');
            return;
        }
        if (!formData.depth || parseFloat(formData.depth) <= 0) {
            toast.error('Valid depth is required (greater than 0)');
            return;
        }

        try {
            setSubmitting(true);
            if (editingTray) {
                await traysAPI.update(editingTray._id, formData);
                toast.success('Tray updated successfully');
            } else {
                await traysAPI.create(formData);
                toast.success('Tray created successfully');
            }
            handleCloseDialog();
            fetchTrays();
        } catch (error) {
            toast.error('Failed to save tray');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (isDeleting || !confirmDelete.id) return;
        try {
            setIsDeleting(true);
            await traysAPI.delete(confirmDelete.id);
            toast.success('Tray deleted successfully');
            fetchTrays();
        } catch (error) {
            toast.error('Failed to delete tray');
        } finally {
            setIsDeleting(false);
            setConfirmDelete({ open: false, id: null });
        }
    };

    return (
        <Box sx={hideHeader ? { mt: 2 } : { mt: 4, mb: 4, px: 3 }}>
            {!hideHeader && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" fontWeight="bold">
                        Tray Management
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add New Tray
                    </Button>
                </Box>
            )}

            {hideHeader && (
                <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add New Tray
                    </Button>
                </Box>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
            ) : trays.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                    <StraightenIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No trays configured</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Add your first tray specification to get started.</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Add New Tray
                    </Button>
                </Paper>
            ) : (
              <>
{/* Mobile Cards */}
<Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
  {trays.map((tray) => (
    <Paper key={tray._id} elevation={1} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>{tray.name}</Typography>
          {tray.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{tray.description}</Typography>
          )}
        </Box>
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(tray)} color="primary" sx={{ mr: 0.5 }}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => handleDelete(tray._id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {tray.width && tray.length ? (
          <Typography variant="body2" color="text.secondary">
            📐 {tray.width} × {tray.length}{tray.depth ? ` × ${tray.depth}` : ''}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">No dimensions</Typography>
        )}
      </Box>
    </Paper>
  ))}
</Box>

{/* Desktop Table */}
<TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
                    <Table size="small" sx={{ minWidth: 500 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ py: 1.5, fontWeight: 600 }}>Name & Description</TableCell>
                                <TableCell sx={{ py: 1.5, fontWeight: 600 }}>Dimensions (W×L×D)</TableCell>
                                <TableCell sx={{ py: 1.5, fontWeight: 600 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {trays.map((tray) => (
                                <TableRow key={tray._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ py: 1, width: '40%' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            {tray.name}
                                        </Typography>
                                        {tray.description && (
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                {tray.description}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ py: 1, width: '30%' }}>
                                        {tray.width && tray.length ? (
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                                    {tray.width} × {tray.length}{tray.depth ? ` × ${tray.depth}` : ''}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">-</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ py: 1, whiteSpace: 'nowrap', width: '15%' }} align="right">
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => handleOpenDialog(tray)} color="primary" sx={{ mr: 0.5 }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => handleDelete(tray._id)} color="error">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                </>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
                        {editingTray ? 'Edit Tray' : 'Add New Tray'}
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseDialog}
                            sx={{
                                position: 'absolute',
                                right: 12,
                                top: 12,
                                color: 'white',
                                bgcolor: '#ff0000',
                                '&:hover': {
                                    bgcolor: '#d32f2f',
                                },
                                borderRadius: '50%',
                                p: 0.3
                            }}
                        >
                            <CloseIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <CustomInput
                                    type="name"
                                    fullWidth
                                    size="small"
                                    label="Tray Name"
                                    required
                                    value={formData.name}
                                    onChange={(val) => setFormData({ ...formData, name: val })}
                                    placeholder="e.g., Half Tray, Full Tray"
                                    maxLength={50}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' }, '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <CustomInput
                                    type="textarea"
                                    fullWidth
                                    size="small"
                                    label="Description"
                                    multiline
                                    rows={2}
                                    value={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    maxLength={250}
                                    showCounter={true}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' } }}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <CustomInput
                                    type="number"
                                    fullWidth
                                    size="small"
                                    label="Width"
                                    required
                                    value={formData.width}
                                    onChange={(val) => setFormData({ ...formData, width: val })}
                                    placeholder="12 inch"
                                    maxLength={2}
                                    allowDecimals={false}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' }, '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <CustomInput
                                    type="number"
                                    fullWidth
                                    size="small"
                                    label="Length"
                                    required
                                    value={formData.length}
                                    onChange={(val) => setFormData({ ...formData, length: val })}
                                    placeholder="16 inch"
                                    maxLength={2}
                                    allowDecimals={false}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' }, '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <CustomInput
                                    type="number"
                                    fullWidth
                                    size="small"
                                    label="Depth"
                                    required
                                    value={formData.depth}
                                    onChange={(val) => setFormData({ ...formData, depth: val })}
                                    placeholder="2 inch"
                                    maxLength={2}
                                    allowDecimals={false}
                                    sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' }, '& .MuiInputLabel-root': { fontSize: '0.875rem' }, '& .MuiFormLabel-asterisk': { color: 'red' } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={submitting} startIcon={submitting && <CircularProgress size={16} color="inherit" />}>
                            {submitting ? 'Saving...' : 'Save Tray'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                PaperProps={{
                    sx: { borderRadius: 2, p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete this tray? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setConfirmDelete({ open: false, id: null })}
                        variant="outlined"
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                        disabled={isDeleting}
                        startIcon={isDeleting && <CircularProgress size={16} color="inherit" />}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TraysPage;
