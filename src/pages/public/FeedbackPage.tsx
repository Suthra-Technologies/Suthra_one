
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Container,
    Paper,
    Rating,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    CircularProgress,
    Stack
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { feedbackAPI } from '../../services/api';

import { getTenantSlugFromHostname } from '../../utils/tenant.utils';
import { groupBillItems } from '../../utils/orderWorkflows';

const FeedbackPage: React.FC = () => {
    const { slug: pathSlug, orderId } = useParams<{ slug: string; orderId: string }>();
    const slug = pathSlug || getTenantSlugFromHostname();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [serviceRating, setServiceRating] = useState<number | null>(0);
    const [ambianceRating, setAmbianceRating] = useState<number | null>(0);
    const [suggestions, setSuggestions] = useState('');
    const [itemRatings, setItemRatings] = useState<Record<string, { taste: number; quantity: number }>>({});

    // A dish the kitchen split across rows is still one dish to the guest: rate it
    // once. This grouped list is the only thing the page renders, keys and submits
    // from, so a rating can never land on a row the guest never saw.
    const feedbackItems = React.useMemo(
        () => groupBillItems(order?.items || []),
        [order],
    );

    useEffect(() => {
        if (slug && orderId) {
            fetchOrder();
        }
    }, [slug, orderId]);

    const fetchOrder = async () => {
        try {
            const res = await feedbackAPI.getOrderForFeedback(slug!, orderId!);

            if (res.data.hasFeedback) {
                setSubmitted(true);
                return;
            }

            setOrder(res.data);

            // Seed from the same grouped list the page renders, so the keys line up.
            const initialRatings: any = {};
            groupBillItems(res.data.items || []).forEach((item: any, index: number) => {
                const key = `${item.menuItem}-${index}`;
                initialRatings[key] = { taste: 0, quantity: 0 };
            });
            setItemRatings(initialRatings);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const handleItemRatingChange = (itemKey: string, type: 'taste' | 'quantity', value: number | null) => {
        setItemRatings(prev => ({
            ...prev,
            [itemKey]: {
                ...prev[itemKey],
                [type]: value || 0
            }
        }));
    };

    const handleSubmit = async () => {
        if (!serviceRating || !ambianceRating) {
            toast.error('Please rate service and ambiance');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                orderId,
                serviceRating,
                ambianceRating,
                suggestions,
                itemRatings: feedbackItems.map((item: any, index: number) => {
                    const key = `${item.menuItem}-${index}`;
                    return {
                        menuItem: item.menuItem,
                        name: item.name,
                        tasteRating: itemRatings[key]?.taste || 0,
                        quantityRating: itemRatings[key]?.quantity || 0,
                        modifiers: item.modifiers || []
                    };
                })
            };

            await feedbackAPI.submitPublic(slug!, payload);
            setSubmitted(true);
            toast.success('Thank you for your feedback!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (submitted) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <Paper sx={{ p: 4, borderRadius: 2 }}>
                    <Typography variant="h4" color="primary" gutterBottom>Thank You!</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Your feedback helps us serve you better. We look forward to seeing you again!
                    </Typography>
                </Paper>
            </Container>
        );
    }

    if (!order) {
        return (
            <Container sx={{ mt: 5 }}>
                <Typography variant="h6" color="error">Order not found or invalid link.</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
                <Typography variant="h5" gutterBottom align="center" fontWeight="bold">
                    Rate Your Experience
                </Typography>
                <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
                    Order #{order.orderNumber}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>Food Items</Typography>
                <List disablePadding>
                    {feedbackItems.map((item: any, index: number) => {
                        const key = `${item.menuItem}-${index}`;
                        return (
                            <ListItem key={key} sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, py: 2, borderBottom: '1px solid #f0f0f0' }}>
                                <ListItemText
                                    primary={item.name}
                                    secondary={
                                        <>
                                            <Typography variant="body2" color="text.secondary">
                                                Qty: {item.quantity}
                                            </Typography>
                                            {item.modifiers && (item?.modifiers || []).length > 0 && (
                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    + {(item?.modifiers || []).map((m: any) => m.name).join(', ')}
                                                </Typography>
                                            )}
                                        </>
                                    }
                                    sx={{ width: { xs: '100%', sm: '30%' }, mb: { xs: 1, sm: 0 } }}
                                />

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '100%' }}>
                                    <Box>
                                        <Typography component="legend" variant="caption">Taste</Typography>
                                        <Rating
                                            name={`taste-${key}`}
                                            value={itemRatings[key]?.taste || 0}
                                            onChange={(_, val) => handleItemRatingChange(key, 'taste', val)}
                                            size="small"
                                        />
                                    </Box>
                                    <Box>
                                        <Typography component="legend" variant="caption">Quantity</Typography>
                                        <Rating
                                            name={`qty-${key}`}
                                            value={itemRatings[key]?.quantity || 0}
                                            onChange={(_, val) => handleItemRatingChange(key, 'quantity', val)}
                                            size="small"
                                        />
                                    </Box>
                                </Stack>
                            </ListItem>
                        );
                    })}
                </List>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Overall Experience</Typography>
                    <Stack spacing={2}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography>Service Quality</Typography>
                            <Rating
                                value={serviceRating}
                                onChange={(_, val) => setServiceRating(val)}
                                size="large"
                            />
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography>Ambiance</Typography>
                            <Rating
                                value={ambianceRating}
                                onChange={(_, val) => setAmbianceRating(val)}
                                size="large"
                            />
                        </Box>
                    </Stack>
                </Box>

                <Box sx={{ mt: 4 }}>
                    <TextField
                        label="Suggestions / Feedback"
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={suggestions}
                        onChange={(e) => setSuggestions(e.target.value)}
                        placeholder="Tell us what you liked or how we can improve..."
                    />
                </Box>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={submitting}
                        sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default FeedbackPage;
