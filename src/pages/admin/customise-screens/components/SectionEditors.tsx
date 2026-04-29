import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Stack, 
  IconButton, 
  Card, 
  CardContent, 
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Tooltip
} from '@mui/material';
import { 
  Delete, 
  AddPhotoAlternate, 
  Add, 
  ArrowUpward, 
  ArrowDownward,
  CalendarMonth,
  Celebration,
  ShoppingBag as ShoppingBagIcon,
  Star,
  CelebrationOutlined,
} from '@mui/icons-material';
import { Select, MenuItem as MuiMenuItem, FormControl, InputLabel } from '@mui/material';
import { EditorContent } from '@tiptap/react';

export type SectionType = 
  | 'hero' 
  | 'hospitality' 
  | 'services' 
  | 'featured-items' 
  | 'testimonials' 
  | 'online-order' 
  | 'rich-text';

export interface HeroSectionData {
  title: string;
  description: string;
  images: string[];
}

export interface OnlineOrderSectionData {
  title: string;
  showOurSystem: boolean;
  ourSystemLink: string;
  showDoordash: boolean;
  doordashLink: string;
  showUberEats: boolean;
  uberEatsLink: string;
}

export interface HospitalitySectionData {
  title: string;
  subtitle: string;
  description: string[];
  image: string;
  imagePosition: 'left' | 'right';
}

export interface ServiceItem {
  icon: string;
  title: string;
  description: string;
  path: string;
}

export interface ServicesSectionData {
  title: string;
  subtitle: string;
  items: ServiceItem[];
}

export interface RichTextSectionData {
  html: string;
}

export interface SectionData {
  id: string;
  type: SectionType;
  data: any;
}

interface SectionEditorProps {
  section: SectionData;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  uploadImage: (file: File) => Promise<string>;
}

