import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, CircularProgress, IconButton,
  Stack, Card, CardContent, Divider, TextField, MenuItem, Select, FormControl, InputLabel,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import SyncIcon from '@mui/icons-material/Sync';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { superAdminPaymentsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { getStatusLabel, getStatusColor, getOrderTypeLabel } from '../../utils/orderWorkflows';
import OrderDetailsDialog from '../../components/OrderDetailsDialog';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const TenantOrdersPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = location.state?.tenant;

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalProcessingFee, setTotalProcessingFee] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const fetch = useCallback(async (p: number, rpp: number, s: string, q: string, sd: string, ed: string) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await superAdminPaymentsAPI.getTenantOrders(tenantId, {
        page: p + 1,
        limit: rpp,
        status: s,
        search: q,
        startDate: sd || undefined,
        // include the whole end day
        endDate: ed ? `${ed}T23:59:59.999` : undefined,
      });
      setRows(res.data.orders || []);
      setTotal(res.data.total || 0);
      setTotalProcessingFee(res.data.totalProcessingFee || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(page, rowsPerPage, status, search, startDate, endDate);
    }, 500);
    return () => clearTimeout(timer);
  }, [page, rowsPerPage, status, search, startDate, endDate, fetch]);

  const fmt = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleString() : '-';

  if (loading && rows.length === 0) {
    return <TableSkeleton rows={8} columns={9} />;
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 0.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate(`/superadmin/tenants/${tenantId}`, { state: { tenant } })} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <ShoppingBagIcon sx={{ mr: 1, color: '#ed6c02' }} />
          <Typography variant="h5" fontWeight="bold">
            Manage Orders — {tenant?.name || 'Store'}
          </Typography>
        </Box>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, minWidth: 220 }}>
          <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Processing Fee
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {fmt(totalProcessingFee)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Search Order #, Customer"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="served">Served</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="From"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => { setPage(0); setStartDate(e.target.value); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => { setPage(0); setEndDate(e.target.value); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          {(startDate || endDate) && (
            <Chip
              label="Clear dates"
              size="small"
              onClick={() => { setStartDate(''); setEndDate(''); setPage(0); }}
              onDelete={() => { setStartDate(''); setEndDate(''); setPage(0); }}
            />
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Processing</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Delivery</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No orders found for this store.</Typography>
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow 
                  key={row._id} 
                  hover 
                  onClick={() => {
                    setSelectedOrder(row);
                    setDetailsDialogOpen(true);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{row.orderNumber}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Chip label={getOrderTypeLabel(row.orderType, row)} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Typography variant="inherit" noWrap sx={{ maxWidth: 140 }}>{row.customer?.name || 'Guest'}</Typography>
                    {row.customer?.phone && <Typography variant="caption" color="text.secondary" display="block">{row.customer.phone}</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>
                    <Tooltip
                      title={
                        <Stack spacing={0.4} sx={{ py: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <span>Subtotal</span><span>{fmt(row.subtotal)}</span>
                          </Box>
                          {row.tax?.amount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Tax</span><span>{fmt(row.tax.amount)}</span>
                            </Box>
                          )}
                          {row.processingFee > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Processing Fee</span><span>{fmt(row.processingFee)}</span>
                            </Box>
                          )}
                          {row.serviceCharge?.amount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Service Charge ({row.serviceCharge.rate}%)</span><span>{fmt(row.serviceCharge.amount)}</span>
                            </Box>
                          )}
                          {row.discount?.amount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Discount{row.discount?.couponCode ? ` (${row.discount.couponCode})` : ''}</span><span>-{fmt(row.discount.amount)}</span>
                            </Box>
                          )}
                          {row.rewardDiscount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Points Discount</span><span>-{fmt(row.rewardDiscount)}</span>
                            </Box>
                          )}
                          {row.deliveryCharge > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Delivery Charge</span><span>{fmt(row.deliveryCharge)}</span>
                            </Box>
                          )}
                          {row.tip > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <span>Tip</span><span>{fmt(row.tip)}</span>
                            </Box>
                          )}
                          <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 0.3 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
                            <span>Total</span><span>{fmt(row.totalAmount)}</span>
                          </Box>
                        </Stack>
                      }
                      arrow
                      placement="left"
                    >
                      <Box component="span" sx={{ borderBottom: '1px dashed', borderColor: 'primary.main', cursor: 'help' }}>
                        {fmt(row.totalAmount)}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(row.processingFee)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(row.status)}
                      size="small"
                      color={getStatusColor(row.status) as any}
                      sx={{ fontSize: '0.68rem', textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.uberEatsDeliveryId || row.doordashDeliveryId ? (
                      <Tooltip title={row.uberEatsDeliveryId ? "Uber Eats" : "DoorDash"}>
                        <Chip 
                          label={row.uberEatsDeliveryId ? 'Uber' : 'DoorDash'} 
                          size="small" 
                          color="info" 
                          variant="outlined"
                          icon={<SyncIcon sx={{ fontSize: '0.8rem !important' }} />}
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.paymentStatus || 'Unpaid'}
                      size="small"
                      variant="outlined"
                      color={row.paymentStatus === 'paid' ? 'success' : 'default'}
                      sx={{ fontSize: '0.68rem', textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      {selectedOrder && (
        <OrderDetailsDialog
          open={detailsDialogOpen}
          order={selectedOrder}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedOrder(null);
          }}
          onUpdate={() => {
            fetch(page, rowsPerPage, status, search, startDate, endDate);
          }}
        />
      )}
    </Box>
  );
};

export default TenantOrdersPage;
