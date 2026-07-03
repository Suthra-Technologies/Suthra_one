import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  alpha,
  useTheme,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Delete,
  CloudUpload,
  Info,
  Visibility,
  Close,
} from '@mui/icons-material';
import { assetsAPI, uploadAPI } from '../../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import CustomInput from '../../components/common/CustomInput';

const ASSET_TYPES = ['Vehicle', 'Document', 'License', 'Gadget', 'Equipment', /* 'Property', */ 'Other'];

const AssetForm: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { getRelativePath } = useActiveTenant();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'Document',
    // tag: '', // Removed serial number/tag
    description: '',
    metadata: [] as { key: string; value: string }[],
    lifecycle: {
      issueDate: '',
      purchaseDate: '',
      expiryDate: '',
      nextServiceDate: '',
      serviceRequired: false,
      serviceFrequency: 6,
      serviceUnit: 'months' as 'days' | 'months' | 'years',
      reminderDaysForService: [30, 7, 1],
      expires: true,
      renewalRequired: true,
      nextRenewalDate: '',
      renewalFrequency: 365,
      renewalUnit: 'days' as 'days' | 'months' | 'years',
      reminderDaysForRenewals: [30, 7, 1],
    },
    reminderConfigs: [
      { daysBefore: 30, enabled: true },
      { daysBefore: 7, enabled: true },
      { daysBefore: 1, enabled: true },
    ],
    fileLinks: [] as string[],
  });

  const [newReminderDay, setNewReminderDay] = useState('');
  const [newServiceReminderDay, setNewServiceReminderDay] = useState('');

  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchAsset();
    }
  }, [id]);

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const res = await assetsAPI.getOne(id!);
      const asset = res.data;
      
      // Convert Map/Object metadata to array
      const metaArray = Object.entries(asset.metadata || {}).map(([key, value]) => ({
        key,
        value: value as string
      }));

      setForm({
        ...asset,
        metadata: metaArray,
        lifecycle: {
          ...asset.lifecycle,
          issueDate: asset.lifecycle.issueDate ? asset.lifecycle.issueDate.split('T')[0] : '',
          purchaseDate: asset.lifecycle.purchaseDate ? asset.lifecycle.purchaseDate.split('T')[0] : '',
          expiryDate: asset.lifecycle.expiryDate ? asset.lifecycle.expiryDate.split('T')[0] : '',
          nextServiceDate: asset.lifecycle.nextServiceDate ? asset.lifecycle.nextServiceDate.split('T')[0] : '',
          serviceRequired: asset.lifecycle.serviceRequired || false,
          serviceFrequency: asset.lifecycle.serviceFrequency || 6,
          serviceUnit: asset.lifecycle.serviceUnit || 'months',
          reminderDaysForService: asset.lifecycle.reminderDaysForService || [30, 7, 1],
          nextRenewalDate: asset.lifecycle.nextRenewalDate ? asset.lifecycle.nextRenewalDate.split('T')[0] : '',
          renewalFrequency: asset.lifecycle.renewalFrequency || 365,
          renewalUnit: asset.lifecycle.renewalUnit || 'days',
          reminderDaysForRenewals: asset.lifecycle.reminderDaysForRenewals || [30, 7, 1],
        },
        fileLinks: (asset.files || []).map((f: any) => f.url),
      });
    } catch (error) {
      toast.error('Failed to load asset details');
      navigate(getRelativePath('/assets'));
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataChange = (index: number, field: 'key' | 'value', value: string) => {
    const newMeta = [...form.metadata];
    newMeta[index][field] = value;
    setForm({ ...form, metadata: newMeta });
  };

  const addMetadata = () => {
    setForm({ ...form, metadata: [...form.metadata, { key: '', value: '' }] });
  };

  const removeMetadata = (index: number) => {
    const newMeta = form.metadata.filter((_, i) => i !== index);
    setForm({ ...form, metadata: newMeta });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Basic validation based on asset type
      const isDocumentType = form.type === 'Document' || form.type === 'License';
      if (!isDocumentType && !file.type.startsWith('image/')) {
        toast.error('Only image files are allowed for this asset type');
        setUploading(false);
        return;
      }

      const res = await uploadAPI.uploadImage(file);
      setForm(prev => ({
        ...prev,
        fileLinks: [...prev.fileLinks, res.data.url]
      }));
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Convert metadata array back to object
      const metadataObj = form.metadata.reduce((acc, curr) => {
        if (curr.key) acc[curr.key] = curr.value;
        return acc;
      }, {} as any);

      const isDocOrLicense = form.type === 'Document' || form.type === 'License';

      const payload = {
        ...form,
        metadata: metadataObj,
        lifecycle: {
          ...form.lifecycle,
          // Handle Renewal Fields: Only for Documents/Licenses
          renewalRequired: isDocOrLicense ? form.lifecycle.renewalRequired : false,
          nextRenewalDate: isDocOrLicense && form.lifecycle.renewalRequired ? form.lifecycle.nextRenewalDate : null,
          renewalFrequency: isDocOrLicense && form.lifecycle.renewalRequired ? form.lifecycle.renewalFrequency : null,
          renewalUnit: isDocOrLicense && form.lifecycle.renewalRequired ? form.lifecycle.renewalUnit : null,
          reminderDaysForRenewals: isDocOrLicense && form.lifecycle.renewalRequired ? form.lifecycle.reminderDaysForRenewals : [],

          // Handle Service Fields: Only for non-Documents/Licenses
          serviceRequired: !isDocOrLicense ? form.lifecycle.serviceRequired : false,
          nextServiceDate: !isDocOrLicense && form.lifecycle.serviceRequired ? form.lifecycle.nextServiceDate : null,
          serviceFrequency: !isDocOrLicense && form.lifecycle.serviceRequired ? form.lifecycle.serviceFrequency : null,
          serviceUnit: !isDocOrLicense && form.lifecycle.serviceRequired ? form.lifecycle.serviceUnit : null,
          reminderDaysForService: !isDocOrLicense && form.lifecycle.serviceRequired ? form.lifecycle.reminderDaysForService : [],
          
          // Basic fields
          expires: form.lifecycle.expires,
          expiryDate: form.lifecycle.expires ? form.lifecycle.expiryDate : null,
          issueDate: form.lifecycle.issueDate || null,
          purchaseDate: form.lifecycle.purchaseDate || null,
        },
        files: form.fileLinks.map(link => ({
          url: link,
          name: link.split('/').pop() || 'file',
          fileType: link.split('.').pop() || 'unknown',
        })),
      };

      // Remove sensitive/system fields that shouldn't be updated manually
      delete (payload as any).tenant;
      delete (payload as any).createdBy;
      delete (payload as any).updatedBy;
      delete (payload as any)._id;
      delete (payload as any).__v;
      delete (payload as any).fileLinks;

      if (isEdit) {
        await assetsAPI.update(id!, payload);
        toast.success('Asset updated successfully');
      } else {
        await assetsAPI.create(payload);
        toast.success('Asset created successfully');
      }
      navigate(getRelativePath('/assets'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 10, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <IconButton onClick={() => navigate(getRelativePath('/assets'))}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="800">
          {isEdit ? 'Edit Asset' : 'Add New Asset'}
        </Typography>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* General Information */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" mb={3}>General Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <CustomInput
                      type="name"
                      fullWidth
                      label="Asset Name"
                      required
                      value={form.name}
                      onChange={(val) => setForm({ ...form, name: val })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Asset Type</InputLabel>
                      <Select
                        value={form.type}
                        label="Asset Type"
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        {ASSET_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  {/* <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Tag / Serial Number"
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    />
                  </Grid> */}
                  <Grid item xs={12}>
                    <CustomInput
                      type="textarea"
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      value={form.description}
                      onChange={(val) => setForm({ ...form, description: val })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Lifecycle Tracking */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="700" mb={3}>Lifecycle Tracking</Typography>
                <Stack spacing={3}>
                  {(form.type === 'Vehicle' || form.type === 'Equipment') && (
                    <TextField
                      fullWidth
                      type="date"
                      label="Purchase Date"
                      InputLabelProps={{ shrink: true }}
                      value={form.lifecycle.purchaseDate}
                      onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, purchaseDate: e.target.value } })}
                    />
                  )}
                  
                  {!(form.type === 'Vehicle' || form.type === 'Equipment') && (
                    <TextField
                      fullWidth
                      type="date"
                      label="Issue Date"
                      InputLabelProps={{ shrink: true }}
                      value={form.lifecycle.issueDate}
                      onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, issueDate: e.target.value } })}
                    />
                  )}
                  
                  <Box>
                    <FormControlLabel
                      control={<Switch checked={form.lifecycle.expires} onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, expires: e.target.checked } })} />}
                      label="This asset expires"
                    />
                    {form.lifecycle.expires && (
                      <TextField
                        fullWidth
                        type="date"
                        label="Expiry Date"
                        sx={{ mt: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={form.lifecycle.expiryDate}
                        onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, expiryDate: e.target.value } })}
                      />
                    )}
                  </Box>

                  {!(form.type === 'Document' || form.type === 'License') && (
                    <Box>
                      <FormControlLabel
                        control={<Switch checked={form.lifecycle.serviceRequired} onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, serviceRequired: e.target.checked } })} />}
                        label="Service Required"
                      />
                      {form.lifecycle.serviceRequired && (
                        <Stack spacing={2} sx={{ mt: 2, pl: 2, borderLeft: `2px solid ${theme.palette.info.light}` }}>
                          <TextField
                            fullWidth
                            type="date"
                            label="Next Service Date"
                            InputLabelProps={{ shrink: true }}
                            value={form.lifecycle.nextServiceDate}
                            onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, nextServiceDate: e.target.value } })}
                          />

                          <Typography variant="caption" fontWeight="bold" color="info.main">Service Frequency</Typography>
                          <Stack direction="row" spacing={2}>
                            <CustomInput
                              type="number"
                              allowDecimals={false}
                              size="small"
                              label="Frequency"
                              value={form.lifecycle.serviceFrequency}
                              onChange={(val) => setForm({ ...form, lifecycle: { ...form.lifecycle, serviceFrequency: parseInt(val) || 0 } })}
                            />
                            <FormControl size="small" fullWidth>
                              <InputLabel>Unit</InputLabel>
                              <Select
                                label="Unit"
                                value={form.lifecycle.serviceUnit}
                                onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, serviceUnit: e.target.value as any } })}
                              >
                                <MenuItem value="days">Days</MenuItem>
                                <MenuItem value="months">Months</MenuItem>
                                <MenuItem value="years">Years</MenuItem>
                              </Select>
                            </FormControl>
                          </Stack>

                          <Typography variant="caption" fontWeight="bold" color="info.main">Service Reminders (Days Before)</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {form.lifecycle.reminderDaysForService?.map(days => (
                              <Chip
                                key={days}
                                label={`${days}d`}
                                size="small"
                                onDelete={() => setForm({ 
                                  ...form, 
                                  lifecycle: { 
                                    ...form.lifecycle, 
                                    reminderDaysForService: form.lifecycle.reminderDaysForService?.filter(d => d !== days) 
                                  } 
                                })}
                              />
                            ))}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CustomInput
                                type="number"
                                allowDecimals={false}
                                size="small"
                                sx={{ width: 60 }}
                                value={newServiceReminderDay}
                                onChange={(val) => setNewServiceReminderDay(val)}
                                placeholder="+"
                              />
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  const d = parseInt(newServiceReminderDay);
                                  if (!isNaN(d) && !form.lifecycle.reminderDaysForService?.includes(d)) {
                                    setForm({
                                      ...form,
                                      lifecycle: {
                                        ...form.lifecycle,
                                        reminderDaysForService: [...(form.lifecycle.reminderDaysForService || []), d].sort((a,b) => b-a)
                                      }
                                    });
                                    setNewServiceReminderDay('');
                                  }
                                }}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                          </Stack>
                        </Stack>
                      )}
                    </Box>
                  )}

                  {form.lifecycle.expires && (form.type === 'Document' || form.type === 'License') && (
                    <>
                      <Divider sx={{ my: 1 }} />

                      <Box>
                        <FormControlLabel
                          control={<Switch checked={form.lifecycle.renewalRequired} onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, renewalRequired: e.target.checked } })} />}
                          label="Renewal Required"
                        />
                        
                        {form.lifecycle.renewalRequired && (
                          <Stack spacing={2} sx={{ mt: 2, pl: 2, borderLeft: `2px solid ${theme.palette.primary.light}` }}>
                            <TextField
                              fullWidth
                              type="date"
                              label="Next Renewal Date"
                              InputLabelProps={{ shrink: true }}
                              value={form.lifecycle.nextRenewalDate}
                              onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, nextRenewalDate: e.target.value } })}
                            />

                            <Typography variant="caption" fontWeight="bold" color="primary">Renewal Frequency</Typography>
                            <Stack direction="row" spacing={2}>
                              <CustomInput
                                type="number"
                                allowDecimals={false}
                                size="small"
                                label="Frequency"
                                value={form.lifecycle.renewalFrequency}
                                onChange={(val) => {
                                  let parsed = parseInt(val) || 0;
                                  if (parsed > 366) parsed = 366;
                                  setForm({ ...form, lifecycle: { ...form.lifecycle, renewalFrequency: parsed } });
                                }}
                              />
                              <FormControl size="small" fullWidth>
                                <InputLabel>Unit</InputLabel>
                                <Select
                                  label="Unit"
                                  value={form.lifecycle.renewalUnit}
                                  onChange={(e) => setForm({ ...form, lifecycle: { ...form.lifecycle, renewalUnit: e.target.value as any } })}
                                >
                                  <MenuItem value="days">Days</MenuItem>
                                  <MenuItem value="months">Months</MenuItem>
                                  <MenuItem value="years">Years</MenuItem>
                                </Select>
                              </FormControl>
                            </Stack>

                            <Typography variant="caption" fontWeight="bold" color="primary">Renewal Reminders (Days Before)</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {form.lifecycle.reminderDaysForRenewals.map(days => (
                                <Chip
                                  key={days}
                                  label={`${days}d`}
                                  size="small"
                                  onDelete={() => setForm({ 
                                    ...form, 
                                    lifecycle: { 
                                      ...form.lifecycle, 
                                      reminderDaysForRenewals: form.lifecycle.reminderDaysForRenewals.filter(d => d !== days) 
                                    } 
                                  })}
                                />
                              ))}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CustomInput
                                  type="number"
                                  allowDecimals={false}
                                  size="small"
                                  sx={{ width: 60 }}
                                  value={newReminderDay}
                                  onChange={(val) => setNewReminderDay(val)}
                                  placeholder="+"
                                />
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    const d = parseInt(newReminderDay);
                                    if (!isNaN(d) && !form.lifecycle.reminderDaysForRenewals.includes(d)) {
                                      setForm({
                                        ...form,
                                        lifecycle: {
                                          ...form.lifecycle,
                                          reminderDaysForRenewals: [...form.lifecycle.reminderDaysForRenewals, d].sort((a,b) => b-a)
                                        }
                                      });
                                      setNewReminderDay('');
                                    }
                                  }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </Stack>
                          </Stack>
                        )}
                      </Box>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Metadata & Files */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              {/* Dynamic Metadata */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="700">Additional Details</Typography>
                    <Button size="small" startIcon={<Add />} onClick={addMetadata}>Add Field</Button>
                  </Stack>
                  <Stack spacing={2}>
                    {form.metadata.map((meta, index) => (
                      <Stack key={index} direction="row" spacing={1}>
                        <CustomInput
                          type="alphanumeric"
                          size="small"
                          placeholder="Field name"
                          value={meta.key}
                          onChange={(val) => handleMetadataChange(index, 'key', val)}
                        />
                        <CustomInput
                          type="text"
                          size="small"
                          placeholder="Value"
                          fullWidth
                          value={meta.value}
                          onChange={(val) => handleMetadataChange(index, 'value', val)}
                        />
                        <IconButton color="error" onClick={() => removeMetadata(index)}><Delete /></IconButton>
                      </Stack>
                    ))}
                    {form.metadata.length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                        No custom fields added yet.
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="700" mb={2}>Attachments</Typography>
                  <Button
                    component="label"
                    variant="outlined"
                    fullWidth
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                    disabled={uploading}
                    sx={{ borderStyle: 'dashed', py: 2 }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Asset Files'}
                    <input 
                      type="file" 
                      hidden 
                      onChange={handleFileUpload} 
                      accept={(form.type === 'Document' || form.type === 'License') ? "*/*" : "image/*"}
                    />
                  </Button>
                  
                  <Stack spacing={1} mt={2}>
                    {form.fileLinks.map((link, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>{link.split('/').pop()}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Preview">
                            <IconButton size="small" color="primary" onClick={() => { setPreviewUrl(link); setPreviewOpen(true); }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" color="error" onClick={() => setForm(prev => ({ ...prev, fileLinks: prev.fileLinks.filter((_, idx) => idx !== i) }))}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button size="large" onClick={() => navigate(getRelativePath('/assets'))}>Cancel</Button>
              <Button
                size="large"
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (isEdit ? 'Update Asset' : 'Create Asset')}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          File Preview
          <IconButton onClick={() => setPreviewOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {previewUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Box component="img" src={previewUrl} sx={{ maxWidth: '100%', height: 'auto', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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
                title="Document Preview" 
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

export default AssetForm;
