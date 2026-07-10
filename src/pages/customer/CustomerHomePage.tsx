import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Grid,
    Box,
    Card,
    CardMedia,
    CardContent,
    Button,
    IconButton,
    CircularProgress,
    Paper,
    Chip,
    useTheme,
    alpha,
    Fade,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Rating,
    Zoom,
    Badge,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    CalendarMonth as CalendarIcon,
    Celebration as PartyIcon,
    ShoppingBag as OrderIcon,
    Star as StarIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
    ChevronRight as ChevronIcon,
    ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { homepageAPI, menuAPI } from '../../services/api';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import { useSettings } from '../../context/SettingsContext';
import { useGuestCart } from '../../context/GuestCartContext';
import dompurify from 'dompurify';

// ─── Fade-in animation styles ────────────────────────────────────────────────
const fadeInUpStyle = (delay: number = 0): React.CSSProperties => ({
    opacity: 0,
    transform: 'translateY(24px)',
    animation: `fadeInUp 0.6s ease-out ${delay}s forwards`,
});

// ─── Dietary Symbol ──────────────────────────────────────────────────────────
const DietarySymbol = ({ type }: { type?: 'veg' | 'non-veg' }) => {
    if (!type) return null;
    const isVeg = type === 'veg';
    const color = isVeg ? '#24a159' : '#b22d2d';
    return (
        <Box sx={{
            border: `2px solid ${color}`,
            width: 15,
            height: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '2px',
            mr: 1.2
        }}>
            <Box sx={{
                width: isVeg ? 7.5 : 9,
                height: isVeg ? 7.5 : 9,
                borderRadius: isVeg ? '50%' : '1px',
                bgcolor: color,
                clipPath: isVeg ? 'none' : 'polygon(50% 10%, 0% 100%, 100% 100%)'
            }} />
        </Box>
    );
};

