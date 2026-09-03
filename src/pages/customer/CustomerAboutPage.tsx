import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Grid,
    Box,
    Card,
    CardMedia,
    CardContent,
    Paper,
    Chip,
    useTheme,
    alpha,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { homepageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { ListSkeleton } from '../../components/common/PageSkeleton';

// ─── Fade-in animation styles ────────────────────────────────────────────────
const fadeInUpStyle = (delay: number = 0): React.CSSProperties => ({
    opacity: 0,
    transform: 'translateY(24px)',
    animation: `fadeInUp 0.6s ease-out ${delay}s forwards`,
});

// ─── Section: About Intro ────────────────────────────────────────────────────
const AboutIntroSection: React.FC<{ data: any }> = ({ data }) => {
    const theme = useTheme();
    if (!data) return null;

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
                <Grid item xs={12} md={6} sx={fadeInUpStyle(0.1)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {data.badgeText && (
                            <Chip
                                label={data.badgeText}
                                sx={{
                                    alignSelf: 'flex-start',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    px: 1,
                                    py: 2.5,
                                    borderRadius: '20px',
                                    '& .MuiChip-label': { px: 1.5 },
                                }}
                                icon={
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: 'primary.main',
                                            ml: 1,
                                        }}
                                    />
                                }
                            />
                        )}
                        {(data.paragraphs || []).map((para: string, idx: number) => (
                            <Typography
                                key={idx}
                                sx={{
                                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                                    color: 'text.secondary',
                                    lineHeight: 1.8,
                                    fontWeight: 400,
                                }}
                            >
                                {para}
                            </Typography>
                        ))}
                    </Box>
                </Grid>

                {data.image && (
                    <Grid item xs={12} md={6} sx={fadeInUpStyle(0.25)}>
                        <Box
                            sx={{
                                borderRadius: '24px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                                position: 'relative',
                            }}
                        >
                            <img
                                src={data.image}
                                alt="About"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    minHeight: 250,
                                    maxHeight: 400,
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)',
                                }}
                            />
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

// ─── Section: About Values ───────────────────────────────────────────────────
const AboutValuesSection: React.FC<{ data: any }> = ({ data }) => {
    const theme = useTheme();
    if (!data) return null;

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
                {data.image && (
                    <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }} sx={fadeInUpStyle(0.1)}>
                        <Box
                            sx={{
                                borderRadius: '24px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                                position: 'relative',
                            }}
                        >
                            <img
                                src={data.image}
                                alt="Values"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    minHeight: 250,
                                    maxHeight: 400,
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)',
                                }}
                            />
                        </Box>
                    </Grid>
                )}

                <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }} sx={fadeInUpStyle(0.25)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {data.badgeText && (
                            <Chip
                                label={data.badgeText}
                                sx={{
                                    alignSelf: 'flex-start',
                                    bgcolor: '#1b120d',
                                    color: '#f4c5a1',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    px: 1,
                                    py: 2.5,
                                    borderRadius: '20px',
                                    '& .MuiChip-label': { px: 1.5 },
                                }}
                                icon={
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: '#f1b789',
                                            ml: 1,
                                        }}
                                    />
                                }
                            />
                        )}
                        {data.heading && (
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 800,
                                    color: 'text.primary',
                                    lineHeight: 1.3,
                                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                                }}
                            >
                                {data.heading}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                            {(data.items || []).map((item: string, index: number) => (
                                <Paper
                                    key={index}
                                    elevation={0}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: { xs: 1.5, md: 2 },
                                        borderRadius: '14px',
                                        border: '1px solid',
                                        borderColor: alpha('#eadaca', 0.6),
                                        bgcolor: 'background.paper',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateX(4px)',
                                            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}`,
                                        },
                                    }}
                                >
                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
                                        {item}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

// ─── Section: About Services ─────────────────────────────────────────────────
const AboutServicesSection: React.FC<{ data: any }> = ({ data }) => {
    const theme = useTheme();
    if (!data) return null;

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }} style={fadeInUpStyle(0.1)}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        color: 'text.primary',
                        mb: 1.5,
                        fontSize: { xs: '1.5rem', md: '2rem' },
                    }}
                >
                    {data.title}
                </Typography>
                {data.subtitle && (
                    <Typography
                        sx={{
                            fontSize: { xs: '0.9rem', md: '1.05rem' },
                            color: 'text.secondary',
                            maxWidth: 600,
                            mx: 'auto',
                        }}
                    >
                        {data.subtitle}
                    </Typography>
                )}
            </Box>

            <Paper
                elevation={0}
                sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.8)} 0%, ${alpha(theme.palette.grey[200], 0.5)} 100%)`,
                    borderRadius: '28px',
                    p: { xs: 2.5, md: 4 },
                    overflow: 'hidden',
                }}
            >
                <Grid container spacing={{ xs: 2, md: 3 }}>
                    {(data.items || []).map((item: any, index: number) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    borderRadius: '20px',
                                    bgcolor: alpha('#fff', 0.8),
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid',
                                    borderColor: alpha('#fff', 0.5),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.03)',
                                        boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
                                    },
                                    ...fadeInUpStyle(0.15 + index * 0.08),
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: { xs: 44, md: 52 },
                                                height: { xs: 44, md: 52 },
                                                borderRadius: '50%',
                                                bgcolor: alpha('#FFC107', 0.15),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: { xs: '1.4rem', md: '1.6rem' },
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.emoji || '⭐'}
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: { xs: '1rem', md: '1.15rem' },
                                                color: '#b8860b',
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: { xs: '0.85rem', md: '0.9rem' },
                                            color: 'text.secondary',
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        {item.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
};

