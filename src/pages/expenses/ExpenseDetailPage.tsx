import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    Grid,
    IconButton,
    Divider,
    alpha,
    useTheme,
    Chip,
    Avatar,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Receipt as ReceiptIcon,
    Business as OrgIcon,
    Person as PersonIcon,
    Event as CalendarIcon,
    AttachMoney as MoneyIcon,
    Description as NoteIcon,
    LocalOffer as CategoryIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { expensesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const ExpenseDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    
    const [expense, setExpense] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExpense = async () => {
            try {
                const res = await expensesAPI.getOne(id!);
                setExpense(res.data.data);
            } catch (error) {
                toast.error('Failed to load expense details');
                navigate('/expenses');
            } finally {
                setLoading(false);
            }
        };
        fetchExpense();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Delete this record permanently?')) return;
        try {
            await expensesAPI.delete(id!);
            toast.success('Expense deleted');
            navigate('/expenses');
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
    if (!expense) return null;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
            <Stack direction="row" justifyContent="space-between" mb={4}>
                <Button startIcon={<BackIcon />} onClick={() => navigate(-1)}>Back</Button>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/expenses/edit/${id}`)}>Edit</Button>
                    <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>Delete</Button>
                </Stack>
            </Stack>

            <Grid container spacing={4}>
                {/* Primary Info */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                        <Box sx={{ position: 'absolute', top: 0, right: 0, p: 3 }}>
                             <Chip 
                                label={expense.status.toUpperCase()} 
                                color={expense.status === 'paid' ? 'success' : expense.status === 'pending' ? 'warning' : 'error'}
                                sx={{ fontWeight: 'bold' }}
                             />
                        </Box>

                        <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 56, height: 56 }}>
                                <ReceiptIcon fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={900}>#{expense.expenseNumber}</Typography>
                                <Typography variant="body2" color="text.secondary">Recorded on {new Date(expense.createdAt).toLocaleDateString()}</Typography>
                            </Box>
                        </Stack>

                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary" display="block">Category</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CategoryIcon fontSize="small" color="action" />
                                    <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{expense.category}</Typography>
                                </Stack>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary" display="block">Type</Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{expense.type.replace('_', ' ')}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary" display="block">Amount</Typography>
                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    {formatCurrency ? formatCurrency(expense.amount) : `$${expense.amount.toFixed(2)}`}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary" display="block">Due Date</Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CalendarIcon fontSize="small" color="action" />
                                    <Typography variant="body1" fontWeight="bold">{expense.dueDate ? new Date(expense.dueDate).toLocaleDateString() : 'N/A'}</Typography>
                                </Stack>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" fontWeight="bold" mb={2}>Payee Information</Typography>
                        <Stack direction="row" spacing={3} p={2} bgcolor={alpha(theme.palette.divider, 0.03)} borderRadius={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {expense.payee.type === 'organization' ? <OrgIcon color="action" /> : <PersonIcon color="action" />}
                                <Typography variant="body1">{expense.payee.name}</Typography>
                            </Stack>
                            <Chip label={expense.payee.type} size="small" variant="outlined" />
                        </Stack>

                        {expense.notes && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" fontWeight="bold" mb={1} display="flex" alignItems="center">
                                    <NoteIcon sx={{ mr: 1, fontSize: 20 }} /> Notes
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{expense.notes}</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Payments Section */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" mb={3} display="flex" alignItems="center">
                            <MoneyIcon sx={{ mr: 1, color: 'success.main' }} /> Payment History
                        </Typography>

                        {expense.payments?.map((payment: any, index: number) => (
                            <Card key={index} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Stack direction="row" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>{payment.method}</Typography>
                                        <Typography variant="body2" color="success.main" fontWeight="bold">
                                            {formatCurrency ? formatCurrency(payment.amount) : `$${payment.amount.toFixed(2)}`}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(payment.date).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}

                        {(!expense.payments || expense.payments.length === 0) && (
                            <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
                                <Typography variant="body2" color="text.secondary">No payments recorded</Typography>
                            </Box>
                        )}

                        <Box sx={{ mt: 4, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 3 }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2">Paid Total:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatCurrency ? formatCurrency(expense.payments.reduce((s: any, p: any) => s + p.amount, 0)) : `$${expense.payments.reduce((s: any, p: any) => s + p.amount, 0).toFixed(2)}`}
                                </Typography>
                            </Stack>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ExpenseDetailPage;