// ─── Section 1: Hero Carousel ────────────────────────────────────────────────
interface HeroProps {
    data: any;
    onOrderClick: () => void;
    onBookClick: () => void;
}
const HeroSection: React.FC<HeroProps> = ({ data, onOrderClick, onBookClick }) => {
    const theme = useTheme();
    const [index, setIndex] = useState(0);
    const validImages = data?.images?.filter((img: string) => img?.trim?.() !== '') || [];
    const images = validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80'];

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [images.length]);

    return (
        <Box sx={{
            position: 'relative',
            width: '100%',
            height: { xs: '260px', sm: '350px', md: '440px' },
            overflow: 'hidden',
            bgcolor: '#1b120d',
            mb: 3,
        }}>
            <Box sx={{
                display: 'flex',
                width: `${images.length * 100}%`,
                height: '100%',
                transform: `translateX(-${(index * 100) / images.length}%)`,
                transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                {images.map((img: string, i: number) => (
                    <Box
                        key={i}
                        component="img"
                        src={img}
                        alt=""
                        sx={{
                            width: `${100 / images.length}%`,
                            height: '100%',
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                ))}
            </Box>

            {/* Static Dark overlay */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.45)',
                zIndex: 1,
            }} />

            <Box sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                px: 3,
                zIndex: 2,
            }}>
                <Box sx={{ maxWidth: 800, ...fadeInUpStyle(0.2) }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 900,
                            color: 'white',
                            fontSize: { xs: '1.25rem', sm: '2.1rem', md: '2.8rem', lg: '3.2rem' },
                            lineHeight: 1.15,
                            letterSpacing: '-0.03em',
                            mb: 1.5,
                            textShadow: '0 4px 15px rgba(0,0,0,0.4)',
                            fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
                            '&.MuiTypography-root.MuiTypography-h2': {
                                color: 'white !important',
                            }
                        }}
                    >
                        {data?.title || 'Authentic Culinary Experience'}
                    </Typography>
                    <Typography
                        sx={{
                            color: 'rgba(255,255,255,0.92)',
                            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.05rem' },
                            fontWeight: 400,
                            lineHeight: 1.5,
                            mb: 2.5,
                            maxWidth: 600,
                            mx: 'auto',
                            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                    >
                        {data?.description || 'Indulge in our carefully prepared gourmet dishes crafted with standard traditional recipes and fresh local ingredients.'}
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        justifyContent="center"
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onOrderClick}
                            sx={{
                                borderRadius: '30px',
                                px: 3.5,
                                py: { xs: 1, sm: 1.25 },
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                textTransform: 'none',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.35)}`,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                }
                            }}
                        >
                            Order Online
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={onBookClick}
                            sx={{
                                borderRadius: '30px',
                                px: 3.5,
                                py: { xs: 1, sm: 1.25 },
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                textTransform: 'none',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.4)',
                                backdropFilter: 'blur(8px)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                '&:hover': {
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                }
                            }}
                        >
                            Book a Table
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {images.length > 1 && (
                <>
                    <IconButton
                        onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
                        sx={{
                            position: 'absolute',
                            left: { xs: 8, sm: 16 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                            zIndex: 3,
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => setIndex((prev) => (prev + 1) % images.length)}
                        sx={{
                            position: 'absolute',
                            right: { xs: 8, sm: 16 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.3)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                            zIndex: 3,
                        }}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                    <Box sx={{
                        position: 'absolute',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 1,
                        zIndex: 3,
                    }}>
                        {images.map((_: any, i: number) => (
                            <Box
                                key={i}
                                component="button"
                                onClick={() => setIndex(i)}
                                sx={{
                                    border: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    width: i === index ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: i === index ? 'white' : 'rgba(255,255,255,0.4)',
                                    transition: 'all 0.3s ease',
                                    p: 0,
                                }}
                            />
                        ))}
                    </Box>
                </>
            )}
        </Box>
    );
};

// ─── Section 2: Hospitality Section ──────────────────────────────────────────
interface HospitalityProps {
    data: any;
    onExploreClick: () => void;
}
const HospitalitySection: React.FC<HospitalityProps> = ({ data, onExploreClick }) => {
    const theme = useTheme();
    if (!data) return null;
    const isImageRight = data.imagePosition === 'right';

    return (
        <Box sx={{ py: { xs: 1.5, md: 2.5 } }} style={fadeInUpStyle(0.2)}>
            <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
                <Grid
                    item
                    xs={12}
                    md={6}
                    order={{ xs: 2, md: isImageRight ? 1 : 2 }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {data.subtitle && (
                            <Typography
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    fontSize: '0.75rem',
                                }}
                            >
                                {data.subtitle}
                            </Typography>
                        )}
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 900,
                                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
                                color: 'text.primary',
                                lineHeight: 1.25,
                                letterSpacing: '-0.02em',
                                fontFamily: '"Outfit", sans-serif',
                            }}
                        >
                            {data.title}
                        </Typography>
                        {data.description?.map((para: string, idx: number) => (
                            <Typography
                                key={idx}
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.7,
                                }}
                            >
                                {para}
                            </Typography>
                        ))}
                        <Box sx={{ pt: 1 }}>
                            <Button
                                variant="contained"
                                onClick={onExploreClick}
                                endIcon={<ArrowForwardIcon />}
                                sx={{
                                    borderRadius: '24px',
                                    px: 3.5,
                                    py: 1.25,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    bgcolor: 'primary.main',
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                    },
                                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.15)}`,
                                }}
                            >
                                Explore Our Story
                            </Button>
                        </Box>
                    </Box>
                </Grid>

                {data.image && (
                    <Grid
                        item
                        xs={12}
                        md={6}
                        order={{ xs: 1, md: isImageRight ? 2 : 1 }}
                    >
                        <Box sx={{
                            borderRadius: '24px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
                            position: 'relative',
                        }}>
                            <Box
                                component="img"
                                src={data.image}
                                alt="Hospitality Image"
                                sx={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: 400,
                                    objectFit: 'cover',
                                    display: 'block',
                                    transition: 'transform 0.5s ease',
                                    '&:hover': {
                                        transform: 'scale(1.03)',
                                    }
                                }}
                            />
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

// ─── Section 3: Services Section ─────────────────────────────────────────────
interface ServicesProps {
    data: any;
    onServiceClick: (path: string) => void;
}
const ServicesSection: React.FC<ServicesProps> = ({ data, onServiceClick }) => {
    const theme = useTheme();
    if (!data) return null;

    const getIconComponent = (iconName: string) => {
        const iconStyle = { fontSize: 32 };
        switch (iconName) {
            case 'CalendarRange': return <CalendarIcon sx={iconStyle} />;
            case 'PartyPopper': return <PartyIcon sx={iconStyle} />;
            case 'ShoppingBag': return <OrderIcon sx={iconStyle} />;
            default: return <OrderIcon sx={iconStyle} />;
        }
    };

    return (
        <Box sx={{ py: { xs: 1.5, md: 2.5 } }} style={fadeInUpStyle(0.3)}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                {data.subtitle && (
                    <Typography
                        sx={{
                            color: 'primary.main',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            fontSize: '0.75rem',
                            mb: 1,
                        }}
                    >
                        {data.subtitle}
                    </Typography>
                )}
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 900,
                        fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
                        color: 'text.primary',
                        fontFamily: '"Outfit", sans-serif',
                    }}
                >
                    {data.title}
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {data.items?.map((item: any, idx: number) => (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Paper
                            elevation={0}
                            onClick={() => onServiceClick(item.path)}
                            sx={{
                                p: 3.5,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                borderRadius: '24px',
                                border: '1px solid rgba(0,0,0,0.06)',
                                bgcolor: 'background.paper',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-6px)',
                                    boxShadow: '0 16px 36px rgba(0,0,0,0.06)',
                                    borderColor: 'primary.light',
                                    '& .service-icon-box': {
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                    }
                                }
                            }}
                        >
                            <Box
                                className="service-icon-box"
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '20px',
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 2.5,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {getIconComponent(item.icon)}
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    mb: 1.2,
                                    color: 'text.primary',
                                    fontSize: '1.1rem',
                                }}
                            >
                                {item.title}
                            </Typography>
                            <Typography
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.6,
                                }}
                            >
                                {item.description}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