// ─── Section: Why Choose Us ──────────────────────────────────────────────────
const AboutWhyChooseSection: React.FC<{ data: any }> = ({ data }) => {
    const theme = useTheme();
    if (!data) return null;

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }} style={fadeInUpStyle(0.1)}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        color: 'text.primary',
                        mb: 1.5,
                        fontSize: { xs: '1.5rem', md: '2rem' },
                    }}
                >
                    {data.title}
                </Typography>
                {data.subtitle && (
                    <Typography
                        sx={{
                            fontSize: { xs: '0.9rem', md: '1.05rem' },
                            color: 'text.secondary',
                            maxWidth: 600,
                            mx: 'auto',
                        }}
                    >
                        {data.subtitle}
                    </Typography>
                )}
            </Box>

            <Grid container spacing={{ xs: 2.5, md: 3 }}>
                {(data.items || []).map((feature: any, index: number) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card
                            elevation={0}
                            sx={{
                                height: '100%',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.08),
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-6px)',
                                    boxShadow: `0 20px 50px ${alpha(theme.palette.common.black, 0.1)}`,
                                    '& .feature-img': {
                                        transform: 'scale(1.08)',
                                    },
                                },
                                ...fadeInUpStyle(0.1 + index * 0.08),
                            }}
                        >
                            <Box sx={{ position: 'relative', height: 200, overflow: 'hidden', bgcolor: 'grey.100' }}>
                                {feature.image && (
                                    <CardMedia
                                        className="feature-img"
                                        component="img"
                                        image={feature.image}
                                        alt={feature.title}
                                        sx={{
                                            height: '100%',
                                            objectFit: 'cover',
                                            transition: 'transform 0.5s ease',
                                        }}
                                    />
                                )}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)',
                                    }}
                                />
                                {feature.stat && (
                                    <Chip
                                        label={feature.stat}
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            bgcolor: alpha('#fff', 0.9),
                                            backdropFilter: 'blur(8px)',
                                            fontWeight: 700,
                                            color: 'primary.main',
                                            fontSize: '0.75rem',
                                        }}
                                    />
                                )}
                            </Box>
                            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: { xs: '1rem', md: '1.1rem' },
                                        color: 'text.primary',
                                        mb: 1,
                                    }}
                                >
                                    {feature.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '0.85rem',
                                        color: 'text.secondary',
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {feature.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const CustomerAboutPage: React.FC = () => {
    const theme = useTheme();
    const { tenantSlug } = useAuth();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<any[]>([]);

    useEffect(() => {
        const loadContent = async () => {
            if (!tenantSlug) return;
            try {
                setLoading(true);
                const response = await homepageAPI.getPublicAboutContent(tenantSlug);
                if (response.data?.aboutSections && response.data.aboutSections.length > 0) {
                    setSections(response.data.aboutSections);
                } else {
                    setSections([]);
                }
            } catch (error) {
                console.error('Error loading about page content', error);
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, [tenantSlug]);

    if (loading) {
        return <ListSkeleton count={4} />;
    }

    const restaurantName = settings?.restaurant?.name || 'Our Restaurant';

    return (
        <>
            {/* CSS keyframe animation */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(24px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
                {/* Page Header */}
                <Box
                    sx={{
                        textAlign: 'center',
                        mb: { xs: 4, md: 6 },
                        pt: { xs: 1, md: 2 },
                    }}
                    style={fadeInUpStyle(0)}
                >
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 900,
                            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main || '#7C3AED'})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1.5,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        About {restaurantName}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: '0.9rem', md: '1.05rem' },
                            color: 'text.secondary',
                            maxWidth: 500,
                            mx: 'auto',
                            lineHeight: 1.6,
                        }}
                    >
                        Discover our story, values, and what makes us special
                    </Typography>
                </Box>

                {/* Dynamic Sections */}
                {sections.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            textAlign: 'center',
                            py: 10,
                            px: 3,
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            border: '2px dashed',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="h6" color="text.secondary">
                            About page content is being prepared.
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                            Check back soon for more details about {restaurantName}.
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 4 } }}>
                        {sections.map((section: any, idx: number) => (
                            <Box key={section.id || idx}>
                                {section.type === 'about-intro' && <AboutIntroSection data={section.data} />}
                                {section.type === 'about-values' && <AboutValuesSection data={section.data} />}
                                {section.type === 'about-services' && <AboutServicesSection data={section.data} />}
                                {section.type === 'about-why-choose' && <AboutWhyChooseSection data={section.data} />}
                            </Box>
                        ))}
                    </Box>
                )}
            </Container>
        </>
    );
};

export default CustomerAboutPage;
