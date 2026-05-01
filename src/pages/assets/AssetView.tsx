import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  IconButton,
  Chip,
  Divider,
  Tabs,
  Tab,
  Paper,
  Avatar,
  useTheme,
  alpha,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Build,
  History,
  Description,
  Visibility,
  CloudUpload,
  Info,
  Close,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Schedule,
  DirectionsCar,
  Badge,
  Devices,
  Assignment,
  AttachMoney,
  CalendarMonth,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { assetsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AssetView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
  
  // Completion Dialog State
  const [completionDialog, setCompletionDialog] = useState({
    open: false,
    type: 'service' as 'service' | 'renewal',
    date: new Date().toISOString().split('T')[0],
    cost: 0
  });

  // Preview Dialog State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const fetchAssetDetails = async () => {
    setLoading(true);
    try {
      const res = await assetsAPI.getOne(id!);
      setAsset(res.data);
      
      const historyRes = await assetsAPI.getHistory(id!);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Failed to load asset details');
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAssetDetails();
  }, [id]);

  const handleCompleteAction = async () => {
    try {
      if (completionDialog.type === 'service') {
        await assetsAPI.completeService(id!, { date: completionDialog.date, cost: completionDialog.cost });
      } else {
        await assetsAPI.completeRenewal(id!, { date: completionDialog.date, cost: completionDialog.cost });
      }
      toast.success(`${completionDialog.type === 'service' ? 'Service' : 'Renewal'} recorded successfully`);
      setCompletionDialog({ ...completionDialog, open: false });
      fetchAssetDetails();
    } catch (error) {
      toast.error('Failed to record completion');
    }
  };

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

  const getStatusDisplay = (asset: any) => {
    const now = new Date();
    
    // Check Expiry (Only if expires is true)
    if (asset.lifecycle.expires && asset.lifecycle.expiryDate) {
      const expiryDate = new Date(asset.lifecycle.expiryDate);
      if (expiryDate < now) {
        return { label: 'Expired', color: 'error', icon: <ErrorIcon /> };
      }
      
      const thirtyDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      if (expiryDate <= thirtyDays) {
        return { label: 'Expiring Soon', color: 'warning', icon: <Warning /> };
      }
    }

    // Check Service (Only if serviceRequired is true)
    if (asset.lifecycle.serviceRequired && asset.lifecycle.nextServiceDate) {
      if (new Date(asset.lifecycle.nextServiceDate) < now) {
        return { label: 'Service Overdue', color: 'info', icon: <Build /> };
      }
    }

    return { label: 'Active', color: 'success', icon: <CheckCircle /> };
  };

  if (loading) {
    return (
      <Box sx={{ p: 10, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const status = getStatusDisplay(asset);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => navigate('/assets')}>
            <ArrowBack />
          </IconButton>
          <Avatar 
            sx={{ 
              width: 56, 
              height: 56, 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main
            }}
          >
            {getAssetIcon(asset.type)}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="800">{asset.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={asset.type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              <Chip icon={status.icon} label={status.label} color={status.color as any} size="small" />
            </Stack>
          </Box>
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Edit />} variant="outlined" onClick={() => navigate(`/assets/${id}/edit`)}>Edit</Button>
          <Button startIcon={<Delete />} variant="outlined" color="error">Delete</Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Quick Stats & Actions */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Status Summary Card */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" mb={2}>Lifecycle Status</Typography>
                <List disablePadding>
                  {asset.lifecycle.purchaseDate && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon><CalendarMonth color="action" /></ListItemIcon>
                      <ListItemText primary="Purchase Date" secondary={new Date(asset.lifecycle.purchaseDate).toLocaleDateString()} />
                    </ListItem>
                  )}
                  {asset.lifecycle.issueDate && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon><CalendarMonth color="action" /></ListItemIcon>
                      <ListItemText primary="Issue Date" secondary={new Date(asset.lifecycle.issueDate).toLocaleDateString()} />
                    </ListItem>
                  )}
                  {asset.lifecycle.expiryDate && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon><Warning color={status.color === 'error' || status.color === 'warning' ? (status.color as any) : 'action'} /></ListItemIcon>
                      <ListItemText primary="Expiry Date" secondary={new Date(asset.lifecycle.expiryDate).toLocaleDateString()} />
                    </ListItem>
                  )}
                  {asset.lifecycle.nextServiceDate && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon><Build color="action" /></ListItemIcon>
                      <ListItemText primary="Next Service" secondary={new Date(asset.lifecycle.nextServiceDate).toLocaleDateString()} />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" mb={2}>Quick Actions</Typography>
                <Stack spacing={2}>
                  {asset.lifecycle.serviceRequired && (
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<Build />}
                      onClick={() => setCompletionDialog({ ...completionDialog, open: true, type: 'service' })}
                    >
                      Record Maintenance
                    </Button>
                  )}
                  {(asset.type === 'Document' || asset.type === 'License') && asset.lifecycle.renewalRequired && (
                    <Button 
                      fullWidth 
                      variant="contained" 
                      color="warning" 
                      startIcon={<CheckCircle />}
                      onClick={() => setCompletionDialog({ ...completionDialog, open: true, type: 'renewal' })}
                    >
                      Complete Renewal
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Detailed Info & History Tabs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} px={2}>
                <Tab label="Details" />
                <Tab label="History" />
                <Tab label="Attachments" />
              </Tabs>
            </Box>
            
            <Box sx={{ p: 3 }}>
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" fontWeight="700" mb={2}>Description</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {asset.description || 'No description provided.'}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight="700" mb={2}>Additional Information</Typography>
                <Grid container spacing={2}>
                  {Object.entries(asset.metadata || {}).map(([key, value]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="body1" fontWeight="600">{value as string}</Typography>
                    </Grid>
                  ))}
                  {Object.keys(asset.metadata || {}).length === 0 && (
                    <Grid item xs={12}>
                      <Typography color="text.secondary">No additional metadata available.</Typography>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <List disablePadding>
                  {history.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemIcon sx={{ mt: 1 }}>
                          {item.type === 'service' ? <Build color="info" /> : item.type === 'renewal' ? <CheckCircle color="warning" /> : <History />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle1" fontWeight="700">
                                {item.type === 'service' ? 'Maintenance Performed' : item.type === 'renewal' ? 'Renewal Completed' : 'Status Update'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(item.date).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Box mt={0.5}>
                              <Typography variant="body2" color="text.primary">{item.description}</Typography>
                              {item.cost > 0 && (
                                <Chip 
                                  icon={<AttachMoney fontSize="small" />} 
                                  label={`Cost: ${item.cost}`} 
                                  size="small" 
                                  sx={{ mt: 1, height: 24 }} 
                                />
                              )}
                              <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                Performed by: {item.performedBy || 'Unknown'}
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
                      <Typography color="text.secondary">No history recorded for this asset yet.</Typography>
                    </Box>
                  )}
                </List>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  {asset.files?.map((file: any, i: number) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                            <Description color="action" />
                            <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>{file.name}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button 
                              size="small" 
                              variant="contained" 
                              fullWidth 
                              startIcon={<Visibility />}
                              onClick={() => { setPreviewUrl(file.url); setPreviewOpen(true); }}
                            >
                              Preview
                            </Button>
                            <IconButton size="small" color="primary" onClick={() => window.open(file.url, '_blank')}>
                              <CloudUpload fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {(asset.files || []).length === 0 && (
                    <Grid item xs={12}>
                      <Box textAlign="center" py={5}>
                        <Typography color="text.secondary">No attachments found.</Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Completion Dialog */}
      <Dialog open={completionDialog.open} onClose={() => setCompletionDialog({ ...completionDialog, open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>
          Record {completionDialog.type}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" mb={2}>
              Recording completion for <strong>{asset.name}</strong>. 
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCompletionDialog({ ...completionDialog, open: false })}>Cancel</Button>
          <Button variant="contained" onClick={handleCompleteAction}>Save & Schedule Next</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          File Preview
          <IconButton onClick={() => setPreviewOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {previewUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={previewUrl} sx={{ maxWidth: '100%', height: 'auto', borderRadius: 2 }} />
            </Box>
          ) : previewUrl.match(/\.pdf$/i) ? (
            <Box sx={{ height: '75vh' }}>
              <iframe src={`${previewUrl}#toolbar=0`} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
            </Box>
          ) : (
            <Box sx={{ height: '75vh' }}>
              <iframe 
                src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`} 
                width="100%" 
                height="100%" 
                style={{ border: 'none' }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => window.open(previewUrl, '_blank')}>Open in New Tab</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetView;
