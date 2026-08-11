import {
  DeliveryDining as DeliveryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enUS } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { ordersAPI } from '../../services/api';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const statusColor = (status: string): 'default' | 'success' | 'warning' | 'info' => {
  if (['delivered', 'completed'].includes(status)) return 'success';
  if (['on_the_way', 'ready_to_pickup'].includes(status)) return 'info';
  return 'warning';
};

const DeliveryHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const { formatCurrency } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let start: string | undefined;
      let end: string | undefined;
      if (dateFilter) {
        start = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate(), 0, 0, 0, 0).toISOString();
        end = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate(), 23, 59, 59, 999).toISOString();
      }
      const response = await ordersAPI.getDeliveryHistory(start, end);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching delivery history:', error);
      toast.error('Failed to load pickup history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [dateFilter]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeliveryIcon color="primary" />
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
            My Deliveries
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
            <DatePicker
              label="Filter by date"
              value={dateFilter}
              onChange={(newDate) => setDateFilter(newDate)}
              slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
            />
          </LocalizationProvider>
          <IconButton onClick={fetchHistory} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {dateFilter ? 'No deliveries found for this date.' : 'No deliveries found yet.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id} hover>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.customer?.name || '—'}</TableCell>
                  <TableCell>{order.deliveryAddress?.fullAddress || order.customer?.address?.street || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={order.status} color={statusColor(order.status)} />
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleTimeString()}</TableCell>
                  <TableCell align="right">{formatCurrency(order.total ?? order.subtotal ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default DeliveryHistoryPage;
