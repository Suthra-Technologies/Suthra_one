import { alpha, createTheme, type Theme } from '@mui/material/styles';
import { BRAND_CONFIG } from '../config/brandConfig';

const getPalette = (mode: 'light' | 'dark') => ({
    mode,
    primary: {
        main: BRAND_CONFIG.primaryColor,
        light: alpha(BRAND_CONFIG.primaryColor, 0.7),
        dark: alpha(BRAND_CONFIG.primaryColor, 0.85),
        contrastText: '#ffffff',
    },
    secondary: {
        main: BRAND_CONFIG.secondaryColor,
        light: alpha(BRAND_CONFIG.secondaryColor, 0.7),
        dark: alpha(BRAND_CONFIG.secondaryColor, 0.85),
        contrastText: '#ffffff',
    },
    success: {
        main: '#10B981', // Emerald 500
        light: '#34D399',
        dark: '#059669',
    },
    warning: {
        main: '#F59E0B', // Amber 500
        light: '#FBBF24',
        dark: '#D97706',
    },
    error: {
        main: '#EF4444', // Red 500
        light: '#F87171',
        dark: '#B91C1C',
    },
    background: {
        default: mode === 'light' ? '#F3F4F6' : '#0F172A', // Cool gray 100 or Slate 900
        paper: mode === 'light' ? '#FFFFFF' : '#1E293B',  // White or Slate 800
    },
    text: {
        primary: mode === 'light' ? '#111827' : '#F8FAFC', // Gray 900 or Slate 50
        secondary: mode === 'light' ? '#4B5563' : '#94A3B8', // Gray 600 or Slate 400
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
});


export const getTheme = (mode: 'light' | 'dark'): Theme => createTheme({
    palette: getPalette(mode),
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 500 },
        subtitle2: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // 3 - Soft card shadow
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // 4 - Hover shadow
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // 5 - Modal shadow
        ...Array(19).fill('none'),
    ] as any,
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: mode === 'light' ? '#F3F4F6' : '#0F172A',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: mode === 'light' ? '#f1f1f1' : '#1e293b',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: mode === 'light' ? '#c1c1c1' : '#334155',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: mode === 'light' ? '#a8a8a8' : '#475569',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                    transition: 'all 0.2s ease-in-out',
                },
                containedPrimary: {
                    boxShadow: mode === 'light'
                        ? `0 4px 6px -1px ${alpha(BRAND_CONFIG.primaryColor, 0.3)}, 0 2px 4px -1px ${alpha(BRAND_CONFIG.primaryColor, 0.16)}`
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: mode === 'light'
                            ? `0 6px 8px -1px ${alpha(BRAND_CONFIG.primaryColor, 0.4)}, 0 3px 6px -1px ${alpha(BRAND_CONFIG.primaryColor, 0.2)}`
                            : '0 6px 8px -1px rgba(0, 0, 0, 0.6)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: mode === 'light'
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
                    border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.03)' : '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundImage: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                rounded: {
                    borderRadius: 12,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        background: mode === 'light' ? 'transparent' : alpha('#0F172A', 0.2),
                        '& fieldset': {
                            borderColor: mode === 'light' ? '#E5E7EB' : 'rgba(255, 255, 255, 0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: mode === 'light' ? '#9CA3AF' : 'rgba(255, 255, 255, 0.2)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: BRAND_CONFIG.primaryColor,
                            borderWidth: 2,
                        },
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 600,
                    backgroundColor: mode === 'light' ? '#F9FAFB' : alpha('#1E293B', 0.5),
                    color: mode === 'light' ? '#374151' : '#F8FAFC',
                    fontSize: '0.875rem',
                    borderBottom: mode === 'light' ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.05)',
                },
                body: {
                    fontSize: '0.875rem',
                    borderBottom: mode === 'light' ? '1px solid #F3F4F6' : '1px solid rgba(255, 255, 255, 0.03)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                    color: mode === 'light' ? '#111827' : '#F8FAFC',
                    borderBottom: mode === 'light' ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.05)',
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                    borderRight: mode === 'light' ? '1px solid #E5E7EB' : '1px solid rgba(255, 255, 255, 0.05)',
                }
            }
        }
    },
});

const theme = getTheme('light');
export default theme;
