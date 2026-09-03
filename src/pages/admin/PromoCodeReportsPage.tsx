import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { format } from 'date-fns';
import {
  Refresh,
  Download,
  LocalOffer,
  Receipt,
  Stars,
  Assessment,
  FilterList,
} from '@mui/icons-material';
import { reportsAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import { DashboardSkeleton } from '../../components/common/PageSkeleton';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PromoCodeReportsPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // States for filters
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [promoType, setPromoType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // States for data
  const [summary, setSummary] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [compensation, setCompensation] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate, promoType, promoCode: searchTerm };
      
      const [summaryRes, redemptionsRes, compensationRes] = await Promise.all([
        reportsAPI.getPromoSummary(params),
        reportsAPI.getPromoRedemptions(params),
        reportsAPI.getPromoCompensation(params),
      ]);

      setSummary(summaryRes.data);
      setRedemptions(redemptionsRes.data);
      setCompensation(compensationRes.data);
    } catch (error) {
      console.error('Error fetching promo reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Implement excel export if needed
    toast.success('Exporting summary to Excel...');
  };

  const renderSummary = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Codes Created (Total)</Typography>
            <Typography variant="h4" fontWeight="bold">{summary?.totalCreated || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Redemptions (Period)</Typography>
            <Typography variant="h4" fontWeight="bold">{summary?.redemptionCount || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Value Saved</Typography>
            <Typography variant="h4" fontWeight="bold">{formatCurrency(summary?.totalRedeemedValue || 0)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Avg. Saving per Order</Typography>
            <Typography variant="h4" fontWeight="bold">
              {summary?.redemptionCount > 0 
                ? formatCurrency(summary.totalRedeemedValue / summary.redemptionCount) 
                : formatCurrency(0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Top Performing Promos</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.topPromos || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="count" fill="#4F46E5" name="Redemptions" />
                <Bar dataKey="value" fill="#10B981" name="Value Saved ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Redemption Rate</Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* Placeholder for Pie Chart */}
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                        { name: 'Used', value: summary?.redemptionCount || 0 },
                        { name: 'Unused', value: Math.max(0, (summary?.totalCreated * 10) - (summary?.redemptionCount || 0)) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[0, 1].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
             </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderRedemptions = () => (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Order #</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Promo Code</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Redeemed At</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Order Total</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Discount</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {redemptions.map((row) => (
            <TableRow key={row._id} hover>
              <TableCell>{row.orderNumber}</TableCell>
              <TableCell>
                <Chip label={row.couponCode} size="small" color="primary" variant="outlined" />
              </TableCell>
              <TableCell>{format(new Date(row.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
              <TableCell>{row.customer?.name || 'Guest'}</TableCell>
              <TableCell>{formatCurrency(row.totalAmount)}</TableCell>
              <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                -{formatCurrency(row.discount?.amount || 0)}
              </TableCell>
              <TableCell>
                <Chip 
                  label={row.status} 
                  size="small" 
                  color={row.status === 'completed' ? 'success' : 'default'} 
                />
              </TableCell>
            </TableRow>
          ))}
          {redemptions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">No redemptions found for this period</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCompensation = () => (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
            <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Count</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Value</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {compensation.map((row, i) => (
                    <TableRow key={i} hover>
                        <TableCell>{row._id || 'Support Resolution'}</TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                            {formatCurrency(row.totalValue)}
                        </TableCell>
                    </TableRow>
                ))}
                {compensation.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} align="center">No compensation data found</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalOffer fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" fontWeight="bold">Promo Code Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Analyze promo performance, redemptions, and compensation.
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />} 
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Promo Type</InputLabel>
              <Select
                value={promoType}
                label="Promo Type"
                onChange={(e) => setPromoType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="campaign">Marketing</MenuItem>
                <MenuItem value="compensation">Goodwill</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by Code or Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                endAdornment: (
                  <IconButton onClick={fetchData}>
                    <FilterList />
                  </IconButton>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} aria-label="report tabs">
          <Tab icon={<Assessment sx={{ mr: 1 }} />} iconPosition="start" label="Summary Report" />
          <Tab icon={<Receipt sx={{ mr: 1 }} />} iconPosition="start" label="Detailed Redemptions" />
          <Tab icon={<Stars sx={{ mr: 1 }} />} iconPosition="start" label="Compensation" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {activeTab === 0 && renderSummary()}
            {activeTab === 1 && renderRedemptions()}
            {activeTab === 2 && renderCompensation()}
          </>
        )}
      </Box>
    </Container>
  );
};

export default PromoCodeReportsPage;
