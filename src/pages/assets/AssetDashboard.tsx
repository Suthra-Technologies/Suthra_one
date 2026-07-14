import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  useTheme,
  alpha,
  Stack,
  Chip,
  Avatar,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Assignment,
  Warning,
  Error as ErrorIcon,
  Build,
  Add,
  History,
  Description,
  DirectionsCar,
  Badge,
  Devices,
  Settings,
  Event,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { assetsAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// --- StatCard Component (Styled for Assets) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, onClick }) => {
  const theme = useTheme();
  const themeColor = (theme.palette as any)[color]?.main || theme.palette.primary.main;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(themeColor, 0.08)} 0%, ${alpha(themeColor, 0.03)} 100%)`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(themeColor, 0.1)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: onClick ? 'translateY(-6px)' : 'none',
          boxShadow: `0 12px 24px ${alpha(themeColor, 0.15)}`,
          '& .icon-bg': { transform: 'scale(1.2) rotate(10deg)', opacity: 0.1 }
        },
      }}
    >
      <Box className="icon-bg" sx={{
        position: 'absolute', right: -15, bottom: -15, opacity: 0.05,
        transition: 'all 0.5s ease', color: themeColor, '& svg': { fontSize: 120 }
      }}>
        {icon}
      </Box>
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: alpha(themeColor, 0.1), color: themeColor, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: 'text.secondary' }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: themeColor }}>
              {value}
            </Typography>
          </Box>
        </Stack>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const AssetDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [tabData, setTabData] = useState<any>({ data: [], total: 0, page: 1, loading: false });

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await assetsAPI.getInsights();
      setInsights(res.data);
    } catch (error) {
      console.error('Error fetching asset insights:', error);
      toast.error('Failed to load asset insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (status: string, page: number) => {
    setTabData((prev: any) => ({ ...prev, loading: true }));
    try {
      const res = await assetsAPI.getAll({ status, page, limit: 5 });
      setTabData({
        data: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching tab data:', error);
      setTabData((prev: any) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service'];
    fetchTabData(statuses[tabValue], 1);
  }, [tabValue]);

  const getAssetIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'vehicle': return <DirectionsCar />;
      case 'document': return <Description />;
      case 'license': return <Badge />;
      case 'gadget': return <Devices />;
      case 'equipment': return <Build />;
      default: return <Assignment />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            Asset & Document Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Actionable insights and lifecycle tracking
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <IconButton onClick={fetchInsights} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/assets/new')}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Add New Asset
          </Button>
        </Stack>
      </Stack>

      {/* Actionable Insights Cards */}
      <Grid container spacing={3} mb={6}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Assets"
            value={insights?.summary?.total || 0}
            icon={<Assignment />}
            color="primary"
            subtitle="Tracked items across all categories"
            onClick={() => navigate('/assets')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Expiring Soon"
            value={insights?.summary?.expiringSoon || 0}
            icon={<Warning />}
            color="warning"
            subtitle="Renewal due within 5 days"
            onClick={() => { setTabValue(1); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Expired"
            value={insights?.summary?.expired || 0}
            icon={<ErrorIcon />}
            color="error"
            subtitle="Assets requiring immediate attention"
            onClick={() => { setTabValue(0); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Service Due"
            value={insights?.summary?.maintenanceDue || 0}
            icon={<Build />}
            color="info"
            subtitle="Assets with overdue maintenance"
            onClick={() => { setTabValue(2); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Upcoming Services"
            value={insights?.summary?.upcomingServices || 0}
            icon={<Event />}
            color="success"
            subtitle="Service due within 5 days"
            onClick={() => { setTabValue(3); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
          />
        </Grid>
      </Grid>

      {/* Lifecycle Tasks Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" fontWeight="700" mb={3}>
          Lifecycle Tasks & Critical Attention
        </Typography>
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 2 }}
            >
              <Tab label={`Expired (${insights?.summary?.expired || 0})`} />
              <Tab label={`Expiring Soon (${insights?.summary?.expiringSoon || 0})`} />
              <Tab label={`Service Due (${insights?.summary?.maintenanceDue || 0})`} />
              <Tab label={`Upcoming Services (${insights?.summary?.upcomingServices || 0})`} />
            </Tabs>
          </Box>
          <CardContent sx={{ p: 0 }}>
            {tabData.loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                {isMobile ? (
                  <Stack spacing={2} sx={{ p: 2 }}>
                    {tabData.data.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No assets found in this category</Typography>
                      </Box>
                    ) : (
                      tabData.data.map((asset: any) => (
                        <Card
                          key={asset._id}
                          onClick={() => navigate(`/assets/${asset._id}/edit`)}
                          sx={{
                            borderRadius: 3,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                            transition: 'box-shadow 0.2s',
                            '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.13)' },
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.primary.main,
                                  width: 40, height: 40, flexShrink: 0,
                                }}
                              >
                                {getAssetIcon(asset.type)}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight="700" noWrap>{asset.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{asset.type}</Typography>
                              </Box>
                              <Chip
                                label={tabValue === 0 ? 'Expired' : tabValue === 2 ? 'Overdue' : 'Due Soon'}
                                size="small"
                                color={tabValue % 2 === 0 ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            </Stack>

                            <Divider sx={{ mb: 1.5 }} />

                            <Grid container spacing={1} alignItems="center">
                              <Grid item xs={8}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                  Relevant Date
                                </Typography>
                                <Typography variant="body2">
                                  {tabValue < 2 ? (
                                    asset.lifecycle?.expiryDate ? new Date(asset.lifecycle.expiryDate).toLocaleDateString() : 'N/A'
                                  ) : (
                                    asset.lifecycle?.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'
                                  )}
                                </Typography>
                              </Grid>
                              <Grid item xs={4} textAlign="right">
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/assets/${asset._id}/edit`);
                                  }}
                                >
                                  View
                                </Button>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Stack>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Asset Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Relevant Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tabData.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">No assets found in this category</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          tabData.data.map((asset: any) => (
                            <TableRow key={asset._id} hover>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="700">{asset.name}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getAssetIcon(asset.type)}
                                  label={asset.type}
                                  size="small"
                                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                                />
                              </TableCell>
                              <TableCell>
                                {tabValue < 2 ? (
                                  asset.lifecycle?.expiryDate ? new Date(asset.lifecycle.expiryDate).toLocaleDateString() : 'N/A'
                                ) : (
                                  asset.lifecycle?.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={tabValue === 0 ? 'Expired' : tabValue === 2 ? 'Overdue' : 'Due Soon'}
                                  size="small"
                                  color={tabValue % 2 === 0 ? 'error' : 'warning'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => navigate(`/assets/${asset._id}/edit`)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {tabData.total > 5 && (
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
                    <Pagination
                      count={Math.ceil(tabData.total / 5)}
                      page={tabData.page}
                      onChange={(_, page) => {
                        const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service'];
                        fetchTabData(statuses[tabValue], page);
                      }}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Breakdown and Quick Actions */}
      <Grid container spacing={3}>
        {/* Type Breakdown */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="700" mb={3}>
                Asset Distribution
              </Typography>
              <Grid container spacing={2}>
                {insights?.breakdown?.map((item: any) => (
                  <Grid item xs={6} sm={4} key={item.type}>
                    <Box sx={{
                      p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05),
                      display: 'flex', alignItems: 'center', gap: 2, border: '1px solid transparent',
                      transition: 'all 0.2s', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), borderColor: alpha(theme.palette.primary.main, 0.2) }
                    }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, color: '#fff', width: 32, height: 32 }}>
                        {getAssetIcon(item.type)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="700">{item.type}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.count} items</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions / Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%', bgcolor: theme.palette.background.paper }}>
            <CardContent>
              <Typography variant="h6" fontWeight="700" mb={3}>
                Quick Links
              </Typography>
              <Stack spacing={2}>
                <Button fullWidth variant="outlined" startIcon={<History />} onClick={() => navigate('/assets')}>
                  View All History
                </Button>
                <Button fullWidth variant="outlined" startIcon={<Settings />} onClick={() => navigate('/settings')}>
                  Asset Categories
                </Button>
                <Button fullWidth variant="outlined" startIcon={<Badge />}>
                  Export Asset Report
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssetDashboard;
