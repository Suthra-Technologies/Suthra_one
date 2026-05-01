import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Stack, 
  IconButton, 
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  Delete, 
  AddPhotoAlternate, 
  Add, 
} from '@mui/icons-material';

// ── About Section Types ────────────────────────────────────

export type AboutSectionType = 
  | 'about-intro' 
  | 'about-values' 
  | 'about-services' 
  | 'about-why-choose'
  | 'rich-text';

export interface AboutSectionData {
  id: string;
  type: AboutSectionType;
  data: any;
}

// Default about sections (mirrors the current hardcoded AboutPage)
export const DEFAULT_ABOUT_SECTIONS: AboutSectionData[] = [
  {
    id: 'default-about-intro',
    type: 'about-intro',
    data: {
      badgeText: 'About Mythri Indian Restaurant',
      paragraphs: [
        'At Mythri Indian Restaurant, every detail is thoughtfully brought together to create a dining experience that feels both familiar and special. The menu reflects a rich variety of tastes, offering everything from comforting South Indian classics to flavorful appetizers, sizzling tandoori selections, and popular Chinese favorites.',
        'Our collection of biryanis and pulavs brings aroma and taste together in every serving, while breakfast options, soups, curries, and desserts complete the experience for every kind of craving.',
        'Moreover, the space is designed to offer a warm and relaxed atmosphere, making it a perfect spot for casual meals, family gatherings, or simply enjoying good food at your own comfort.',
        'The balance of flavors, presentation, and environment comes together smoothly, allowing every visit to feel satisfying and memorable. Above all, Mythri Indian Restaurant is about bringing people together over food that feels authentic, comforting, and enjoyable every single time.'
      ],
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop&crop=entropy&auto=format'
    }
  },
  {
    id: 'default-about-values',
    type: 'about-values',
    data: {
      badgeText: 'What We Value',
      heading: 'We are committed to serving fresh, quality food while creating a warm and memorable dining experience for every guest.',
      items: [
        'Fresh ingredients and authentic flavors.',
        'Friendly service and welcoming atmosphere.',
        'Cleanliness and attention to detail',
        'Customer happiness and satisfaction'
      ],
      image: '/what_we_value.png'
    }
  },
  {
    id: 'default-about-services',
    type: 'about-services',
    data: {
      title: 'Our Services',
      subtitle: 'From intimate gatherings to grand celebrations, we\'ve got you covered',
      items: [
        { emoji: '🍱', title: 'Catering Services', description: 'Flavor that travels from our kitchen straight to your moments.' },
        { emoji: '🍽️', title: 'Dine-In & Take-Out', description: 'Step in and enjoy a comfortable dine-in experience with great food, pleasant ambience, and moments worth sharing.' },
        { emoji: '🍷', title: 'BYOB', description: 'Bring along your favorite drink and pair it with our delicious food for a personalized dining experience.' },
        { emoji: '🌍', title: 'Online Orders', description: 'Order online and enjoy Mythri\'s authentic flavors delivered fresh to your door!' }
      ]
    }
  },
  {
    id: 'default-about-why',
    type: 'about-why-choose',
    data: {
      title: 'Why Choose Mythri Indian Restaurant?',
      subtitle: 'Enjoy a delicious balance of heritage and creativity.',
      items: [
        {
          image: 'https://s3.amazonaws.com/stage-eventcrux-images.com/uploads/1773890315586_QuickService.png',
          title: 'Quick Service',
          description: 'Freshly prepared and served to your table in just 15 minutes, delivering great taste and top quality in every bite.',
          stat: '15 min'
        },
        {
          image: 'https://s3.amazonaws.com/stage-eventcrux-images.com/uploads/1773890308873_Team.png',
          title: 'Expert Team',
          description: 'Our chefs and staff bring years of experience and passion to every dish they prepare.',
          stat: '20+ chefs'
        },
        {
          image: 'https://s3.amazonaws.com/stage-eventcrux-images.com/uploads/1773890316314_QualityFirst.png',
          title: 'Quality First',
          description: 'From handpicked ingredients to delicious meals on your table, we focus on freshness and flavor.',
          stat: '100% fresh'
        }
      ]
    }
  }
];

