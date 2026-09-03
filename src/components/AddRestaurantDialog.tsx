import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Alert,
    CircularProgress
} from '@mui/material';
import axios from 'src/services/api';
import { useAuth } from 'src/context/AuthContext';

interface AddRestaurantDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (slug: string) => void;
}

const AddRestaurantDialog: React.FC<AddRestaurantDialogProps> = ({ open, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        restaurantName: '',
        slug: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Auto-generate slug from name if slug hasn't been manually edited
        if (name === 'restaurantName' && !formData.slug) {
            const generatedSlug = value?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            setFormData(prev => ({ ...prev, [name]: value, slug: generatedSlug }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.restaurantName || !formData.slug) {
            setError('Please fill in required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/tenants/add-store', formData);
            onSuccess(formData.slug);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to add store');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Restaurant</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Restaurant Name"
                            name="restaurantName"
                            value={formData.restaurantName}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Domain (e.g. my-restaurant)"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            fullWidth
                            required
                            helperText={`Your URL will be: ${window.location.host}/${formData.slug}`}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Create Restaurant'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddRestaurantDialog;
