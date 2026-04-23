import React, { useState, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Button, Typography, Paper, CircularProgress, Stack, Chip } from '@mui/material';
import {
    LocationOn as LocationIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    GpsFixed as GpsIcon
} from '@mui/icons-material';
import { useNotifications } from '../context/NotificationProvider';
import { ordersAPI } from '../services/api';
import { toast } from 'react-hot-toast';

import MapComponent from './MapComponent';

interface DeliveryTrackerProps {
    orderId: string;
    customerPosition?: { lat: number; lng: number };
    onStatusChange?: (isTracking: boolean) => void;
}

const DeliveryTracker: React.FC<DeliveryTrackerProps> = ({ orderId, customerPosition, onStatusChange }) => {
    const [isTracking, setIsTracking] = useState(false);
    const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { trackOrder } = useNotifications();
    const [watchId, setWatchId] = useState<number | null>(null);
    const [routeInfo, setRouteInfo] = useState<{
        distance: string;
        duration: string;
        alternatives?: { distance: string; duration: string; summary: string }[]
    } | null>(null);

    const updateLocation = useCallback(async (lat: number, lng: number) => {
        try {
            // 1. Emit via WebSocket for real-time
            trackOrder(orderId, lat, lng);

            // 2. Persistent update via API (every minute or so to save DB load, or every time for high precision)
            // For now, let's just do it every 30 seconds or so
            setLastPosition({ lat, lng });
        } catch (err) {
            console.error('Failed to update location', err);
        }
    }, [orderId, trackOrder]);

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);
        setError(null);
        if (onStatusChange) onStatusChange(true);

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateLocation(latitude, longitude);

                // Also periodically save to DB
                ordersAPI.updateLocation(orderId, latitude, longitude).catch(console.error);
            },
            (err) => {
                setError(err.message);
                setIsTracking(false);
                if (onStatusChange) onStatusChange(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
        setWatchId(id);
        toast.success('Live tracking started');
    };

    const stopTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
        setIsTracking(false);
        if (onStatusChange) onStatusChange(false);
        toast.success('Tracking stopped');
    };

    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    return (
        <Paper elevation={0} sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GpsIcon color={isTracking ? "primary" : "disabled"} className={isTracking ? "animate-pulse" : ""} />
                        <Typography variant="subtitle2" fontWeight="bold">
                            {isTracking ? "LIVE TRACKING ACTIVE" : "DELIVERY TRACKING"}
                        </Typography>
                    </Box>
                    {isTracking && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%', animation: 'ripple 1.5s infinite' }} />
                            <Typography variant="caption" color="error.main" fontWeight="bold">LIVE</Typography>
                        </Box>
                    )}
                </Box>

                {lastPosition && (
                    <Typography variant="caption" color="text.secondary">
                        Last position: {lastPosition.lat.toFixed(4)}, {lastPosition.lng.toFixed(4)}
                    </Typography>
                )}

                {error && (
                    <Typography variant="caption" color="error">
                        Error: {error}
                    </Typography>
                )}

                <Button
                    variant={isTracking ? "outlined" : "contained"}
                    color={isTracking ? "error" : "primary"}
                    startIcon={isTracking ? <StopIcon /> : <StartIcon />}
                    onClick={isTracking ? stopTracking : startTracking}
                    fullWidth
                    size="small"
                >
                    {isTracking ? "Stop Sharing Location" : "Start Sharing Location"}
                </Button>

                {(isTracking || customerPosition) && (
                    <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                        {routeInfo && (
                            <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1, display: 'flex', gap: 1 }}>
                                <Chip size="small" label={routeInfo.distance} color="primary" sx={{ fontWeight: 'bold' }} />
                                <Chip size="small" label={routeInfo.duration} color="secondary" sx={{ fontWeight: 'bold' }} />
                            </Box>
                        )}
                        <MapComponent
                            center={lastPosition || customerPosition || { lat: 0, lng: 0 }}
                            markerPosition={lastPosition || undefined}
                            customerPosition={customerPosition || undefined}
                            height="200px"
                            zoom={14}
                            onRouteInfo={setRouteInfo}
                        />
                    </Box>
                )}

                {routeInfo?.alternatives && routeInfo.alternatives.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">SUGGESTED NEARBY ROUTES:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            {routeInfo.alternatives.map((alt, idx) => (
                                <Paper key={idx} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 1.5 }}>
                                    <Typography variant="caption" fontWeight="medium">{alt.summary}</Typography>
                                    <Typography variant="caption" color="primary.main" fontWeight="bold">{alt.duration} ({alt.distance})</Typography>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Stack>

            <style>{`
                @keyframes ripple {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                .animate-pulse {
                    animation: pulse-bg 2s infinite;
                }
                @keyframes pulse-bg {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Paper>
    );
};

export default DeliveryTracker;
