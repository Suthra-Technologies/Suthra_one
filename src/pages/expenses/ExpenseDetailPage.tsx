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
    CardContent,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Box as BoxComponent
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
    LocalOffer as CategoryIcon,
    History as HistoryIcon,
    Build as BuildIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { expensesAPI, usersAPI } from '../../services/api';
import { getCurrentUser } from '../../services/authService';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <BoxComponent sx={{ py: 3 }}>{children}</BoxComponent>}
        </div>
    );
}

const ExpenseDetailPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    
    const [expense, setExpense] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [userEmails, setUserEmails] = useState<{[key: string]: string}>({});
    const [historyLoading, setHistoryLoading] = useState(false);
    const [usingSampleData, setUsingSampleData] = useState(false);

    const getUserEmail = async (userId: string): Promise<string> => {
        // Return cached email if already fetched
        if (userEmails[userId]) {
            return userEmails[userId];
        }

        // Handle system user immediately
        if (userId === 'system') {
            setUserEmails(prev => ({ ...prev, ['system']: 'System' }));
            return 'System';
        }

        // Skip if userId is empty or null
        if (!userId || userId === 'undefined' || userId === 'null') {
            return 'System';
        }

        try {
            const res = await usersAPI.getUser(userId);
            const email = res.data?.email || 'Unknown';
            
            // Cache the email for future use
            setUserEmails(prev => ({ ...prev, [userId]: email }));
            
            return email;
        } catch (error) {
            console.error('Error fetching user email:', error);
            // Cache the failure to avoid repeated failed requests
            setUserEmails(prev => ({ ...prev, [userId]: 'Unknown' }));
            return 'Unknown';
        }
    };

    useEffect(() => {
        const fetchExpense = async () => {
            try {
                // Fetch expense details first
                const expenseRes = await expensesAPI.getOne(id!);
                setExpense(expenseRes.data.data);

                // Use history from the main expense data (no separate API call)
                const expenseData = expenseRes.data.data;
                const expenseHistory = expenseData.history || [];
                setHistory(expenseHistory);
                setUsingSampleData(false);
                setHistoryLoading(false);

                // Pre-fetch user emails for all history items (only if performedByName is not available)
                const userIds = [...new Set(expenseHistory.map((item: any) => item.performedBy).filter(Boolean))] as string[];
                const emailPromises = userIds.map(async (userId) => {
                    if (userId && userId !== 'undefined' && userId !== 'null') {
                        await getUserEmail(userId);
                    }
                });
                
                // Wait for all email fetches to complete (but don't block the UI)
                Promise.allSettled(emailPromises);

                // Check if URL has history hash and set tab accordingly
                if (window.location.hash === '#history') {
                    setTabValue(1);
                }
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
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2 }}>
                                <Tab label="Details" />
                                <Tab label="History" />
                            </Tabs>
                        </Box>
                        
                        <Box sx={{
                            p: 3,
                            maxHeight: 400, 
                            overflowY: 'auto',
                            pr: 1,
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: alpha(theme.palette.divider, 0.05),
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: alpha(theme.palette.text.secondary, 0.3),
                                borderRadius: '4px',
                                '&:hover': {
                                    background: alpha(theme.palette.text.secondary, 0.5),
                                },
                            },
                        }}>
                            <TabPanel value={tabValue} index={0}>
                                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                                    <Box sx={{ position: 'absolute', top: 0, right: 0, p: 3 }}>
                                        <Chip 
                                            label={expense.status?.toUpperCase()} 
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
                                </Box>
                            </TabPanel>

                            <TabPanel value={tabValue} index={1}>
                                                                {historyLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {history.map((item, idx) => (
                                        <React.Fragment key={idx}>
                                            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                                <ListItemIcon sx={{ mt: 1 }}>
                                                    {item.type === 'create' ? <HistoryIcon color="primary" /> : item.type === 'status_change' ? <InfoIcon color="info" /> : item.type === 'payment' ? <CheckCircleIcon color="success" /> : item.type === 'edit' ? <BuildIcon color="warning" /> : <HistoryIcon />}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="subtitle1" fontWeight="700">
                                                                {item.type === 'create' ? 'Expense Created' : item.type === 'status_change' ? 'Status Changed' : item.type === 'payment' ? 'Payment Recorded' : 'Action Update'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(item.date).toLocaleDateString()}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <Box mt={0.5}>
                                                            <Typography variant="body2" color="text.primary">{item.description}</Typography>
                                                            {(item.details?.oldValues && item.details?.newValues && (
    (item.details.oldValues.amount !== item.details.newValues.amount ||
    item.details.oldValues.category !== item.details.newValues.category ||
    item.details.oldValues.payeeName !== item.details.newValues.payeeName)
)) && (
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                                        Changes:
                                                                    </Typography>
                                                                    {item.details.oldValues.amount !== item.details.newValues.amount && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 2, color: 'text.secondary' }}>
                                                                            Amount: ${formatCurrency ? formatCurrency(item.details.oldValues.amount) : `$${item.details.oldValues.amount?.toFixed(2) || '0.00'}`} → ${formatCurrency ? formatCurrency(item.details.newValues.amount) : `$${item.details.newValues.amount?.toFixed(2) || '0.00'}`}
                                                                        </Typography>
                                                                    )}
                                                                    {item.details.oldValues.category !== item.details.newValues.category && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 2, color: 'text.secondary' }}>
                                                                            Category: {item.details.oldValues.category || 'N/A'} → {item.details.newValues.category || 'N/A'}
                                                                        </Typography>
                                                                    )}
                                                                    {item.details.oldValues.payeeName !== item.details.newValues.payeeName && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 2, color: 'text.secondary' }}>
                                                                            Payee: {item.details.oldValues.payeeName || 'N/A'} → {item.details.newValues.payeeName || 'N/A'}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            )}
                                                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                                                Performed by: {item.performedBy === 'system' ? 'System' : getCurrentUser()?.email || 'Unknown'}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < history.length - 1 && <Divider variant="inset" component="li" />}
                                        </React.Fragment>
                                    ))}
                                    {history.length === 0 && (
                                            <Box textAlign="center" py={5}>
                                                <Typography color="text.secondary">No history recorded for this expense yet.</Typography>
                                            </Box>
                                        )}
                                    </List>
                                )}
                            </TabPanel>
                        </Box>
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