// ─── Section 4: Featured Items Section ────────────────────────────────────────
interface FeaturedProps {
    data: any;
    items: any[];
    onAddToCart: (item: any) => void;
    getItemQuantity: (id: string) => number;
    onRemoveFromCart: (id: string) => void;
    formatCurrency: (amount: number) => string;
}
const FeaturedItemsSection: React.FC<FeaturedProps> = ({
    data,
    items,
    onAddToCart,
    getItemQuantity,
    onRemoveFromCart,
    formatCurrency,
}) => {
    const theme = useTheme();
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isHovered || items.length === 0) return;
        const timer = setInterval(() => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                // Card width is 240px + gap is 24px (gap: 3 is 24px) = 264px
                const cardWidth = 264;
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollRef.current.scrollTo({ left: scrollLeft + cardWidth, behavior: 'smooth' });
                }
            }
        }, 3500);
        return () => clearInterval(timer);
    }, [items.length, isHovered]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft } = scrollRef.current;
            const cardWidth = 264;
            const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
            scrollRef.current.scrollTo({ left: scrollLeft + scrollAmount, behavior: 'smooth' });
        }
    };

    if (!data || items.length === 0) return null;

    return (
        <Box sx={{ py: { xs: 1.5, md: 2.5 }, position: 'relative' }} style={fadeInUpStyle(0.3)}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                    sx={{
                        color: 'primary.main',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.25em',
                        fontSize: '0.75rem',
                        mb: 0.5,
                    }}
                >
                    Must Try
                </Typography>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 900,
                        fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.5rem' },
                        color: 'text.primary',
                        fontFamily: '"Outfit", sans-serif',
                    }}
                >
                    {data.title || 'Savor Our Signature Creations'}
                </Typography>
            </Box>

            <Box sx={{ position: 'relative', width: '100%' }}>
                {/* Left Floating Arrow Button */}
                <IconButton
                    onClick={() => scroll('left')}
                    sx={{
                        position: 'absolute',
                        left: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'background.paper',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        '&:hover': { bgcolor: 'background.paper', transform: 'translateY(-50%) scale(1.05)' },
                        display: { xs: 'none', sm: 'flex' },
                    }}
                >
                    <ArrowBackIcon />
                </IconButton>

                {/* Carousel Row */}
                <Box
                    ref={scrollRef}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onTouchStart={() => setIsHovered(true)}
                    onTouchEnd={() => setIsHovered(false)}
                    sx={{
                        display: 'flex',
                        gap: 3,
                        overflowX: 'auto',
                        width: '100%',
                        py: 2,
                        px: 1,
                        '&::-webkit-scrollbar': { display: 'none' },
                        '-ms-overflow-style': 'none',
                        scrollbarWidth: 'none',
                        scrollSnapType: 'x mandatory',
                    }}
                >
                    {items.map((item) => {
                        const qty = getItemQuantity(item._id);
                        return (
                            <Card key={item._id} sx={{
                                minWidth: 240,
                                maxWidth: 240,
                                flexShrink: 0,
                                scrollSnapAlign: 'start',
                                borderRadius: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                border: '1px solid rgba(0,0,0,0.06)',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
                                transition: 'transform 0.3s ease',
                                '&:hover': { transform: 'translateY(-6px)' }
                            }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                                    alt={item.name}
                                    sx={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
                                />
                                <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Typography fontWeight="800" sx={{ color: 'text.primary', fontSize: '0.95rem', lineHeight: 1.2 }}>{item.name}</Typography>
                                        <Box sx={{ bgcolor: alpha('#FBBF24', 0.1), borderRadius: '6px', px: 0.8, py: 0.25, display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                            <StarIcon sx={{ fontSize: 13, color: '#FBBF24' }} />
                                            <Typography variant="caption" fontWeight="bold" sx={{ color: '#b27b00', fontSize: '0.75rem' }}>{typeof item.rating === 'number' ? item.rating : item.rating?.average || '4.1'}</Typography>
                                        </Box>
                                    </Box>
                                    <Typography fontWeight="900" color="primary" sx={{ fontSize: '1rem', mt: 0.5 }}>{formatCurrency(item.price)}</Typography>
                                    <Box sx={{ mt: 'auto', pt: 1 }}>
                                        {qty > 0 ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '30px', px: 1.5, height: 38 }}>
                                                <IconButton size="small" onClick={() => onRemoveFromCart(item._id)} sx={{ color: 'primary.main', p: 0.5 }}><RemoveIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                <Typography fontWeight="800" color="primary.main" sx={{ fontSize: '0.9rem' }}>{qty}</Typography>
                                                <IconButton size="small" onClick={() => onAddToCart(item)} sx={{ color: 'primary.main', p: 0.5 }}><AddIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                            </Box>
                                        ) : (
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                onClick={() => onAddToCart(item)}
                                                sx={{
                                                    borderRadius: '30px',
                                                    textTransform: 'none',
                                                    fontWeight: 800,
                                                    height: 38,
                                                    fontSize: '0.9rem',
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                                                    boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.25)}`,
                                                    '&:hover': {
                                                        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                                    }
                                                }}
                                            >
                                                Add to cart
                                            </Button>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>

                {/* Right Floating Arrow Button */}
                <IconButton
                    onClick={() => scroll('right')}
                    sx={{
                        position: 'absolute',
                        right: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'background.paper',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        '&:hover': { bgcolor: 'background.paper', transform: 'translateY(-50%) scale(1.05)' },
                        display: { xs: 'none', sm: 'flex' },
                    }}
                >
                    <ArrowForwardIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

// ─── Section 5: Online Order Links Section ────────────────────────────────────
interface OnlineOrderProps {
    data: any;
    onOrderClick: () => void;
}
const OnlineOrderSection: React.FC<OnlineOrderProps> = ({ data, onOrderClick }) => {
    const theme = useTheme();
    if (!data) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 4, md: 6 },
                my: 2,
                borderRadius: '32px',
                textAlign: 'center',
                bgcolor: '#141d24',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            style={fadeInUpStyle(0.35)}
        >
            {/* Background elements */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 70%)`,
                pointerEvents: 'none',
                zIndex: 1,
            }} />
            <Box sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url('https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1000&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.1,
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                    variant="h4"
                    sx={{
                        color: 'white',
                        mb: 4,
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic',
                        fontWeight: 300,
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        '&.MuiTypography-root.MuiTypography-h4': {
                            color: 'white !important',
                        }
                    }}
                >
                    Online Order
                </Typography>

                <Stack
                    direction="row"
                    spacing={{ xs: 2, sm: 4 }}
                    justifyContent="center"
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ gap: 2 }}
                >
                    {data.showOurSystem && (
                        <Box
                            component="button"
                            onClick={onOrderClick}
                            sx={{
                                width: { xs: 90, sm: 110 },
                                height: { xs: 90, sm: 110 },
                                borderRadius: '24px',
                                bgcolor: '#e69f24',
                                color: '#0f172a',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.05) translateY(-4px)',
                                    boxShadow: '0 10px 20px rgba(230,159,36,0.3)',
                                }
                            }}
                        >
                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1.25, textAlign: 'center', px: 1 }}>
                                Our Online<br />Ordering<br />System
                            </Typography>
                        </Box>
                    )}

                    {data.showDoordash && (
                        <Box
                            component="a"
                            href={data.doordashLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                width: { xs: 90, sm: 110 },
                                height: { xs: 90, sm: 110 },
                                borderRadius: '24px',
                                bgcolor: '#ff3008',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.05) translateY(-4px)',
                                    boxShadow: '0 10px 20px rgba(255,48,8,0.3)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Box sx={{ width: 24, height: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, bgcolor: 'white', mb: 0.5 }} />
                                <Typography sx={{ fontWeight: 900, fontSize: '0.65rem', color: 'white', letterSpacing: '-0.02em' }}>DOORDASH</Typography>
                            </Box>
                        </Box>
                    )}

                    {data.showUberEats && (
                        <Box
                            component="a"
                            href={data.uberEatsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                width: { xs: 90, sm: 110 },
                                height: { xs: 90, sm: 110 },
                                borderRadius: '24px',
                                bgcolor: '#131b20',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.05) translateY(-4px)',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                                }
                            }}
                        >
                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, color: 'white', lineHeight: 1.1 }}>
                                Uber
                            </Typography>
                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, color: '#06c167', lineHeight: 1.1 }}>
                                Eats
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </Box>
        </Paper>
    );
};

