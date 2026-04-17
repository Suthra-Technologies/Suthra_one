import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import GallerySettings from '../../settings/GallerySettings';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  Card,
  CardHeader,
  CardContent,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  AddPhotoAlternate,
  InsertLink,
  TableChart,
  Save,
  Visibility,
  Close,
  Undo,
  Redo,
  Add as AddIcon,
  Delete,
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  ChevronLeft,
  ChevronRight,
  Star,
  RestartAlt,
} from '@mui/icons-material';
import { homepageAPI, uploadAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';
import dompurify from 'dompurify';
import './editor.css';
import { 
  type SectionData, 
  type SectionType, 
  HeroSectionEditor, 
  OnlineOrderEditor,
  HospitalitySectionEditor,
  ServicesSectionEditor,
  DynamicBlockPlaceholder
} from './components/SectionEditors';

const DEFAULT_HOMEPAGE_SECTIONS: SectionData[] = [
  {
    id: 'default-hero',
    type: 'hero',
    data: { 
      title: 'Authentic Indian Flavours', 
      description: 'A destination for good food, great mood, and authentic flavours served with heart.', 
      images: ['https://s3.us-east-1.amazonaws.com/restaurant.pos.com/uploads/03e5f01c-ba44-45e2-bcc7-fe305a64788e.png'] 
    }
  },
  {
    id: 'default-hospitality',
    type: 'hospitality',
    data: {
      title: 'A Legacy of Taste & Authentic Hospitality',
      subtitle: 'Our Story',
      description: [
        'At our restaurant, we\'re proud to serve authentic Indian flavors with the help of our experienced chefs.',
        'Our menu offers a wide variety of Indian favorites including starters, soups, curries, and rich biryanis.'
      ],
      image: 'https://s3.amazonaws.com/eventcrux-images.com/uploads/1773837209724_cheif.jpeg',
      imagePosition: 'right'
    }
  },
  {
    id: 'default-services',
    type: 'services',
    data: {
      title: 'Experience Hospitality Your Way',
      subtitle: 'Our Services',
      items: [
        { icon: 'CalendarRange', title: 'Table Reservations', description: 'Reserve your table in advance.', path: '/book' },
        { icon: 'PartyPopper', title: 'Catering Services', description: 'Make your events special.', path: '/catering' },
        { icon: 'ShoppingBag', title: 'Online Ordering', description: 'Order your favorite dishes easily.', path: '/menu' }
      ]
    }
  },
  { id: 'default-featured', type: 'featured-items', data: { title: 'Savor Our Signature Creations' } },
  { id: 'default-online-order', type: 'online-order', data: { title: 'Online Order', showOurSystem: true, ourSystemLink: '/menu', showDoordash: true, doordashLink: '', showUberEats: true, uberEatsLink: '' } },
  { id: 'default-testimonials', type: 'testimonials', data: {} }
];

// Tiptap Wrapper for Rich Text Sections
const RichTextSection: React.FC<{ 
  html: string; 
  onChange: (html: string) => void;
  uploadImage: (file: File) => Promise<string>;
}> = ({ html, onChange, uploadImage }) => {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: html,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const url = await uploadImage(file);
        editor?.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        toast.error('Image upload failed');
      }
    }
  };

  const setLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor?.chain().focus().unsetLink().run();
    }
    setIsLinkDialogOpen(false);
    setLinkUrl('');
  };

  if (!editor) return null;

  return (
    <Box sx={{ border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: '#f8fafc', p: 0.5, borderBottom: '1px solid #eee' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          <IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo fontSize="small" /></IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <IconButton size="small" onClick={() => editor.chain().focus().toggleBold().run()} color={editor.isActive('bold') ? 'primary' : 'inherit'}><FormatBold fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => editor.chain().focus().toggleItalic().run()} color={editor.isActive('italic') ? 'primary' : 'inherit'}><FormatItalic fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => editor.chain().focus().toggleUnderline().run()} color={editor.isActive('underline') ? 'primary' : 'inherit'}><FormatUnderlined fontSize="small" /></IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('left').run()} color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'inherit'}><FormatAlignLeft fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('center').run()} color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'inherit'}><FormatAlignCenter fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => editor.chain().focus().setTextAlign('right').run()} color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'inherit'}><FormatAlignRight fontSize="small" /></IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <IconButton size="small" component="label"><AddPhotoAlternate fontSize="small" /><input type="file" hidden accept="image/*" onChange={handleImageUpload} /></IconButton>
          <IconButton size="small" onClick={() => setIsLinkDialogOpen(true)} color={editor.isActive('link') ? 'primary' : 'inherit'}><InsertLink fontSize="small" /></IconButton>
        </Stack>
      </Box>
      <Box sx={{ p: 2, minHeight: 150 }}>
        <EditorContent editor={editor} className="tiptap-section-editor" />
      </Box>

      {/* Mini Link Dialog */}
      <Dialog open={isLinkDialogOpen} onClose={() => setIsLinkDialogOpen(false)}>
        <DialogTitle>Insert Link</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="URL" type="url" fullWidth variant="standard" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
          <Button onClick={setLink}>Insert</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customise-tabpanel-${index}`}
      aria-labelledby={`customise-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomiseScreensPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const isClosed = false; // Mocked for preview parity

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await homepageAPI.getContent();
        if (response.data) {
          if (response.data.sections && response.data.sections.length > 0) {
            setSections(response.data.sections);
          } else {
            // Default template mimicking the original landing page
            setSections(DEFAULT_HOMEPAGE_SECTIONS);
          }
        }
      } catch (error) {
        console.error('Error fetching homepage content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // For now we still send htmlContent just in case, but prioritize sections
      await homepageAPI.updateContent('', sections);
      toast.success('Homepage updated successfully!');
    } catch (error) {
      console.error('Error saving homepage:', error);
      toast.error('Failed to save homepage content');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: SectionType) => {
    const newSection: SectionData = {
      id: Date.now().toString(),
      type,
      data: type === 'hero' ? { title: '', description: '', images: ['https://s3.us-east-1.amazonaws.com/restaurant.pos.com/uploads/03e5f01c-ba44-45e2-bcc7-fe305a64788e.png'] } :
            type === 'hospitality' ? { title: 'Authentic Hospitality', subtitle: 'A Legacy of Taste', description: ['Welcome to our restaurant.'], image: '', imagePosition: 'left' } :
            type === 'services' ? { title: 'Our Services', subtitle: 'Experience Hospitality', items: [] } :
            type === 'online-order' ? { title: 'Order Online', showOurSystem: true, ourSystemLink: '/menu', showDoordash: false, doordashLink: '', showUberEats: false, uberEatsLink: '' } :
            type === 'rich-text' ? { html: '' } :
            {} // Featured Items and Testimonials have no specific data
    };
    setSections([...sections, newSection]);
    setAnchorEl(null);
  };

  const updateSection = (id: string, data: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, data } : s));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    const response = await uploadAPI.uploadImage(file);
    return response.data.url;
  };

  const openPreview = () => {
    window.history.pushState({ previewOpen: true }, '');
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    if (window.history.state?.previewOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPreviewOpen]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Customise Screens</Typography>
          <Typography variant="body2" color="text.secondary">Configure and personalize your application's public and internal screens.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="error" startIcon={<RestartAlt />} onClick={() => setIsResetDialogOpen(true)}>Reset to Default</Button>
          <Button variant="outlined" startIcon={<Visibility />} onClick={openPreview}>Preview</Button>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>Save Changes</Button>
        </Stack>
      </Stack>

      <Paper sx={{ width: '100%', borderRadius: 4, overflow: 'hidden' }} elevation={0} variant="outlined">
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab label="Home Page" sx={{ fontWeight: 'bold', py: 2 }} />
          <Tab label="Gallery" sx={{ fontWeight: 'bold', py: 2 }} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: { xs: 1, md: 3 } }}>
            <Stack spacing={4}>
        {sections.filter(s => s.type !== 'cards').map((section, idx) => (
          <Card key={section.id} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'visible' }}>
            <CardHeader
              title={<Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{section.type} Section</Typography>}
              action={
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => moveSection(idx, 'up')} disabled={idx === 0}><ArrowUpward fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1}><ArrowDownward fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => removeSection(section.id)}><Delete fontSize="small" /></IconButton>
                </Stack>
              }
              sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
            />
            <CardContent>
              {section.type === 'hero' && <HeroSectionEditor section={section} onUpdate={(data) => updateSection(section.id, data)} uploadImage={handleUploadImage} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} />}
              {section.type === 'hospitality' && <HospitalitySectionEditor section={section} onUpdate={(data) => updateSection(section.id, data)} uploadImage={handleUploadImage} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} />}
              {section.type === 'services' && <ServicesSectionEditor section={section} onUpdate={(data) => updateSection(section.id, data)} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} uploadImage={handleUploadImage} />}
              {section.type === 'featured-items' && <DynamicBlockPlaceholder type="featured-items" />}
              {section.type === 'testimonials' && <DynamicBlockPlaceholder type="testimonials" />}
              {section.type === 'online-order' && <OnlineOrderEditor section={section} onUpdate={(data) => updateSection(section.id, data)} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} uploadImage={handleUploadImage} />}
              {section.type === 'rich-text' && <RichTextSection html={section.data?.html || ''} onChange={(html) => updateSection(section.id, { html })} uploadImage={handleUploadImage} />}
            </CardContent>
          </Card>
        ))}

        </Stack>

        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ borderRadius: 10, px: 4, borderStyle: 'dashed', borderWidth: 2 }}
          >
            Add New Section
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => addSection('hero')}>Hero Carousel</MenuItem>
            <MenuItem onClick={() => addSection('hospitality')}>Hospitality (Story)</MenuItem>
            <MenuItem onClick={() => addSection('services')}>Our Services</MenuItem>
            <MenuItem onClick={() => addSection('featured-items')}>Featured Items (Dynamic)</MenuItem>
            <MenuItem onClick={() => addSection('testimonials')}>Testimonials (Dynamic)</MenuItem>
            <MenuItem onClick={() => addSection('online-order')}>Online Order Block</MenuItem>
            <MenuItem onClick={() => addSection('rich-text')}>Rich Text / HTML</MenuItem>
          </Menu>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: { xs: 1, md: 3 } }}>
            <GallerySettings />
          </Box>
        </TabPanel>
      </Paper>

      <Dialog fullScreen open={isPreviewOpen} onClose={closePreview}>
        <AppBar sx={{ position: 'relative', bgcolor: '#1a1a1a' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={closePreview} aria-label="close"><Close /></IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6">Homepage Preview (Desktop View)</Typography>
            <Button autoFocus color="inherit" onClick={closePreview}>Done</Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ bgcolor: '#fff', minHeight: '100dvh' }}>
          {/* Preview Container mirroring Mythri styles */}
          <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4, px: 2 }}>
            {sections.map((section, idx) => (
              <Box key={section.id} sx={{ mb: 10 }}>
                {/* Hero Preview */}
                {section.type === 'hero' && (() => {
                  const validImages = section.data?.images?.filter((img: string) => img?.trim?.() !== '') || [];
                  const displayImages = validImages.length > 0 ? validImages : ['https://s3.us-east-1.amazonaws.com/restaurant.pos.com/uploads/03e5f01c-ba44-45e2-bcc7-fe305a64788e.png'];
                  
                  return (
                    <Box sx={{ position: 'relative', height: '60vh', bgcolor: '#1b120d', mx: -2, mt: -4, mb: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'white' }}>
                      <img src={displayImages[0]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                      <Box sx={{ position: 'relative', zIndex: 1, p: 4, maxWidth: 900 }}>
                        <Typography variant="h2" fontWeight="bold" sx={{ fontSize: { xs: '1.8rem', sm: '2.5rem' }, dropShadow: '0 20px 13px rgba(0,0,0,0.4)', mb: 1.5 }}>{section.data?.title}</Typography>
                        <Typography variant="h6" sx={{ fontSize: '0.9rem', opacity: 0.9, maxWidth: 600, mx: 'auto', mb: 3 }}>{section.data?.description}</Typography>
                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                          <Button variant="contained" sx={{ bgcolor: '#c44d24', color: 'white', px: 3, py: 1, borderRadius: 10, fontSize: '0.9rem', '&:hover': { bgcolor: '#a53f1e' } }}>{isClosed ? 'Pre-order Online' : 'Order Online'}</Button>
                          <Button variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.1)', px: 3, py: 1, borderRadius: 10, fontSize: '0.9rem', backdropFilter: 'blur(12px)' }}>Book a Table</Button>
                        </Stack>
                      </Box>
                      {displayImages.length > 1 && (
                        <Stack direction="row" spacing={1} sx={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                          {displayImages.map((_: any, i: number) => (
                            <Box key={i} sx={{ height: 6, width: i === 0 ? 32 : 8, bgcolor: i === 0 ? 'white' : 'rgba(255,255,255,0.4)', borderRadius: 10 }} />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })()}

                {/* Hospitality Preview */}
                {section.type === 'hospitality' && (
                  <Stack direction={{ xs: 'column', lg: section.data?.imagePosition === "right" ? "row-reverse" : "row" }} spacing={4} alignItems="stretch" sx={{ py: 6 }}>
                    <Box sx={{ flex: 1, minHeight: { xs: 260, md: 320 }, borderRadius: 6, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                      <img src={section.data?.image || 'https://images.unsplash.com/photo-1544025162-d76694265947'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="overline" color="#a83214" fontWeight="bold" sx={{ letterSpacing: '0.25em', fontSize: '0.65rem' }}>{section.data?.subtitle}</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>{section.data?.title}</Typography>
                      {section.data?.description?.map((p: string, i: number) => (
                        <Typography key={i} variant="body1" sx={{ mb: 1.5, color: '#334155', fontSize: '1rem', lineHeight: 1.6 }}>{p}</Typography>
                      ))}
                      <Box sx={{ mt: 'auto', pt: 1 }}>
                        <Button sx={{ bgcolor: '#9f2f16', color: 'white', px: 3, py: 1, borderRadius: 10, '&:hover': { bgcolor: '#a53f1e' } }}>Explore More</Button>
                      </Box>
                    </Box>
                  </Stack>
                )}

                {/* Services Preview */}
                {section.type === 'services' && (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="overline" color="#a83214" fontWeight="bold" sx={{ letterSpacing: '0.25em', fontSize: '0.65rem' }}>{section.data?.subtitle}</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>{section.data?.title}</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                      {section.data?.items?.map((item: any, i: number) => (
                        <Box key={i} sx={{ flex: 1, p: 3, borderRadius: 6, border: '1px solid rgba(230,211,191,0.4)', textAlign: 'left', transition: '0.3s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <Box sx={{ bgcolor: '#f7e1ce', p: 1, borderRadius: 3, display: 'inline-flex', mb: 2, color: '#9f2f16' }}>
                            <Typography variant="subtitle1" lineHeight={1}>✦</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>{item.title}</Typography>
                          <Typography variant="body2" color="#475569" lineHeight={1.5}>{item.description}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Online Order Preview */}
                {section.type === 'online-order' && (
                  <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 8, bgcolor: '#141d24', py: 6, px: 3, textAlign: 'center', color: 'white', my: 6, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', backgroundImage: `url('https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80')`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(20, 29, 36, 0.95)' }}>
                    <Typography variant="h4" sx={{ mb: 4, fontStyle: 'italic', fontWeight: 300, fontFamily: 'serif' }}>{section.data?.title || 'Online Order'}</Typography>
                    <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ gap: 3 }}>
                      {section.data?.showOurSystem && (
                        <Box sx={{ width: 100, height: 100, bgcolor: '#e69f24', borderRadius: 5, p: 1.5, color: '#000', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <Typography fontSize="0.7rem" fontWeight="bold">Our Online</Typography>
                          <Typography fontSize="0.7rem" fontWeight="bold">Ordering</Typography>
                          <Typography fontSize="0.7rem" fontWeight="bold">System</Typography>
                        </Box>
                      )}
                      {section.data?.showDoordash && (
                        <Box sx={{ width: 100, height: 100, bgcolor: '#ff3008', borderRadius: 5, p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <Box sx={{ h: 12, w: 20, borderRadius: '50% 50% 0 0', bgcolor: 'white', mb: 1 }} />
                          <Typography fontSize="0.65rem" fontWeight={900} letterSpacing={-0.5} align="center">DOORDASH</Typography>
                        </Box>
                      )}
                      {section.data?.showUberEats && (
                        <Box sx={{ width: 100, height: 100, bgcolor: '#131b20', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 5, p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <Typography fontSize="1rem" fontWeight="bold" lineHeight={1}>Uber</Typography>
                          <Typography fontSize="1rem" fontWeight="bold" lineHeight={1} color="#06c167">Eats</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Featured Items (Must Try) Preview */}
                {section.type === 'featured-items' && (
                  <Box sx={{ py: 6, textAlign: 'center', bgcolor: '#fdf8f4', borderRadius: 4, mx: -2, px: 2, position: 'relative' }}>
                    <Typography variant="overline" color="#a83214" fontWeight="bold" sx={{ letterSpacing: '0.25em', fontSize: '0.65rem', display: 'block', mb: 1 }}>MUST TRY</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mb: 6 }}>{section.data?.title || 'Savor Our Signature Creations'}</Typography>
                    
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <IconButton sx={{ position: 'absolute', left: -20, bgcolor: 'white', shadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}><ChevronLeft sx={{ color: '#a83214' }} /></IconButton>
                      
                      <Stack direction="row" spacing={3} sx={{ overflow: 'hidden', width: '100%', justifyContent: 'center' }}>
                        {[1, 2, 3].map((i) => (
                          <Box key={i} sx={{ width: 240, flexShrink: 0, bgcolor: 'white', borderRadius: 4, overflow: 'hidden', border: '1px solid #f1f5f9', shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                            <Box sx={{ height: 140, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography color="text.secondary" variant="caption">Dish Image {i}</Typography>
                            </Box>
                            <Box sx={{ p: 2, textAlign: 'left' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>Signature Dish {i}</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: '#fff6e5', color: '#f59e0b', px: 1, py: 0.2, borderRadius: 0.5, fontSize: '0.6rem', fontWeight: 'bold' }}>
                                  ★ 4.{i+5}
                                </Box>
                              </Stack>
                              <Typography variant="caption" fontWeight="bold" sx={{ color: '#a83214', display: 'block', mb: 2 }}>$14.99</Typography>
                              <Button fullWidth sx={{ bgcolor: '#a83214', color: 'white', borderRadius: 2, py: 0.5, '&:hover': { bgcolor: '#8e2810' }, fontWeight: 'bold', fontSize: '0.75rem' }}>Add to cart</Button>
                            </Box>
                          </Box>
                        ))}
                      </Stack>

                      <IconButton sx={{ position: 'absolute', right: -20, bgcolor: 'white', shadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}><ChevronRight sx={{ color: '#a83214' }} /></IconButton>
                    </Box>
                  </Box>
                )}

                {/* Testimonials Preview */}
                {section.type === 'testimonials' && (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>What Our Guests Say</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                      {[1, 2, 3].map((i) => (
                        <Box key={i} sx={{ flex: 1, p: 3, borderRadius: 6, border: '1px solid #f1f5f9', bgcolor: 'white', textAlign: 'left' }}>
                          <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                            {[1, 2, 3, 4, 5].map((s) => <Star key={s} sx={{ fontSize: 16, color: '#f59e0b' }} />)}
                          </Stack>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 3, color: '#475569', lineHeight: 1.6 }}>
                            "The food was absolutely amazing! Best Indian restaurant in town, the flavors were spot on and service was top notch."
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#f7e1ce', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#9f2f16' }}>
                              G
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">Guest Name {i}</Typography>
                              <Typography variant="caption" color="text.secondary">Verified Customer</Typography>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Rich Text Preview */}
                {section.type === 'rich-text' && (
                  <Box 
                    sx={{ typography: 'body1', '& img': { maxWidth: '100%', borderRadius: 2 } }}
                    dangerouslySetInnerHTML={{ __html: dompurify.sanitize(section.data?.html || '') }} 
                  />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Dialog>

      <Dialog open={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)}>
        <DialogTitle>Reset to Default Template?</DialogTitle>
        <DialogContent>
          <Typography>
            This will replace all your current sections with the default template. 
            Any unsaved changes will be lost. This action cannot be undone unless you refresh without saving.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 3, px: 3 }}>
          <Button onClick={() => setIsResetDialogOpen(false)} color="inherit">Cancel</Button>
          <Button 
            onClick={() => {
              setSections(DEFAULT_HOMEPAGE_SECTIONS);
              setIsResetDialogOpen(false);
              toast.success('Reset to default template. Don\'t forget to Save Changes!');
            }} 
            color="error" 
            variant="contained"
          >
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        .tiptap-section-editor .ProseMirror {
          outline: none;
          min-height: 150px;
        }
        .tiptap-section-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: 'Add your content here...';
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </Container>
  );
};

export default CustomiseScreensPage;
