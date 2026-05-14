import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  CircularProgress,
  Divider,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  PictureAsPdf,
  QrCode,
  CloudUpload,
  Delete,
  OpenInNew,
  CheckCircle,
  Add,
  Description,
  TableChart,
  Article
} from '@mui/icons-material';

interface MenuDocument {
  url: string;
  label: string;
  type: string;
}

interface MenuSettingsEditorProps {
  menuPdfUrl: string;
  qrCodeUrl: string;
  menuDocuments?: MenuDocument[];
  onUpdate: (data: { menuPdfUrl: string; qrCodeUrl: string; menuDocuments: MenuDocument[] }) => void;
  uploadFile: (file: File) => Promise<string>;
}

const MenuSettingsEditor: React.FC<MenuSettingsEditorProps> = ({
  menuPdfUrl,
  qrCodeUrl,
  menuDocuments = [],
  onUpdate,
  uploadFile
}) => {
  const theme = useTheme();
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingPdf(true);
    try {
      const url = await uploadFile(file);
      onUpdate({ menuPdfUrl: url, qrCodeUrl, menuDocuments });
    } catch (error) {
      console.error('PDF upload failed:', error);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingQr(true);
    try {
      const url = await uploadFile(file);
      onUpdate({ menuPdfUrl, qrCodeUrl: url, menuDocuments });
    } catch (error) {
      console.error('QR Code upload failed:', error);
    } finally {
      setUploadingQr(false);
    }
  };

  const handleAddDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingAdditional(true);
    try {
      const url = await uploadFile(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      let type = 'pdf';
      if (['xlsx', 'xls', 'csv'].includes(ext)) type = 'excel';
      else if (['doc', 'docx'].includes(ext)) type = 'word';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) type = 'image';

      const newDoc: MenuDocument = {
        url,
        label: file.name.split('.')[0],
        type
      };
      
      onUpdate({ menuPdfUrl, qrCodeUrl, menuDocuments: [...menuDocuments, newDoc] });
    } catch (error) {
      console.error('Document upload failed:', error);
    } finally {
      setUploadingAdditional(false);
    }
  };

  const removeDocument = (index: number) => {
    const newList = [...menuDocuments];
    newList.splice(index, 1);
    onUpdate({ menuPdfUrl, qrCodeUrl, menuDocuments: newList });
  };

  const updateDocumentLabel = (index: number, label: string) => {
    const newList = [...menuDocuments];
    newList[index] = { ...newList[index], label };
    onUpdate({ menuPdfUrl, qrCodeUrl, menuDocuments: newList });
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'excel': return <TableChart sx={{ color: '#1D6F42' }} />;
      case 'word': return <Article sx={{ color: '#2B579A' }} />;
      case 'image': return <Description sx={{ color: '#E39321' }} />;
      default: return <PictureAsPdf sx={{ color: '#E91E63' }} />;
    }
  };

  return (
    <Stack spacing={4}>
      {/* Primary Menu & QR Section */}
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={700} sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
          Primary Menu & QR
        </Typography>
        <Stack spacing={3}>
          {/* Menu PDF Section */}
          <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.primary.main, flexShrink: 0 }}>
                  <PictureAsPdf sx={{ fontSize: 40 }} />
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="subtitle1" fontWeight={800}>Main Menu Document</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>This is your primary menu shown prominently on the website.</Typography>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                    <Button component="label" variant="contained" startIcon={uploadingPdf ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />} disabled={uploadingPdf} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>
                      {uploadingPdf ? 'Uploading...' : 'Upload'}
                      <input type="file" hidden onChange={handlePdfUpload} />
                    </Button>
                    {menuPdfUrl && (
                      <IconButton color="error" onClick={() => onUpdate({ menuPdfUrl: '', qrCodeUrl, menuDocuments })} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* QR Code Section */}
          <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.secondary.main, flexShrink: 0, overflow: 'hidden' }}>
                  {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <QrCode sx={{ fontSize: 40 }} />}
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="subtitle1" fontWeight={800}>Menu QR Code</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>QR code for tables or flyers.</Typography>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                    <Button component="label" variant="contained" color="secondary" startIcon={uploadingQr ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />} disabled={uploadingQr} size="small" sx={{ borderRadius: 2, textTransform: 'none' }}>
                      {uploadingQr ? 'Uploading...' : 'Upload'}
                      <input type="file" hidden accept="image/*" onChange={handleQrUpload} />
                    </Button>
                    {qrCodeUrl && (
                      <IconButton color="error" onClick={() => onUpdate({ menuPdfUrl, qrCodeUrl: '', menuDocuments })} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Divider />

      {/* Multi-Format Section */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Additional Formats (Excel, Word, etc.)
          </Typography>
          <Button
            component="label"
            variant="outlined"
            startIcon={uploadingAdditional ? <CircularProgress size={16} /> : <Add />}
            disabled={uploadingAdditional}
            size="small"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Add Format
            <input type="file" hidden onChange={handleAddDocument} />
          </Button>
        </Stack>

        <Stack spacing={2}>
          {menuDocuments.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'action.hover' }}>
              <Description sx={{ color: 'text.disabled', fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">No additional formats uploaded yet.</Typography>
            </Box>
          ) : (
            menuDocuments.map((doc, index) => (
              <Card key={index} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover', display: 'flex' }}>
                      {getDocIcon(doc.type)}
                    </Box>
                    <TextField
                      size="small"
                      label="Format Name"
                      value={doc.label}
                      onChange={(e) => updateDocumentLabel(index, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="View File">
                      <IconButton href={doc.url} target="_blank" size="small">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton color="error" onClick={() => removeDocument(index)} size="small">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default MenuSettingsEditor;
