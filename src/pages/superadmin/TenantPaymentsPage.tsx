import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, CircularProgress, IconButton,
  Stack, Card, CardContent, Divider, TextField, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { superAdminPaymentsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const TenantPaymentsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = location.state?.tenant;

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalRefunds, setTotalRefunds] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async (p: number, rpp: number, sd: string, ed: string) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await superAdminPaymentsAPI.getTenantPlatformPayments(tenantId, {
        page: p + 1,
        limit: rpp,
        ...(sd ? { startDate: sd } : {}),
        ...(ed ? { endDate: ed } : {}),
      });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalAmount(res.data.totalAmount || 0);
      setTotalRefunds(res.data.totalRefunds || 0);
      setNetRevenue(res.data.netRevenue || 0);
    } catch {
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(page, rowsPerPage, startDate, endDate); }, [page, rowsPerPage, startDate, endDate, load]);

  const fmt = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const summaryCards = [
    { label: 'Total Gross', value: fmt(totalAmount), sub: 'all charged to customers', color: '#1976d2', border: '#1976d2' },
    { label: 'Total Refunds', value: fmt(totalRefunds), sub: 'refunded back to customers', color: '#ed6c02', border: '#ed6c02' },
    { label: 'Net Revenue', value: fmt(netRevenue), sub: 'gross minus refunds', color: '#2e7d32', border: '#2e7d32' },
    { label: 'Total Orders', value: String(total), sub: 'platform delivery orders', color: '#7c3aed', border: '#7c3aed' },
  ];

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 0.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/superadmin/tenants/${tenantId}`, { state: { tenant } })} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <PaymentIcon sx={{ mr: 1, color: '#1976d2' }} />
        <Typography variant="h5" fontWeight="bold">
          Platform Payments — {tenant?.name || 'Store'}
        </Typography>
      </Box>

      {/* Date range filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="From"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => { setPage(0); setStartDate(e.target.value); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={endDate}
          onChange={(e) => { setPage(0); setEndDate(e.target.value); }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
        />
      </Stack>

      {/* Summary cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {summaryCards.map((c) => (
          <Card key={c.label} elevation={2} sx={{ flex: '1 1 180px', borderRadius: 3, borderLeft: `4px solid ${c.border}` }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                {c.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: c.color }}>
                {c.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Provider</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Subtotal</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Delivery</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tip</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Tax</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Proc. Fee</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  <Tooltip title="Actual Stripe transaction fee (2.9% + $0.30)">
                    <span>Stripe Fee</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Gross</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Refunds</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }} align="right">Net</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No platform payments found for this store.</Typography>
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.orderId} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{row.orderNumber}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    <Typography variant="inherit" noWrap sx={{ maxWidth: 130 }}>{row.customerName}</Typography>
                    {row.customerEmail && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 130 }}>
                        {row.customerEmail}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.deliveryProvider ? (
                      <Chip label={row.deliveryProvider} size="small" variant="outlined" sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }} />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{fmt(row.subtotal)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{fmt(row.deliveryCharge)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{fmt(row.tip)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{fmt(row.tax)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{fmt(row.processingFee)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#d32f2f' }}>
                    {row.stripeFee > 0 ? `-${fmt(row.stripeFee)}` : fmt(0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'primary.main' }}>
                    {fmt(row.totalAmount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', color: row.refundTotal > 0 ? '#ed6c02' : 'text.secondary' }}>
                    {row.refundTotal > 0 ? `-${fmt(row.refundTotal)}` : fmt(0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#2e7d32' }}>
                    {fmt(row.netAmount)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.paymentStatus || row.status}
                      size="small"
                      color={
                        row.paymentStatus === 'paid' ? 'success' :
                        row.paymentStatus === 'refunded' ? 'warning' :
                        row.paymentStatus === 'partial' ? 'info' : 'default'
                      }
                      sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
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
    </Box>
  );
};

export default TenantPaymentsPage;
