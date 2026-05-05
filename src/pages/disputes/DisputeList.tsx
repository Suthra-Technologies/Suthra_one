import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  useTheme,
  alpha,
  CircularProgress,
  InputAdornment,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Gavel,
  Error as ErrorIcon,
  CheckCircle,
  Help,
  Visibility,
  History,
  PriorityHigh,
} from '@mui/icons-material';
import { disputesAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const DisputeList: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (activeFilter) params.status = activeFilter;

      const res = await disputesAPI.getAll(params);
      setDisputes(res.data);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDisputes();
    }, 500);
    return () => clearTimeout(handler);
  }, [search, activeFilter]);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'open':
        return <Chip icon={<PriorityHigh />} label="Open" color="error" size="small" />;
      case 'under_investigation':
        return <Chip icon={<History />} label="Investigating" color="warning" size="small" />;
      case 'resolution_pending':
        return <Chip icon={<Help />} label="Pending" color="info" size="small" />;
      case 'resolved':
        return <Chip icon={<CheckCircle />} label="Resolved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<ErrorIcon />} label="Rejected" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="800">Dispute Management</Typography>
          <Typography variant="body2" color="text.secondary">Review and resolve customer claims and financial disputes</Typography>
        </Box>
        <Avatar sx={{ bgcolor: theme.palette.error.main, width: 56, height: 56, boxShadow: 3 }}>
          <Gavel sx={{ fontSize: 32 }} />
        </Avatar>
      </Stack>

      {/* Filters & Search */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by order number or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="All"
                  onClick={() => setActiveFilter('')}
                  color={activeFilter === '' ? 'primary' : 'default'}
                  variant={activeFilter === '' ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Open"
                  onClick={() => setActiveFilter('open')}
                  color={activeFilter === 'open' ? 'error' : 'default'}
                  variant={activeFilter === 'open' ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Investigating"
                  onClick={() => setActiveFilter('under_investigation')}
                  color={activeFilter === 'under_investigation' ? 'warning' : 'default'}
                  variant={activeFilter === 'under_investigation' ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Resolved"
                  onClick={() => setActiveFilter('resolved')}
                  color={activeFilter === 'resolved' ? 'success' : 'default'}
                  variant={activeFilter === 'resolved' ? 'filled' : 'outlined'}
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Initiated</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">No disputes found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                disputes.map((dispute) => (
                  <TableRow
                    key={dispute._id}
                    hover
                    onClick={() => navigate(`/disputes/${dispute._id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="700">#{dispute.orderNumber}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{getReasonLabel(dispute.reason)}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dispute.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600">${dispute.disputedAmount.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{new Date(dispute.createdAt).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(dispute.status)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/disputes/${dispute._id}`);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default DisputeList;