export const HeroSectionEditor: React.FC<SectionEditorProps> = ({ section, onUpdate, uploadImage }) => {
  const data = section.data as HeroSectionData;
  const images = data.images || [];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file).then(url => {
        onUpdate({ ...data, images: [...images, url] });
      });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onUpdate({ ...data, images: newImages });
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Hero Title"
        fullWidth
        value={data.title || ''}
        inputProps={{ maxLength: 100 }}
        helperText={`${(data.title || '').length}/100`}
        onChange={(e) => onUpdate({ ...data, title: e.target.value })}
      />
      <TextField
        label="Hero Description"
        fullWidth
        multiline
        rows={2}
        value={data.description || ''}
        inputProps={{ maxLength: 150 }}
        helperText={`${(data.description || '').length}/150`}
        onChange={(e) => onUpdate({ ...data, description: e.target.value })}
      />
      <Box>
        <Typography variant="subtitle2" mb={1}>Carousel Images</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {images.map((img, idx) => (
            <Box key={idx} sx={{ position: 'relative', width: 100, height: 100 }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                onClick={() => removeImage(idx)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            component="label"
            variant="outlined"
            sx={{ width: 100, height: 100, borderRadius: 2 }}
          >
            <AddPhotoAlternate />
            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export const OnlineOrderEditor: React.FC<SectionEditorProps> = ({ section, onUpdate }) => {
  const data = section.data as OnlineOrderSectionData;

  const updateField = (field: keyof OnlineOrderSectionData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Section Title"
        fullWidth
        value={data.title || ''}
        inputProps={{ maxLength: 100 }}
        helperText={`${(data.title || '').length}/100`}
        onChange={(e) => updateField('title', e.target.value)}
      />
      
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">Our System</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Switch checked={data.showOurSystem} onChange={(e) => updateField('showOurSystem', e.target.checked)} />}
            label="Enable"
          />
          <TextField label="Link" size="small" fullWidth value={data.ourSystemLink} onChange={(e) => updateField('ourSystemLink', e.target.value)} disabled={!data.showOurSystem} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">DoorDash</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Switch checked={data.showDoordash} onChange={(e) => updateField('showDoordash', e.target.checked)} />}
            label="Enable"
          />
          <TextField label="Link" size="small" fullWidth value={data.doordashLink} onChange={(e) => updateField('doordashLink', e.target.value)} disabled={!data.showDoordash} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">UberEats</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Switch checked={data.showUberEats} onChange={(e) => updateField('showUberEats', e.target.checked)} />}
            label="Enable"
          />
          <TextField label="Link" size="small" fullWidth value={data.uberEatsLink} onChange={(e) => updateField('uberEatsLink', e.target.value)} disabled={!data.showUberEats} />
        </Stack>
      </Paper>
    </Stack>
  );
};

export const HospitalitySectionEditor: React.FC<SectionEditorProps> = ({ section, onUpdate, uploadImage }) => {
  const data = section.data as HospitalitySectionData;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file).then(url => onUpdate({ ...data, image: url }));
    }
  };

  const handleDescChange = (idx: number, val: string) => {
    const newDesc = [...data.description];
    newDesc[idx] = val;
    const totalLength = newDesc.reduce((acc, curr) => acc + (curr || '').length, 0);
    if (totalLength > 1000) return;
    onUpdate({ ...data, description: newDesc });
  };

  const addPara = () => onUpdate({ ...data, description: [...data.description, ''] });
  const removePara = (idx: number) => {
    const newDesc = [...data.description];
    newDesc.splice(idx, 1);
    onUpdate({ ...data, description: newDesc });
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ width: 120, textAlign: 'center' }}>
          {data.image ? (
            <img src={data.image} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
          ) : (
            <Box sx={{ width: '100%', height: 100, bgcolor: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AddPhotoAlternate />
            </Box>
          )}
          <Button component="label" size="small" sx={{ mt: 1 }}>
            Image
            <input type="file" hidden onChange={handleImageUpload} />
          </Button>
        </Box>
        <Stack spacing={2} flex={1}>
          <TextField label="Title" fullWidth value={data.title} inputProps={{ maxLength: 100 }} helperText={`${(data.title || '').length}/100`} onChange={(e) => onUpdate({ ...data, title: e.target.value })} />
          <TextField label="Subtitle" fullWidth value={data.subtitle} inputProps={{ maxLength: 100 }} helperText={`${(data.subtitle || '').length}/100`} onChange={(e) => onUpdate({ ...data, subtitle: e.target.value })} />
          <Stack direction="row" spacing={2} alignItems="center">
             <Typography variant="body2">Image Position:</Typography>
             <Button variant={data.imagePosition === 'left' ? 'contained' : 'outlined'} onClick={() => onUpdate({ ...data, imagePosition: 'left' })}>Left</Button>
             <Button variant={data.imagePosition === 'right' ? 'contained' : 'outlined'} onClick={() => onUpdate({ ...data, imagePosition: 'right' })}>Right</Button>
          </Stack>
        </Stack>
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Description Paragraphs</Typography>
          <Typography variant="caption" color={data.description.reduce((acc, curr) => acc + (curr || '').length, 0) >= 1000 ? 'error' : 'textSecondary'}>
            Total characters: {data.description.reduce((acc, curr) => acc + (curr || '').length, 0)}/1000
          </Typography>
        </Stack>
        <Stack spacing={2}>
          {data.description.map((para, idx) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField 
                fullWidth 
                multiline 
                rows={3} 
                value={para} 
                inputProps={{ maxLength: 500 }}
                helperText={`${para.length}/500`}
                onChange={(e) => handleDescChange(idx, e.target.value)} 
              />
              <IconButton color="error" onClick={() => removePara(idx)} disabled={data.description.length <= 1}><Delete /></IconButton>
            </Stack>
          ))}
          <Button startIcon={<Add />} onClick={addPara}>Add Paragraph</Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export const ServicesSectionEditor: React.FC<SectionEditorProps> = ({ section, onUpdate }) => {
  const theme = useTheme();
  const data = section.data as ServicesSectionData;

  const updateItem = (idx: number, itemData: Partial<ServiceItem>) => {
    const newItems = [...data.items];
    newItems[idx] = { ...newItems[idx], ...itemData };
    onUpdate({ ...data, items: newItems });
  };

  const addItem = () => onUpdate({ ...data, items: [...data.items, { icon: 'CalendarRange', title: '', description: '', path: '' }] });
  const removeItem = (idx: number) => {
    const newItems = [...data.items];
    newItems.splice(idx, 1);
    onUpdate({ ...data, items: newItems });
  };

  return (
    <Stack spacing={3}>
      <TextField label="Section Title" fullWidth value={data.title} inputProps={{ maxLength: 100 }} helperText={`${(data.title || '').length}/100`} onChange={(e) => onUpdate({ ...data, title: e.target.value })} />
      <TextField label="Subtitle" fullWidth value={data.subtitle} inputProps={{ maxLength: 100 }} helperText={`${(data.subtitle || '').length}/100`} onChange={(e) => onUpdate({ ...data, subtitle: e.target.value })} />
      <Stack spacing={2}>
        {data.items.map((item, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="start">
              <Box sx={{ width: { xs: 'auto', sm: 'auto' }, mb: { xs: 1, sm: 0 } }}>
                <Tooltip title="Click to cycle icons">
                  <IconButton
                    size="large"
                    onClick={() => {
                      const options = ['CalendarRange', 'PartyPopper', 'ShoppingBag'];
                      const currentIndex = options.indexOf(item.icon);
                      const nextIndex = (currentIndex + 1) % options.length;
                      updateItem(idx, { icon: options[nextIndex] });
                    }}
                    sx={{ 
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                      p: 2,
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                    }}
                  >
                    {item.icon === 'CalendarRange' && <CalendarMonth />}
                    {item.icon === 'PartyPopper' && <Celebration />}
                    {item.icon === 'ShoppingBag' && <ShoppingBagIcon />}
                    {!['CalendarRange', 'PartyPopper', 'ShoppingBag'].includes(item.icon) && <Star />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Stack spacing={1} flex={1}>
                <TextField label="Title" fullWidth size="small" value={item.title} inputProps={{ maxLength: 25 }} helperText={`${(item.title || '').length}/25`} onChange={(e) => updateItem(idx, { title: e.target.value })} />
                <TextField label="Description" fullWidth size="small" multiline rows={2} value={item.description} inputProps={{ maxLength: 150 }} helperText={`${(item.description || '').length}/150`} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                <TextField label="Link Path" fullWidth size="small" value={item.path} onChange={(e) => updateItem(idx, { path: e.target.value })} />
              </Stack>
              <IconButton color="error" onClick={() => removeItem(idx)}><Delete /></IconButton>
            </Stack>
          </Paper>
        ))}
        <Button startIcon={<Add />} variant="outlined" onClick={addItem}>Add Service</Button>
      </Stack>
    </Stack>
  );
};

export const DynamicBlockPlaceholder: React.FC<{ type: string }> = ({ type }) => (
  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', border: '2px dashed #e2e8f0' }}>
    <Typography variant="h6" color="textSecondary" gutterBottom>
      {type === 'featured-items' ? '✨ Must Try Section' : '💬 Guest Reviews Section'}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      The content of this section is managed automatically based on your {type === 'featured-items' ? 'menu settings' : 'recent testimonials'}.
    </Typography>
    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
      You can still move this block up or down to change its position on your homepage.
    </Typography>
  </Paper>
);

export const RichTextSectionEditor: React.FC<SectionEditorProps & { editor: any }> = ({ editor }) => {
  if (!editor) return null;
  
  return (
    <Box className="tiptap-editor-container" sx={{ border: '1px solid #e5e7eb', borderRadius: 1, minHeight: 200 }}>
       <EditorContent editor={editor} />
    </Box>
  );
};
