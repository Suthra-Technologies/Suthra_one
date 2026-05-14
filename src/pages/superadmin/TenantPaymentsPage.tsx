import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, CircularProgress, IconButton,
  Stack, Card, CardContent, Divider,
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (p: number, rpp: number) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await superAdminPaymentsAPI.getTenantPlatformPayments(tenantId, { page: p + 1, limit: rpp });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalAmount(res.data.totalAmount || 0);
    } catch {
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetch(page, rowsPerPage); }, [page, rowsPerPage, fetch]);

  const fmt = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleString() : '-';

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

      {/* Summary cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card elevation={2} sx={{ flex: 1, borderRadius: 3, borderLeft: '4px solid #1976d2' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Received
            </Typography>
            <Typography variant="h4" fontWeight={800} color="primary">
              {fmt(totalAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">all-time delivery payments</Typography>
          </CardContent>
        </Card>
        <Card elevation={2} sx={{ flex: 1, borderRadius: 3, borderLeft: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Orders
            </Typography>
            <Typography variant="h4" fontWeight={800} color="success.main">
              {total}
            </Typography>
            <Typography variant="caption" color="text.secondary">delivery orders via platform</Typography>
          </CardContent>
        </Card>
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
                <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No platform payments found for this store.</Typography>
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.orderId} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{row.orderNumber}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Typography variant="inherit" noWrap sx={{ maxWidth: 140 }}>{row.customerName}</Typography>
                    {row.customerEmail && <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 140 }}>{row.customerEmail}</Typography>}
                  </TableCell>
                  <TableCell>
                    {row.deliveryProvider ? (
                      <Chip label={row.deliveryProvider} size="small" variant="outlined" sx={{ fontSize: '0.68rem', textTransform: 'capitalize' }} />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(row.subtotal)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(row.deliveryCharge)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(row.tip)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.78rem' }}>{fmt(row.tax)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>{fmt(row.totalAmount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.paymentStatus || row.status}
                      size="small"
                      color={row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'refunded' ? 'warning' : 'default'}
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
    </Box>
  );
};

export default TenantPaymentsPage;
