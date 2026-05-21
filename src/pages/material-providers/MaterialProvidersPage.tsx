import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Avatar,
    TextField,
    InputAdornment,
    CircularProgress,
    Alert,
    Divider,
} from '@mui/material';
import {
    Search as SearchIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationIcon,
    Language as WebsiteIcon,
    Person as PersonIcon,
    Store as StoreIcon,
} from '@mui/icons-material';
import { materialProvidersAPI } from '../../services/api';

interface MaterialProvider {
    _id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    categories?: string[];
    status: string;
    notes?: string;
}

const MaterialProvidersPage: React.FC = () => {
    const [providers, setProviders] = useState<MaterialProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoading(true);
        materialProvidersAPI.getAll({ search: search || undefined, limit: 100 })
            .then(res => setProviders(res.data?.data || []))
            .catch(() => setError('Failed to load material providers.'))
            .finally(() => setLoading(false));
    }, [search]);

    const filtered = providers.filter(p =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
        p.categories?.some(c => c.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Material Providers
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Approved suppliers and material providers managed by the platform.
                </Typography>
            </Box>

            <TextField
                placeholder="Search by name, contact person, or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 3, maxWidth: 480 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                    ),
                }}
            />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && filtered.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <StoreIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No material providers found.</Typography>
                </Box>
            )}

            <Grid container spacing={2}>
                {filtered.map(provider => (
                    <Grid item xs={12} sm={6} md={4} key={provider._id}>
                        <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }, transition: 'box-shadow 0.2s' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 44, height: 44, fontWeight: 700, fontSize: '1.1rem' }}>
                                        {provider.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography fontWeight="bold" noWrap>{provider.name}</Typography>
                                        <Chip
                                            label={provider.status}
                                            size="small"
                                            color={provider.status === 'active' ? 'success' : 'default'}
                                            sx={{ height: 18, fontSize: '0.65rem', mt: 0.25 }}
                                        />
                                    </Box>
                                </Box>

                                {provider.categories && provider.categories.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                        {provider.categories.map(cat => (
                                            <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                        ))}
                                    </Box>
                                )}

                                <Divider sx={{ mb: 1.5 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {provider.contactPerson && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">{provider.contactPerson}</Typography>
                                        </Box>
                                    )}
                                    {provider.phone && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" component="a" href={`tel:${provider.phone}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                                                {provider.phone}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.email && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" component="a" href={`mailto:${provider.email}`} sx={{ color: 'primary.main', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {provider.email}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.address && (
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                                            <Typography variant="body2" color="text.secondary">{provider.address}</Typography>
                                        </Box>
                                    )}
                                    {provider.website && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WebsiteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography
                                                variant="body2"
                                                component="a"
                                                href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ color: 'primary.main', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {provider.website}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.notes && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                            {provider.notes}
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default MaterialProvidersPage;
