
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
    const [rating, setRating] = useState<number | null>(0);
    const [hoverRating, setHoverRating] = useState<number>(-1);
    const [suggestions, setSuggestions] = useState('');

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
        } catch (error) {
            console.error(error);
            toast.error('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const ratingLabels: Record<number, string> = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent!'
    };

    const activeRating = hoverRating !== -1 ? hoverRating : (rating || 0);

    const handleSubmit = async () => {
        if (!rating) {
            toast.error('Please select a star rating for your experience');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                orderId,
                rating,
                overallRating: rating,
                serviceRating: rating,
                ambianceRating: rating,
                suggestions,
                itemRatings: []
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
                <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                    <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>Thank You!</Typography>
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
        <Container maxWidth="sm" sx={{ py: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
                <Typography variant="overline" display="block" align="center" color="primary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
                    RATE YOUR EXPERIENCE
                </Typography>
                <Typography variant="h5" gutterBottom align="center" fontWeight="bold" sx={{ mt: 0.5 }}>
                    Order #{order.orderNumber}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Box display="flex" flexDirection="column" alignItems="center" my={3}>
                    <Typography variant="subtitle1" fontWeight="600" color="text.primary" gutterBottom>
                        How was your overall experience?
                    </Typography>
                    
                    <Rating
                        name="overall-rating"
                        value={rating}
                        precision={1}
                        onChange={(_, val) => setRating(val)}
                        onChangeActive={(_, newHover) => setHoverRating(newHover)}
                        icon={<StarIcon sx={{ fontSize: { xs: 44, sm: 52 }, color: '#faaf00' }} />}
                        emptyIcon={<StarIcon sx={{ fontSize: { xs: 44, sm: 52 }, color: '#e0e0e0' }} />}
                    />

                    <Typography variant="body2" sx={{ mt: 1.5, minHeight: 24, fontWeight: 700, color: activeRating > 0 ? 'primary.main' : 'text.secondary' }}>
                        {activeRating > 0 ? ratingLabels[activeRating] : 'Tap a star to rate'}
                    </Typography>
                </Box>

                <Box sx={{ mt: 3 }}>
                    <TextField
                        label="Comments or suggestions (Optional)"
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={suggestions}
                        onChange={(e) => setSuggestions(e.target.value)}
                        placeholder="Tell us what you liked or how we can make your next visit even better..."
                    />
                </Box>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={handleSubmit}
                        disabled={submitting}
                        sx={{ py: 1.8, fontSize: '1.1rem', fontWeight: 700, borderRadius: 2 }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default FeedbackPage;