// ── Section Editors ────────────────────────────────────

interface AboutEditorProps {
  section: AboutSectionData;
  onUpdate: (data: any) => void;
  uploadImage: (file: File) => Promise<string>;
}

/** About Intro Section Editor */
export const AboutIntroEditor: React.FC<AboutEditorProps> = ({ section, onUpdate, uploadImage }) => {
  const data = section.data;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file).then(url => onUpdate({ ...data, image: url }));
    }
  };

  const handleParaChange = (idx: number, val: string) => {
    const newParagraphs = [...(data.paragraphs || [])];
    newParagraphs[idx] = val;
    onUpdate({ ...data, paragraphs: newParagraphs });
  };

  const addParagraph = () => onUpdate({ ...data, paragraphs: [...(data.paragraphs || []), ''] });
  const removeParagraph = (idx: number) => {
    const newParagraphs = [...(data.paragraphs || [])];
    newParagraphs.splice(idx, 1);
    onUpdate({ ...data, paragraphs: newParagraphs });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Badge Text"
        fullWidth
        value={data.badgeText || ''}
        inputProps={{ maxLength: 50 }}
        helperText={`${(data.badgeText || '').length}/50`}
        onChange={(e) => onUpdate({ ...data, badgeText: e.target.value })}
      />
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
            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
          </Button>
        </Box>
        <Stack spacing={1} flex={1}>
          <Typography variant="subtitle2">Description Paragraphs</Typography>
          {(data.paragraphs || []).map((para: string, idx: number) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={para}
                inputProps={{ maxLength: 400 }}
                helperText={`${para.length}/400`}
                onChange={(e) => handleParaChange(idx, e.target.value)}
              />
              <IconButton color="error" onClick={() => removeParagraph(idx)} disabled={(data.paragraphs || []).length <= 1}>
                <Delete />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<Add />} onClick={addParagraph} disabled={(data.paragraphs || []).length >= 4}>Add Paragraph</Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

/** About Values Section Editor */
export const AboutValuesEditor: React.FC<AboutEditorProps> = ({ section, onUpdate, uploadImage }) => {
  const data = section.data;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file).then(url => onUpdate({ ...data, image: url }));
    }
  };

  const handleItemChange = (idx: number, val: string) => {
    const newItems = [...(data.items || [])];
    newItems[idx] = val;
    onUpdate({ ...data, items: newItems });
  };

  const addItem = () => onUpdate({ ...data, items: [...(data.items || []), ''] });
  const removeItem = (idx: number) => {
    const newItems = [...(data.items || [])];
    newItems.splice(idx, 1);
    onUpdate({ ...data, items: newItems });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Badge Text"
        fullWidth
        value={data.badgeText || ''}
        inputProps={{ maxLength: 50 }}
        helperText={`${(data.badgeText || '').length}/50`}
        onChange={(e) => onUpdate({ ...data, badgeText: e.target.value })}
      />
      <TextField
        label="Heading"
        fullWidth
        multiline
        rows={2}
        value={data.heading || ''}
        inputProps={{ maxLength: 300 }}
        helperText={`${(data.heading || '').length}/300`}
        onChange={(e) => onUpdate({ ...data, heading: e.target.value })}
      />
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
            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
          </Button>
        </Box>
        <Stack spacing={1} flex={1}>
          <Typography variant="subtitle2">Value Items</Typography>
          {(data.items || []).map((item: string, idx: number) => (
            <Stack key={idx} direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                value={item}
                placeholder="Value description"
                inputProps={{ maxLength: 100 }}
                helperText={`${item.length}/100`}
                onChange={(e) => handleItemChange(idx, e.target.value)}
              />
              <IconButton color="error" onClick={() => removeItem(idx)} disabled={(data.items || []).length <= 1}>
                <Delete />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<Add />} onClick={addItem}>Add Value</Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

/** About Services Section Editor */
export const AboutServicesEditor: React.FC<AboutEditorProps> = ({ section, onUpdate }) => {
  const data = section.data;
  const items = data.items || [];

  const updateItem = (idx: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    onUpdate({ ...data, items: newItems });
  };

  const addItem = () => onUpdate({ ...data, items: [...items, { emoji: '⭐', title: '', description: '' }] });
  const removeItem = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    onUpdate({ ...data, items: newItems });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Section Title"
        fullWidth
        value={data.title || ''}
        inputProps={{ maxLength: 100 }}
        helperText={`${(data.title || '').length}/100`}
        onChange={(e) => onUpdate({ ...data, title: e.target.value })}
      />
      <TextField
        label="Subtitle"
        fullWidth
        value={data.subtitle || ''}
        inputProps={{ maxLength: 150 }}
        helperText={`${(data.subtitle || '').length}/150`}
        onChange={(e) => onUpdate({ ...data, subtitle: e.target.value })}
      />
      <Stack spacing={2}>
        {items.map((item: any, idx: number) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="start">
              <Stack spacing={1} flex={1}>
                <Stack direction="row" spacing={1}>
                  <TextField label="Emoji" size="small" value={item.emoji || ''} inputProps={{ maxLength: 5 }} onChange={(e) => updateItem(idx, 'emoji', e.target.value)} sx={{ width: 80 }} />
                  <TextField label="Title" size="small" fullWidth value={item.title || ''} inputProps={{ maxLength: 50 }} helperText={`${(item.title || '').length}/50`} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
                </Stack>
                <TextField
                  label="Description"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={item.description || ''}
                  inputProps={{ maxLength: 150 }}
                  helperText={`${(item.description || '').length}/150`}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                />
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

/** About Why Choose Section Editor */
export const AboutWhyChooseEditor: React.FC<AboutEditorProps> = ({ section, onUpdate, uploadImage }) => {
  const data = section.data;
  const items = data.items || [];

  const updateItem = (idx: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    onUpdate({ ...data, items: newItems });
  };

  const handleItemImageUpload = (idx: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file).then(url => updateItem(idx, 'image', url));
    }
  };

  const addItem = () => onUpdate({ ...data, items: [...items, { image: '', title: '', description: '', stat: '' }] });
  const removeItem = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    onUpdate({ ...data, items: newItems });
  };

  return (
    <Stack spacing={3}>
      <TextField
        label="Section Title"
        fullWidth
        value={data.title || ''}
        inputProps={{ maxLength: 100 }}
        helperText={`${(data.title || '').length}/100`}
        onChange={(e) => onUpdate({ ...data, title: e.target.value })}
      />
      <TextField
        label="Subtitle"
        fullWidth
        value={data.subtitle || ''}
        inputProps={{ maxLength: 150 }}
        helperText={`${(data.subtitle || '').length}/150`}
        onChange={(e) => onUpdate({ ...data, subtitle: e.target.value })}
      />
      <Stack spacing={2}>
        {items.map((item: any, idx: number) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="start">
              <Box sx={{ width: 80, textAlign: 'center' }}>
                {item.image ? (
                  <img src={item.image} alt="" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <Box sx={{ width: '100%', height: 60, bgcolor: '#f0f0f0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AddPhotoAlternate fontSize="small" />
                  </Box>
                )}
                <Button component="label" size="small" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                  Image
                  <input type="file" hidden accept="image/*" onChange={(e) => handleItemImageUpload(idx, e)} />
                </Button>
              </Box>
              <Stack spacing={1} flex={1}>
                <Stack direction="row" spacing={1}>
                  <TextField label="Title" size="small" fullWidth value={item.title || ''} inputProps={{ maxLength: 50 }} helperText={`${(item.title || '').length}/50`} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
                  <TextField label="Stat Badge" size="small" value={item.stat || ''} inputProps={{ maxLength: 20 }} helperText={`${(item.stat || '').length}/20`} onChange={(e) => updateItem(idx, 'stat', e.target.value)} sx={{ width: 120 }} />
                </Stack>
                <TextField
                  label="Description"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={item.description || ''}
                  inputProps={{ maxLength: 150 }}
                  helperText={`${(item.description || '').length}/150`}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                />
              </Stack>
              <IconButton color="error" onClick={() => removeItem(idx)}><Delete /></IconButton>
            </Stack>
          </Paper>
        ))}
        <Button startIcon={<Add />} variant="outlined" onClick={addItem}>Add Feature</Button>
      </Stack>
    </Stack>
  );
};
