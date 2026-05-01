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
  TablePagination,
  List,
  InputAdornment,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  Edit,
  Delete,
  History,
  Description,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Build,
  Assignment,
  DirectionsCar,
  Badge,
  Devices,
} from '@mui/icons-material';
import { assetsAPI } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AssetList: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') || '';

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryCounts, setCategoryCounts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [completionDialog, setCompletionDialog] = useState({
    open: false,
    type: 'service' as 'service' | 'renewal',
    assetId: '',
    assetName: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeFilter === 'expiring') params.status = 'expiring';
      if (activeFilter === 'expired') params.status = 'expired';
      if (activeFilter === 'service') params.status = 'service_due';
      if (activeFilter === 'service_soon') params.status = 'upcoming_service';
      if (typeFilter) params.type = typeFilter;

      const res = await assetsAPI.getAll(params);
      setAssets(res.data.data);
      setTotal(res.data.total);

      const countsRes = await assetsAPI.getCounts();
      setCategoryCounts(countsRes.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [activeFilter, typeFilter, debouncedSearch, page, rowsPerPage]);

  const getStatusChip = (asset: any) => {
    const now = new Date();
    
    // Check Expiry (Only if expires is true)
    if (asset.lifecycle.expires && asset.lifecycle.expiryDate) {
      const expiryDate = new Date(asset.lifecycle.expiryDate);
      if (expiryDate < now) {
        return <Chip icon={<ErrorIcon />} label="Expired" color="error" size="small" variant="filled" />;
      }
      
      const thirtyDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      if (expiryDate <= thirtyDays) {
        return <Chip icon={<Warning />} label="Expiring Soon" color="warning" size="small" variant="filled" />;
      }
    }

    // Check Service (Only if serviceRequired is true)
    if (asset.lifecycle.serviceRequired && asset.lifecycle.nextServiceDate) {
      if (new Date(asset.lifecycle.nextServiceDate) < now) {
        return <Chip icon={<Build />} label="Service Overdue" color="info" size="small" variant="filled" />;
      }
    }

    return <Chip icon={<CheckCircle />} label="Active" color="success" size="small" variant="filled" />;
  };

  const handleCompleteAction = async () => {
    try {
      if (completionDialog.type === 'service') {
        await assetsAPI.completeService(completionDialog.assetId, { date: completionDialog.date, cost: completionDialog.cost });
      } else {
        await assetsAPI.completeRenewal(completionDialog.assetId, { date: completionDialog.date, cost: completionDialog.cost });
      }
      toast.success(`${completionDialog.type === 'service' ? 'Service' : 'Renewal'} recorded successfully`);
      setCompletionDialog({ ...completionDialog, open: false });
      fetchAssets();
    } catch (error) {
      toast.error('Failed to record completion');
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vehicle': return <DirectionsCar />;
      case 'document': return <Description />;
      case 'license': return <Badge />;
      case 'gadget': return <Devices />;
      case 'equipment': return <Build />;
      default: return <Assignment />;
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(0);
  };

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type === typeFilter ? '' : type);
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="800">Asset Management</Typography>
          <Typography variant="body2" color="text.secondary">Manage and track your business assets</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/assets/new')}
          sx={{ borderRadius: 2 }}
        >
          Add Asset
        </Button>
      </Stack>

      {/* Insight Cards */}
      <Grid container spacing={2} mb={4}>
        {['Vehicle', 'Document', 'License', 'Gadget', 'Equipment', 'Other'].map((type) => {
          const count = categoryCounts?.find((b: any) => b.type === type)?.count || 0;
          const isActive = typeFilter === type;
          
          return (
            <Grid item xs={6} sm={4} md={2} key={type}>
              <Card 
                onClick={() => handleTypeFilterChange(type)}
                sx={{ 
                  cursor: 'pointer',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  border: isActive ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                  <Avatar 
                    sx={{ 
                      mx: 'auto', 
                      mb: 1, 
                      bgcolor: isActive ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1),
                      color: isActive ? '#fff' : theme.palette.primary.main,
                      width: 40,
                      height: 40
                    }}
                  >
                    {getAssetIcon(type)}
                  </Avatar>
                  <Typography variant="h6" fontWeight="800">{count}</Typography>
                  <Typography variant="caption" fontWeight="600" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {type}s
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Filters & Search */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search assets by name, tag or metadata..."
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
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="All Assets"
                  onClick={() => setActiveFilter('')}
                  color={activeFilter === '' ? 'primary' : 'default'}
                  variant={activeFilter === '' ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<Warning />}
                  label="Expiring Soon"
                  onClick={() => setActiveFilter('expiring')}
                  color={activeFilter === 'expiring' ? 'warning' : 'default'}
                  variant={activeFilter === 'expiring' ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<ErrorIcon />}
                  label="Expired"
                  onClick={() => setActiveFilter('expired')}
                  color={activeFilter === 'expired' ? 'error' : 'default'}
                  variant={activeFilter === 'expired' ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<Build />}
                  label="Service Due"
                  onClick={() => setActiveFilter('service')}
                  color={activeFilter === 'service' ? 'info' : 'default'}
                  variant={activeFilter === 'service' ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<Build />}
                  label="Service Soon"
                  onClick={() => setActiveFilter('service_soon')}
                  color={activeFilter === 'service_soon' ? 'success' : 'default'}
                  variant={activeFilter === 'service_soon' ? 'filled' : 'outlined'}
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
                <TableCell sx={{ fontWeight: 700 }}>Asset Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Next Milestone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">No assets found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow 
                    key={asset._id} 
                    hover 
                    onClick={() => navigate(`/assets/${asset._id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                          {getAssetIcon(asset.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="700">{asset.name}</Typography>
                          {/* <Typography variant="caption" color="text.secondary">{asset.tag}</Typography> */}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{asset.type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.lifecycle.expiryDate ? new Date(asset.lifecycle.expiryDate).toLocaleDateString() : 'Never'}
                      </Typography>
                      {(asset.type === 'Document' || asset.type === 'License') && asset.lifecycle.renewalRequired && asset.lifecycle.renewalFrequency && (
                        <Typography variant="caption" color="primary.main">
                          Renew: Every {asset.lifecycle.renewalFrequency} {asset.lifecycle.renewalUnit}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.type === 'Document' || asset.type === 'License' ? (
                        <>
                          <Typography variant="body2">
                            {asset.lifecycle.nextRenewalDate ? new Date(asset.lifecycle.nextRenewalDate).toLocaleDateString() : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Next Renewal</Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="body2">
                            {asset.lifecycle.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Next Service</Typography>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(asset)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {asset.lifecycle.serviceRequired && (
                          <Tooltip title="Complete Service">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompletionDialog({ ...completionDialog, open: true, type: 'service', assetId: asset._id, assetName: asset.name });
                              }}
                            >
                              <Build />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(asset.type === 'Document' || asset.type === 'License') && asset.lifecycle.renewalRequired && (
                          <Tooltip title="Complete Renewal">
                            <IconButton 
                              size="small" 
                              color="warning" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompletionDialog({ ...completionDialog, open: true, type: 'renewal', assetId: asset._id, assetName: asset.name });
                              }}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View History">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assets/${asset._id}`);
                            }}
                          >
                            <History />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assets/${asset._id}/edit`);
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

      {/* Completion Dialog */}
      <Dialog open={completionDialog.open} onClose={() => setCompletionDialog({ ...completionDialog, open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>
          Record {completionDialog.type}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" mb={2}>
              Recording completion for <strong>{completionDialog.assetName}</strong>. 
              The next {completionDialog.type} date will be automatically calculated based on frequency.
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Completion Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={completionDialog.date}
                onChange={(e) => setCompletionDialog({ ...completionDialog, date: e.target.value })}
              />
              <TextField
                fullWidth
                label="Total Cost"
                type="number"
                value={completionDialog.cost}
                onChange={(e) => setCompletionDialog({ ...completionDialog, cost: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCompletionDialog({ ...completionDialog, open: false })}>Cancel</Button>
          <Button variant="contained" onClick={handleCompleteAction}>Record & Schedule Next</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetList;