// ─── Section 6: Testimonials Section ──────────────────────────────────────────
interface TestimonialsProps {
    data: any;
}
const TestimonialsSection: React.FC<TestimonialsProps> = ({ data }) => {
    const theme = useTheme();
    if (!data) return null;

    const mockTestimonials = [
        { name: "Sarah J.", rating: 5, quote: "The flavors here are incredibly rich and authentic. The service is fast and extremely professional!", role: "Regular Diner" },
        { name: "Michael R.", rating: 5, quote: "Beautiful experience booking tables. Catering services for our company event was flawless. Highly recommend!", role: "Event Manager" },
        { name: "David L.", rating: 5, quote: "Excellent ordering system. Food was hot, packaging was neat, and spice levels were exactly as requested.", role: "Online Customer" }
    ];

    return (
        <Box sx={{ py: { xs: 2, md: 3.5 } }} style={fadeInUpStyle(0.4)}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                    sx={{
                        color: 'primary.main',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        fontSize: '0.75rem',
                        mb: 1,
                    }}
                >
                    Reviews
                </Typography>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 900,
                        fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
                        color: 'text.primary',
                        fontFamily: '"Outfit", sans-serif',
                    }}
                >
                    {data.title || 'What Our Customers Say'}
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {mockTestimonials.map((testimonial, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3.5,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '24px',
                                border: '1px solid rgba(0,0,0,0.06)',
                                bgcolor: 'background.paper',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 12px 30px rgba(0,0,0,0.05)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <StarIcon key={i} sx={{ color: '#FBBF24', fontSize: 18 }} />
                                ))}
                            </Box>
                            <Typography
                                sx={{
                                    fontStyle: 'italic',
                                    color: 'text.secondary',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.7,
                                    mb: 4,
                                    flexGrow: 1,
                                }}
                            >
                                "{testimonial.quote}"
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                }}>
                                    {testimonial.name[0]}
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                                        {testimonial.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {testimonial.role}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

// ─── Main Customer Home Page Component ────────────────────────────────────────
const CustomerHomePage: React.FC = () => {
    const { slug, getRelativePath } = useActiveTenant();
    const navigate = useNavigate();
    const theme = useTheme();
    const { formatCurrency, settings } = useSettings();
    const { cart, addItem, updateQuantity } = useGuestCart();

    const [sections, setSections] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [spiceSelectionItem, setSpiceSelectionItem] = useState<any | null>(null);

    // Fetch dynamic content and featured items
    useEffect(() => {
        if (!slug) return;

        const loadHomeContent = async () => {
            try {
                setLoading(true);
                const [homeResponse, menuResponse] = await Promise.all([
                    homepageAPI.getPublicContent(slug),
                    menuAPI.getPublicMenu(slug),
                ]);

                if (homeResponse.data && homeResponse.data.sections) {
                    setSections(homeResponse.data.sections);
                }
                if (menuResponse.data && menuResponse.data.items) {
                    // Filter featured or grab first few items
                    const allItems = menuResponse.data.items.filter((item: any) => item.isAvailable);
                    const featured = allItems.filter((i: any) => i.isFeatured).slice(0, 6);
                    setMenuItems(featured.length > 0 ? featured : allItems.slice(0, 6));
                }
            } catch (error) {
                console.error('Error fetching homepage details:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHomeContent();
    }, [slug]);

    const getItemQuantity = (itemId: string) => {
        return cart.items.find(c => c.id === itemId)?.quantity || 0;
    };

    const handleAddToCart = (item: any) => {
        if (item.isSpiceLevelAvailable) {
            setSpiceSelectionItem(item);
        } else {
            addItem(item, 1, [], '');
        }
    };

    const handleConfirmSpice = (spiceLevel: string) => {
        if (spiceSelectionItem) {
            addItem(spiceSelectionItem, 1, [], spiceLevel);
            setSpiceSelectionItem(null);
        }
    };

    const handleRemoveFromCart = (itemId: string) => {
        const itemIndex = cart.items.findIndex(c => c.id === itemId);
        if (itemIndex >= 0) {
            updateQuantity(itemIndex, cart.items[itemIndex].quantity - 1);
        }
    };

    const SpiceLevelDialog = () => {
        if (!spiceSelectionItem) return null;
        const levels = spiceSelectionItem.spiceLevels && spiceSelectionItem.spiceLevels.length > 0
            ? spiceSelectionItem.spiceLevels
            : ['mild', 'medium', 'hot', 'extra hot'];

        return (
            <Dialog
                open={Boolean(spiceSelectionItem)}
                onClose={() => setSpiceSelectionItem(null)}
                PaperProps={{
                    sx: { borderRadius: 5, width: '100%', maxWidth: 350, p: 1 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                    <Typography variant="h6" fontWeight="900">Select Spice Level</Typography>
                    <Typography variant="body2" color="text.secondary">{spiceSelectionItem?.name}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {levels.map((level: string) => (
                            <Button
                                key={level}
                                variant="outlined"
                                fullWidth
                                onClick={() => handleConfirmSpice(level?.toLowerCase())}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: '700',
                                    color: 'text.primary',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        borderColor: 'primary.main',
                                        color: 'primary.main'
                                    }
                                }}
                            >
                                {level.charAt(0)?.toUpperCase() + level.slice(1).replace(/_/g, ' ')}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    return (
        <Box sx={{
            mx: { xs: -1, sm: -2 },
            mt: { xs: -2, md: -3 },
            overflowX: 'hidden',
            bgcolor: 'transparent',
        }}>
            {/* CSS Animation Keyframes */}
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

            <SpiceLevelDialog />

            {/* 1. Hero Section - Full width directly in breakout container */}
            {sections.filter(s => s.type === 'hero').map((section, idx) => (
                <HeroSection
                    key={section.id || idx}
                    data={section.data}
                    onOrderClick={() => navigate(getRelativePath('/customer/order'))}
                    onBookClick={() => navigate(getRelativePath('/customer/book-table'))}
                />
            ))}

            {/* 2. Other Sections - Centered in standard container */}
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
                {sections.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Typography variant="h5" color="text.secondary">Welcome to Our Portal</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2.5 }, py: 1 }}>
                        {sections.filter(s => s.type !== 'hero').map((section, idx) => (
                            <Box key={section.id || idx}>
                                {section.type === 'hospitality' && (
                                    <HospitalitySection
                                        data={section.data}
                                        onExploreClick={() => navigate(getRelativePath('/customer/about'))}
                                    />
                                )}
                                {section.type === 'services' && (
                                    <ServicesSection
                                        data={section.data}
                                        onServiceClick={(path) => navigate(getRelativePath(path === '/menu' ? '/customer/order' : `/customer${path}`))}
                                    />
                                )}
                                {section.type === 'featured-items' && (
                                    <FeaturedItemsSection
                                        data={section.data}
                                        items={menuItems}
                                        onAddToCart={handleAddToCart}
                                        getItemQuantity={getItemQuantity}
                                        onRemoveFromCart={handleRemoveFromCart}
                                        formatCurrency={formatCurrency}
                                    />
                                )}
                                {section.type === 'online-order' && (
                                    <OnlineOrderSection
                                        data={section.data}
                                        onOrderClick={() => navigate(getRelativePath('/customer/order'))}
                                    />
                                )}
                                {section.type === 'testimonials' && (
                                    <TestimonialsSection data={section.data} />
                                )}
                                {section.type === 'rich-text' && (
                                    <Box
                                        sx={{
                                            py: 4,
                                            typography: 'body1',
                                            '& img': { maxWidth: '100%', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                                        }}
                                        dangerouslySetInnerHTML={{ __html: dompurify.sanitize(section.data?.html || '') }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </Container>

            {/* Sticky Cart bar parity on Home Page */}
            {cart.items.length > 0 && (
                <Box sx={{
                    position: 'fixed',
                    bottom: { xs: 12, sm: 24 },
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 1000,
                    px: { xs: 1, sm: 2 },
                    pointerEvents: 'none',
                }}>
                    <Zoom in>
                        <Paper
                            elevation={15}
                            sx={{
                                p: { xs: 1.25, sm: 1.5 },
                                bgcolor: '#1a1a1a',
                                color: 'white',
                                borderRadius: { xs: 4, sm: 10 },
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: { xs: 1, sm: 2 },
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(20px)',
                                width: { xs: '100%', sm: '420px' },
                                maxWidth: { xs: '100%', sm: 420 },
                                pointerEvents: 'auto',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 2 }, ml: { xs: 0.25, sm: 1 }, minWidth: 0 }}>
                                <Badge
                                    badgeContent={cart.totalItems}
                                    color="error"
                                    overlap="circular"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem',
                                            height: 22,
                                            minWidth: 22,
                                            border: '2px solid #1a1a1a'
                                        }
                                    }}
                                >
                                    <Box sx={{
                                        width: 44,
                                        height: 44,
                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'primary.main'
                                    }}>
                                        <CartIcon />
                                    </Box>
                                </Badge>
                                <Box>
                                    <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.85rem' }}>Total Order</Typography>
                                    <Typography variant="h6" fontWeight="900" sx={{ lineHeight: 1.1, fontSize: '1.2rem' }}>{formatCurrency(cart.totalAmount)}</Typography>
                                </Box>
                            </Box>
                            <Button
                                variant="contained"
                                onClick={() => navigate(getRelativePath('/customer/checkout'))}
                                endIcon={<ChevronIcon />}
                                sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: '900',
                                    borderRadius: { xs: 3, sm: 10 },
                                    height: { xs: 44, sm: 52 },
                                    px: { xs: 2, sm: 4 },
                                    textTransform: 'none',
                                    fontSize: '0.95rem',
                                    whiteSpace: 'nowrap',
                                    '&:hover': { bgcolor: 'primary.dark' }
                                }}
                            >
                                Checkout
                            </Button>
                        </Paper>
                    </Zoom>
                </Box>
            )}
        </Box>
    );
};

export default CustomerHomePage;
