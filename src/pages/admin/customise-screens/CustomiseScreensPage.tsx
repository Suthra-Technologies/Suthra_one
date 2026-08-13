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
  useTheme,
  useMediaQuery,
  alpha
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
  CalendarMonth,
  Celebration,
  ShoppingBag,
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
import {
  type AboutSectionData,
  DEFAULT_ABOUT_SECTIONS,
  AboutIntroEditor,
  AboutValuesEditor,
  AboutServicesEditor,
  AboutWhyChooseEditor,
} from './components/AboutSectionEditors';
import MenuSettingsEditor from './components/MenuSettingsEditor';
import { DashboardSkeleton } from '../../../components/common/PageSkeleton';

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

// Icon Mapping for Services
const getServiceIcon = (iconName: string) => {
  const iconProps = { fontSize: 'small' as const, sx: { fontSize: 18 } };
  switch (iconName) {
    case 'CalendarRange': return <CalendarMonth {...iconProps} />;
    case 'PartyPopper': return <Celebration {...iconProps} />;
    case 'ShoppingBag': return <ShoppingBag {...iconProps} />;
    default: return <Star {...iconProps} />;
  }
};

const CustomiseScreensPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const headingFontSize = { xs: '1.15rem', sm: '1.5rem', md: '2.125rem' };
  const bodyFontSize = { xs: '0.78rem', sm: '0.85rem', md: '0.875rem' };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [aboutSections, setAboutSections] = useState<AboutSectionData[]>([]);
  const [menuSettings, setMenuSettings] = useState({ menuPdfUrl: '', qrCodeUrl: '', menuDocuments: [] as any[] });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [aboutAnchorEl, setAboutAnchorEl] = useState<null | HTMLElement>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isAboutResetDialogOpen, setIsAboutResetDialogOpen] = useState(false);
  const isClosed = false; // Mocked for preview parity

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [homeResponse, aboutResponse, menuResponse] = await Promise.all([
          homepageAPI.getContent(),
          homepageAPI.getAboutContent(),
          homepageAPI.getMenuSettings(),
        ]);
        if (homeResponse.data) {
          if (homeResponse.data.sections && homeResponse.data.sections.length > 0) {
            setSections(homeResponse.data.sections);
          } else {
            setSections(DEFAULT_HOMEPAGE_SECTIONS);
          }
        }
        if (aboutResponse.data) {
          if (aboutResponse.data.aboutSections && aboutResponse.data.aboutSections.length > 0) {
            setAboutSections(aboutResponse.data.aboutSections);
          } else {
            setAboutSections(DEFAULT_ABOUT_SECTIONS);
          }
        }
        if (menuResponse.data) {
          setMenuSettings(menuResponse.data);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tabValue === 0) {
        await homepageAPI.updateContent('', sections);
        toast.success('Homepage updated successfully!', { 
          position: 'top-center',
          style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px', background: '#333', color: '#fff' } 
        });
      } else if (tabValue === 2) {
        await homepageAPI.updateAboutContent(aboutSections);
        toast.success('About page updated successfully!', { 
          position: 'top-center',
          style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px', background: '#333', color: '#fff' } 
        });
      } else if (tabValue === 3) {
        await homepageAPI.updateMenuSettings(menuSettings);
        toast.success('Menu & QR settings updated successfully!', { 
          position: 'top-center',
          style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px', background: '#333', color: '#fff' } 
        });
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content', { 
        position: 'top-center',
        style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px' } 
      });
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

  // ── About Page Section Handlers ──
  const addAboutSection = (type: AboutSectionData['type']) => {
    const newSection: AboutSectionData = {
      id: Date.now().toString(),
      type,
      data: type === 'about-intro' ? { badgeText: '', paragraphs: [''], image: '' } :
            type === 'about-values' ? { badgeText: '', heading: '', items: [''], image: '' } :
            type === 'about-services' ? { title: '', subtitle: '', items: [] } :
            type === 'about-why-choose' ? { title: '', subtitle: '', items: [] } :
            {}
    };
    setAboutSections([...aboutSections, newSection]);
    setAboutAnchorEl(null);
  };

  const updateAboutSection = (id: string, data: any) => {
    setAboutSections(aboutSections.map(s => s.id === id ? { ...s, data } : s));
  };

  const removeAboutSection = (id: string) => {
    setAboutSections(aboutSections.filter(s => s.id !== id));
  };

  const moveAboutSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...aboutSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setAboutSections(newSections);
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
    return <DashboardSkeleton />;
  }

  return (
    <>
      {!isPreviewOpen ? (
        <Container maxWidth="xl" sx={{ 
          py: { xs: 2.5, md: 4 }, 
          px: { xs: isMobile ? 2 : 3, sm: 3 },
          pt: { xs: isMobile ? '20px' : 2.5, sm: 4 } 
        }}>
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'center', md: 'center' }} 
        spacing={{ xs: 2, md: 2 }} 
        mb={{ xs: 2.5, md: 4 }}
      >
        <Box sx={{ textAlign: { xs: 'center', md: 'left' }, width: { xs: '100%', md: 'auto' } }}>
          <Typography 
            variant="h4" 
            sx={{ 
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                fontSize: headingFontSize,
                color: { xs: '#000', md: 'text.primary' },
                mb: { xs: 0.5, md: 0 }
            }}
          >
            Customise Screens
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: bodyFontSize }}>
            Manage and personalize your application's public screens.
          </Typography>
        </Box>
        <Stack 
          direction={{ xs: 'row' }} 
          spacing={{ xs: 1, md: 2 }} 
          sx={{ 
            width: { xs: '100%', md: 'auto' }, 
            justifyContent: { xs: 'center', md: 'flex-end' },
            flexWrap: { xs: 'nowrap', md: 'nowrap' },
            gap: { xs: 1, md: 0 },
            overflowX: { xs: 'auto', md: 'visible' },
            pb: { xs: 1, md: 0 },
            '&::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {(tabValue === 0 || tabValue === 2) && (
            <>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<RestartAlt />} 
                onClick={() => tabValue === 2 ? setIsAboutResetDialogOpen(true) : setIsResetDialogOpen(true)}
                sx={{ 
                  px: { xs: 1.5, md: 2 }, 
                  height: { xs: 36, md: 42 },
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: bodyFontSize, 
                  whiteSpace: 'nowrap' 
                }}
              >
                Reset
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Visibility />} 
                onClick={openPreview}
                sx={{ 
                  px: { xs: 1.5, md: 2 }, 
                  height: { xs: 36, md: 42 },
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: bodyFontSize, 
                  whiteSpace: 'nowrap' 
                }}
              >
                Preview
              </Button>
            </>
          )}
          <Button 
            variant="contained" 
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} 
            onClick={handleSave} 
            disabled={saving}
            sx={{ 
              px: { xs: 2.5, md: 3 }, 
              height: { xs: 36, md: 42 },
              borderRadius: 2.5,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              fontSize: bodyFontSize, 
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ width: '100%', borderRadius: { xs: 3, md: 4 }, overflow: 'hidden', border: 'none', bgcolor: 'transparent' }} elevation={0}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            px: { xs: 0, md: 2 }, 
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': {
                minHeight: { xs: 44, md: 48 },
                fontSize: bodyFontSize,
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' }
            }
          }}
        >
          <Tab label="Home Page" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} />
          <Tab label="Gallery" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} />
          <Tab label="About Page" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} />
          <Tab label="Menu & QR Code" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ py: { xs: 2, md: 3 }, px: { xs: 0, md: 3 } }}>
            <Stack spacing={{ xs: 2.5, md: 4 }}>
              {sections.filter(s => (s.type as string) !== 'cards').map((section, idx) => (
                <Card key={section.id} elevation={0} sx={{ 
                  borderRadius: { xs: 3.5, md: 4 }, 
                  overflow: 'visible',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: { xs: '0 4px 16px rgba(0,0,0,0.02)', md: 'none' }
                }}>
                  <CardHeader
                    title={
                      <Typography sx={{ 
                        fontWeight: 800, 
                        fontFamily: "'Outfit', sans-serif",
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        fontSize: { xs: '0.7rem', md: '0.8rem' },
                        color: 'text.secondary'
                      }}>
                        {section.type.replace('-', ' ')} SECTION
                      </Typography>
                    }
                    action={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => moveSection(idx, 'up')} disabled={idx === 0} sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}><ArrowUpward sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1} sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}><ArrowDownward sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => removeSection(section.id)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}><Delete sx={{ fontSize: 18 }} /></IconButton>
                      </Stack>
                    }
                    sx={{ bgcolor: alpha(theme.palette.divider, 0.02), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`, py: 1.5, px: { xs: 2, md: 2.5 } }}
                  />
                  <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
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
          </Box>

          <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ 
                borderRadius: 10, 
                px: { xs: 4, md: 6 }, 
                py: 1.5,
                borderStyle: 'dashed', 
                borderWidth: 2,
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                fontSize: { xs: '0.85rem', md: '1rem' },
                '&:hover': { borderWidth: 2 }
              }}
            >
              Add New Section
            </Button>
            <Menu 
              anchorEl={anchorEl} 
              open={Boolean(anchorEl)} 
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: { 
                  borderRadius: 3, 
                  mt: 1, 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    py: 1.25
                  }
                }
              }}
            >
              <MenuItem onClick={() => addSection('hero')}>Hero Carousel</MenuItem>
              <MenuItem onClick={() => addSection('hospitality')}>Hospitality (Story)</MenuItem>
              <MenuItem onClick={() => addSection('services')}>Our Services</MenuItem>
              <MenuItem onClick={() => addSection('featured-items')}>Featured Items (Dynamic)</MenuItem>
              <MenuItem onClick={() => addSection('testimonials')}>Testimonials (Dynamic)</MenuItem>
              <MenuItem onClick={() => addSection('online-order')}>Online Order Block</MenuItem>
              <MenuItem onClick={() => addSection('rich-text')}>Rich Text / HTML</MenuItem>
            </Menu>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: { xs: 1, md: 3 } }}>
            <GallerySettings />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ py: { xs: 2, md: 3 }, px: { xs: 0, md: 3 } }}>
            <Stack spacing={{ xs: 2.5, md: 4 }}>
              {aboutSections.map((section, idx) => (
                <Card key={section.id} elevation={0} sx={{ 
                  borderRadius: { xs: 3.5, md: 4 }, 
                  overflow: 'visible',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: { xs: '0 4px 16px rgba(0,0,0,0.02)', md: 'none' }
                }}>
                  <CardHeader
                    title={
                      <Typography sx={{ 
                        fontWeight: 800, 
                        fontFamily: "'Outfit', sans-serif",
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        fontSize: { xs: '0.7rem', md: '0.8rem' },
                        color: 'text.secondary'
                      }}>
                        {section.type.replace(/-/g, ' ')} SECTION
                      </Typography>
                    }
                    action={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => moveAboutSection(idx, 'up')} disabled={idx === 0} sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}><ArrowUpward sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" onClick={() => moveAboutSection(idx, 'down')} disabled={idx === aboutSections.length - 1} sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}><ArrowDownward sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => removeAboutSection(section.id)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}><Delete sx={{ fontSize: 18 }} /></IconButton>
                      </Stack>
                    }
                    sx={{ bgcolor: alpha(theme.palette.divider, 0.02), borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`, py: 1.5, px: { xs: 2, md: 2.5 } }}
                  />
                  <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
                    {section.type === 'about-intro' && <AboutIntroEditor section={section} onUpdate={(data) => updateAboutSection(section.id, data)} uploadImage={handleUploadImage} />}
                    {section.type === 'about-values' && <AboutValuesEditor section={section} onUpdate={(data) => updateAboutSection(section.id, data)} uploadImage={handleUploadImage} />}
                    {section.type === 'about-services' && <AboutServicesEditor section={section} onUpdate={(data) => updateAboutSection(section.id, data)} uploadImage={handleUploadImage} />}
                    {section.type === 'about-why-choose' && <AboutWhyChooseEditor section={section} onUpdate={(data) => updateAboutSection(section.id, data)} uploadImage={handleUploadImage} />}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddIcon />}
              onClick={(e) => setAboutAnchorEl(e.currentTarget)}
              sx={{ 
                borderRadius: 10, 
                px: { xs: 4, md: 6 }, 
                py: 1.5,
                borderStyle: 'dashed', 
                borderWidth: 2,
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                fontSize: { xs: '0.85rem', md: '1rem' },
                '&:hover': { borderWidth: 2 }
              }}
            >
              Add About Section
            </Button>
            <Menu 
              anchorEl={aboutAnchorEl} 
              open={Boolean(aboutAnchorEl)} 
              onClose={() => setAboutAnchorEl(null)}
              PaperProps={{
                sx: { 
                  borderRadius: 3, 
                  mt: 1, 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    py: 1.25
                  }
                }
              }}
            >
              <MenuItem onClick={() => addAboutSection('about-intro')}>Intro / About Section</MenuItem>
              <MenuItem onClick={() => addAboutSection('about-values')}>Values Section</MenuItem>
              <MenuItem onClick={() => addAboutSection('about-services')}>Services Section</MenuItem>
              <MenuItem onClick={() => addAboutSection('about-why-choose')}>Why Choose Us Section</MenuItem>
            </Menu>
          </Box>


        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ py: { xs: 2, md: 3 }, px: { xs: 0, md: 3 } }}>
            <MenuSettingsEditor 
              menuPdfUrl={menuSettings.menuPdfUrl} 
              qrCodeUrl={menuSettings.qrCodeUrl}
              menuDocuments={menuSettings.menuDocuments}
              onUpdate={(data) => setMenuSettings(data)}
              uploadFile={handleUploadImage}
            />
          </Box>
        </TabPanel>
      </Paper>
      </Container>
      ) : (
        <Box sx={{ bgcolor: '#fff', minHeight: '100dvh' }}>
        <AppBar sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: '#1a1a1a', color: 'white', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }}>
            <Button
              startIcon={<ChevronLeft />}
              onClick={closePreview}
              color="inherit"
              sx={{ 
                textTransform: 'none', 
                fontWeight: 700, 
                fontFamily: "'Outfit', sans-serif",
                fontSize: { xs: '0.9rem', md: '1rem' },
                mr: 1,
                ml: -1,
                '& .MuiButton-startIcon': { mr: { xs: 0.5, md: 1 } }
              }}
            >
              Back
            </Button>
            <Typography sx={{ flex: 1, fontWeight: 800, fontFamily: "'Outfit', sans-serif", fontSize: { xs: '0.9rem', md: '1.1rem' }, color: 'white' }} variant="h6">
              {tabValue === 2 ? 'About Page Preview' : 'Home Page Preview'}
            </Typography>
            {!isMobile && (
              <Button 
                autoFocus 
                color="inherit" 
                onClick={closePreview} 
                sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", textTransform: 'none' }}
              >
                Done
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ bgcolor: '#fff', minHeight: '100dvh' }}>
          {/* Preview Container mirroring Mythri styles */}
          <Box sx={{ 
            maxWidth: 1200, 
            mx: 'auto', 
            py: { xs: 2, md: 4 }, 
            px: { xs: 2, md: 3 } 
          }}>
            {tabValue === 2 ? (
              aboutSections.map((section, idx) => (
                <Box key={section.id} sx={{ mb: 10 }}>
                   {section.type === 'about-intro' && (
                     <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
                       <Box sx={{ flex: 1, textAlign: 'left' }}>
                         {section.data?.badgeText && (
                           <Typography variant="overline" sx={{ bgcolor: 'rgba(230, 159, 36, 0.2)', px: 2, py: 0.5, borderRadius: 5, color: '#e69f24', fontWeight: 'bold' }}>
                             {section.data.badgeText}
                           </Typography>
                         )}
                         <Typography variant="body1" sx={{ mt: 2, color: '#475569', lineHeight: 1.8 }}>
                           {(section.data?.paragraphs?.[0] || 'Welcome to our restaurant. This is a preview of the intro section.')}
                         </Typography>
                       </Box>
                       <Box sx={{ flex: 1, height: { xs: 200, md: 300 }, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                         {section.data?.image && <img src={section.data.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                       </Box>
                     </Stack>
                   )}
                   {section.type === 'about-values' && (
                     <Stack direction={{ xs: 'column', md: 'row-reverse' }} spacing={4} alignItems="center" sx={{ py: 4 }}>
                       <Box sx={{ flex: 1, textAlign: 'left' }}>
                         {section.data?.badgeText && (
                           <Typography variant="overline" sx={{ bgcolor: '#1b120d', px: 2, py: 0.5, borderRadius: 5, color: '#f4c5a1', fontWeight: 'bold' }}>
                             {section.data.badgeText}
                           </Typography>
                         )}
                         <Typography variant="h5" sx={{ fontWeight: 800, mt: 2, fontFamily: "'Outfit', sans-serif" }}>
                           {section.data?.heading || 'Our Values'}
                         </Typography>
                         <Stack spacing={2} sx={{ mt: 3 }}>
                           {section.data?.items?.map((item: string, i: number) => (
                             <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px solid #eadaca', borderRadius: 3 }}>
                               <Typography>✔️</Typography>
                               <Typography variant="body2" fontWeight="bold">{item}</Typography>
                             </Box>
                           ))}
                         </Stack>
                       </Box>
                       <Box sx={{ flex: 1, height: { xs: 200, md: 300 }, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                         {section.data?.image && <img src={section.data.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                       </Box>
                     </Stack>
                   )}
                   {section.type === 'about-services' && (
                     <Box sx={{ py: 4, textAlign: 'center' }}>
                       <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{section.data?.title || 'Our Services'}</Typography>
                       <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{section.data?.subtitle}</Typography>
                       <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="center">
                         {section.data?.items?.map((item: any, i: number) => (
                           <Box key={i} sx={{ p: 3, bgcolor: '#fdf8f4', borderRadius: 4, textAlign: 'left', flex: 1 }}>
                             <Typography variant="h3" sx={{ mb: 2 }}>{item.emoji}</Typography>
                             <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, color: '#a83214' }}>{item.title}</Typography>
                             <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                           </Box>
                         ))}
                       </Stack>
                     </Box>
                   )}
                   {section.type === 'about-why-choose' && (
                     <Box sx={{ py: 4, textAlign: 'center' }}>
                       <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{section.data?.title || 'Why Choose Us'}</Typography>
                       <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>{section.data?.subtitle}</Typography>
                       <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="center">
                         {section.data?.items?.map((item: any, i: number) => (
                           <Box key={i} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #f1f5f9', textAlign: 'left', flex: 1 }}>
                             <Box sx={{ height: 160, bgcolor: '#f1f5f9', position: 'relative' }}>
                               {item.image && <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                               {item.stat && <Box sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: 5 }}><Typography variant="caption" fontWeight="bold" color="#a83214">{item.stat}</Typography></Box>}
                             </Box>
                             <Box sx={{ p: 3 }}>
                               <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>{item.title}</Typography>
                               <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                             </Box>
                           </Box>
                         ))}
                       </Stack>
                     </Box>
                   )}
                </Box>
              ))
            ) : (
              sections.map((section, idx) => (
                <Box key={section.id} sx={{ mb: 10 }}>
                {/* Hero Preview */}
                {section.type === 'hero' && (() => {
                  const validImages = section.data?.images?.filter((img: string) => img?.trim?.() !== '') || [];
                  const displayImages = validImages.length > 0 ? validImages : ['https://s3.us-east-1.amazonaws.com/restaurant.pos.com/uploads/03e5f01c-ba44-45e2-bcc7-fe305a64788e.png'];
                  
                  return (
                    <Box sx={{ 
                      position: 'relative', 
                      height: { xs: '40vh', md: '60vh' }, 
                      bgcolor: '#1b120d', 
                      mx: { xs: -2, md: -3 }, 
                      mt: { xs: -2, md: -4 }, 
                      mb: 4, 
                      overflow: 'hidden', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      textAlign: 'center', 
                      color: 'white' 
                    }}>
                      <img src={displayImages[0]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                      <Box sx={{ position: 'relative', zIndex: 1, p: 4, maxWidth: 900 }}>
                        <Typography variant="h2" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", fontSize: { xs: '1.8rem', sm: '2.5rem' }, dropShadow: '0 20px 13px rgba(0,0,0,0.4)', mb: 1.5 }}>{section.data?.title}</Typography>
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
                  <Stack direction={{ xs: 'column', lg: section.data?.imagePosition === "right" ? "row-reverse" : "row" }} spacing={4} alignItems="stretch" sx={{ py: { xs: 2, md: 6 } }}>
                    <Box sx={{ flex: 1, minHeight: { xs: 260, md: 320 }, borderRadius: 6, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                      <img src={section.data?.image || 'https://images.unsplash.com/photo-1544025162-d76694265947'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="overline" color="#a83214" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.25em', fontSize: '0.65rem' }}>{section.data?.subtitle}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 2 }}>{section.data?.title}</Typography>
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
                    <Typography variant="overline" color="#a83214" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.25em', fontSize: '0.65rem' }}>{section.data?.subtitle}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 4 }}>{section.data?.title}</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                      {section.data?.items?.map((item: any, i: number) => (
                        <Box key={i} sx={{ flex: 1, p: 3, borderRadius: 6, border: '1px solid rgba(230,211,191,0.4)', textAlign: 'left', transition: '0.3s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <Box sx={{ bgcolor: '#f7e1ce', p: 1, borderRadius: 3, display: 'inline-flex', mb: 2, color: '#9f2f16' }}>
                            {getServiceIcon(item.icon)}
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} gutterBottom>{item.title}</Typography>
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
                    <Typography variant="overline" color="#a83214" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.25em', fontSize: '0.65rem', display: 'block', mb: 1 }}>MUST TRY</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#1e293b', mb: 6 }}>{section.data?.title || 'Savor Our Signature Creations'}</Typography>
                    
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
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2 }}>Signature Dish {i}</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: '#fff6e5', color: '#f59e0b', px: 1, py: 0.2, borderRadius: 0.5, fontSize: '0.6rem', fontWeight: 'bold' }}>
                                  ★ 4.{i+5}
                                </Box>
                              </Stack>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#a83214', display: 'block', mb: 2 }}>$14.99</Typography>
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
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 4 }}>What Our Guests Say</Typography>
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
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Guest Name {i}</Typography>
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
            )))}
          </Box>
        </Box>
      </Box>
    )}

      <Dialog 
        open={isResetDialogOpen} 
        onClose={() => setIsResetDialogOpen(false)}
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: { xs: 0, sm: 4 } }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: { xs: 2.5, sm: 3 }, 
          pt: { xs: isMobile ? '54px' : 2.5, sm: 3 },
          bgcolor: isMobile ? 'error.main' : 'transparent',
          color: isMobile ? 'white' : 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Reset Template?
          </Typography>
          {isMobile && <IconButton onClick={() => setIsResetDialogOpen(false)} color="inherit"><Close /></IconButton>}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography sx={{ fontWeight: 500, color: 'text.secondary', lineHeight: 1.6 }}>
            This will replace all your current sections with the default template. 
            Any unsaved changes will be lost. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2.5, sm: 3 }, 
          pb: { xs: isMobile ? '32px' : 2.5, sm: 4 },
          gap: 1.5 
        }}>
          <Button 
            onClick={() => setIsResetDialogOpen(false)} 
            sx={{ 
                flex: 1, 
                borderRadius: 2.5, 
                py: 1.25, 
                fontWeight: 700, 
                fontFamily: "'Outfit', sans-serif" 
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setSections(DEFAULT_HOMEPAGE_SECTIONS);
              setIsResetDialogOpen(false);
              toast.success("Reset to default template. Don't forget to Save Changes!", {
                position: 'top-center',
                style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px', background: '#333', color: '#fff' }
              });
            }}
            color="error" 
            variant="contained"
            sx={{ 
                flex: 1, 
                borderRadius: 2.5, 
                py: 1.25, 
                fontWeight: 800, 
                fontFamily: "'Outfit', sans-serif",
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`
            }}
          >
            Reset All
          </Button>
        </DialogActions>
      </Dialog>

      {/* About Page Reset Dialog */}
      <Dialog 
        open={isAboutResetDialogOpen} 
        onClose={() => setIsAboutResetDialogOpen(false)}
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: { xs: 0, sm: 4 } }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: { xs: 2.5, sm: 3 }, 
          pt: { xs: isMobile ? '54px' : 2.5, sm: 3 },
          bgcolor: isMobile ? 'error.main' : 'transparent',
          color: isMobile ? 'white' : 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Reset About Page?
          </Typography>
          {isMobile && <IconButton onClick={() => setIsAboutResetDialogOpen(false)} color="inherit"><Close /></IconButton>}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography sx={{ fontWeight: 500, color: 'text.secondary', lineHeight: 1.6 }}>
            This will replace all your current About page sections with the default template. 
            Any unsaved changes will be lost. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2.5, sm: 3 }, 
          pb: { xs: isMobile ? '32px' : 2.5, sm: 4 },
          gap: 1.5 
        }}>
          <Button 
            onClick={() => setIsAboutResetDialogOpen(false)} 
            sx={{ flex: 1, borderRadius: 2.5, py: 1.25, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setAboutSections(DEFAULT_ABOUT_SECTIONS);
              setIsAboutResetDialogOpen(false);
              toast.success("About page reset to default. Don't forget to Save Changes!", {
                position: 'top-center',
                style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, borderRadius: '12px', background: '#333', color: '#fff' }
              });
            }}
            color="error" 
            variant="contained"
            sx={{ flex: 1, borderRadius: 2.5, py: 1.25, fontWeight: 800, fontFamily: "'Outfit', sans-serif", boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}` }}
          >
            Reset All
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
    </>
  );
};

export default CustomiseScreensPage;
