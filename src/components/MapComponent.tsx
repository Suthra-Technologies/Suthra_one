import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Stack, Paper } from '@mui/material';
import { loadGoogleMapsScript } from '../utils/googleMaps';
import { Navigation as NavIcon, Route as RouteIcon, Traffic as TrafficIcon } from '@mui/icons-material';
import { mapsAPI } from '../services/api';

interface MapComponentProps {
    center: { lat: number; lng: number };
    markerPosition?: { lat: number; lng: number };
    customerPosition?: { lat: number; lng: number };
    zoom?: number;
    height?: string | number;
    onRouteInfo?: (info: {
        distance: string;
        duration: string;
        alternatives?: { distance: string; duration: string; summary: string }[]
    }) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
    center,
    markerPosition,
    customerPosition,
    zoom = 15,
    height = '300px',
    onRouteInfo
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMap = useRef<google.maps.Map | null>(null);
    const driverMarker = useRef<google.maps.Marker | null>(null);
    const customerMarker = useRef<google.maps.Marker | null>(null);
    const primaryRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
    const altRenderers = useRef<google.maps.DirectionsRenderer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [bestRoute, setBestRoute] = useState<{ distance: string, duration: string, summary: string } | null>(null);
    const [authError, setAuthError] = useState((window as any).googleMapsAuthError || false);

    useEffect(() => {
        const handleAuthError = () => {
            setAuthError(true);
            setLoadError('Google Maps API authentication failed');
        };
        window.addEventListener('google-maps-auth-failure', handleAuthError);

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setLoadError('Google Maps API Key is missing');
            return;
        }

        loadGoogleMapsScript(apiKey)
            .then(() => {
                setIsLoaded(true);
            })
            .catch((err) => {
                console.error('Failed to load Google Maps:', err);
                setLoadError('Failed to load map');
            });

        return () => window.removeEventListener('google-maps-auth-failure', handleAuthError);
    }, []);

    useEffect(() => {
        if (!isLoaded || !mapRef.current || googleMap.current) return;

        const mapOptions: google.maps.MapOptions = {
            center: center,
            zoom: zoom,
            mapId: '90f87356969b882', // High-quality vector map ID if available
            disableDefaultUI: false,
            gestureHandling: 'greedy',
            styles: [
                {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{ "visibility": "off" }]
                }
            ]
        };

        googleMap.current = new google.maps.Map(mapRef.current, mapOptions);

        // Add Traffic Layer
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(googleMap.current);

        primaryRenderer.current = new google.maps.DirectionsRenderer({
            map: googleMap.current,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#0047AB', // Professional Navigation Blue
                strokeWeight: 8,
                strokeOpacity: 0.9,
                zIndex: 100
            }
        });
    }, [isLoaded, center, zoom]);

    // Update positions and handle multiple routes
    useEffect(() => {
        if (!googleMap.current || !isLoaded) return;

        // 1. Manage Driver Marker with Pulse effect simulation (via Marker icon)
        if (markerPosition) {
            if (!driverMarker.current) {
                driverMarker.current = new google.maps.Marker({
                    position: markerPosition,
                    map: googleMap.current,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
                        scaledSize: new google.maps.Size(45, 45),
                        anchor: new google.maps.Point(22, 22)
                    },
                    zIndex: 1000
                });
            } else {
                driverMarker.current.setPosition(markerPosition);
            }
        }

        // 2. Manage Customer Marker
        if (customerPosition) {
            if (!customerMarker.current) {
                customerMarker.current = new google.maps.Marker({
                    position: customerPosition,
                    map: googleMap.current,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/1673/1673188.png',
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 40)
                    },
                    zIndex: 1000
                });
            } else {
                customerMarker.current.setPosition(customerPosition);
            }
        }

        // 3. Clear previous alternatives
        altRenderers.current.forEach(r => r.setMap(null));
        altRenderers.current = [];

        // 4. Update Route and Alternatives
        if (markerPosition && customerPosition && primaryRenderer.current) {
            const directionsService = new google.maps.DirectionsService();
            const request: google.maps.DirectionsRequest = {
                origin: markerPosition,
                destination: customerPosition,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                },
                provideRouteAlternatives: true
            };

            const drawFallbackRoute = () => {
                const path = [markerPosition, customerPosition];
                const fallbackPolyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: '#0047AB',
                    strokeWeight: 6,
                    strokeOpacity: 0.7,
                    icons: [{
                        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                        offset: '50%'
                    }]
                });
                fallbackPolyline.setMap(googleMap.current);
                // Store in primaryRenderer's internal polyline if possible or just let it be
                console.warn('MapComponent: Drawing straight-line fallback. Please enable "Directions API" in Google Cloud Console.');
            };

            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    primaryRenderer.current?.setDirections(result);
                    primaryRenderer.current?.setRouteIndex(0);

                    const mainRoute = result.routes[0].legs[0];
                    setBestRoute({
                        distance: mainRoute.distance?.text || '',
                        duration: mainRoute.duration?.text || '',
                        summary: result.routes[0].summary || 'Best Route'
                    });

                    // Highlight alternatives
                    if (result.routes.length > 1) {
                        result.routes.slice(1).forEach((route, idx) => {
                            const altRenderer = new google.maps.DirectionsRenderer({
                                map: googleMap.current,
                                suppressMarkers: true,
                                directions: result,
                                routeIndex: idx + 1,
                                polylineOptions: {
                                    strokeColor: '#78909C',
                                    strokeWeight: 5,
                                    strokeOpacity: 0.5,
                                    zIndex: 50
                                }
                            });
                            altRenderers.current.push(altRenderer);
                        });
                    }

                    if (onRouteInfo) {
                        const alternatives = result.routes.slice(1).map(r => ({
                            distance: r.legs[0].distance?.text || '',
                            duration: r.legs[0].duration?.text || '',
                            summary: r.summary || 'Alternative'
                        }));

                        onRouteInfo({
                            distance: mainRoute.distance?.text || '',
                            duration: mainRoute.duration?.text || '',
                            alternatives
                        });
                    }
                } else {
                    console.warn(`Directions Service failed with status: ${status}. Attempting backend fallback...`);

                    // Try fetching route from backend (Routes API)
                    const originStr = `${markerPosition.lat},${markerPosition.lng}`;
                    const destStr = `${customerPosition.lat},${customerPosition.lng}`;

                    mapsAPI.getDirections(originStr, destStr)
                        .then((res) => {
                            console.log('🗺️ Backend Route Response:', res.data); // Log full response

                            if (res.data && res.data.routes && res.data.routes.length > 0) {
                                const route = res.data.routes[0];
                                const encodedPolyline = route.polyline?.encodedPolyline;

                                if (encodedPolyline) {
                                    if (!google.maps.geometry) {
                                        console.error('❌ Geometry library missing! Cannot decode polyline.');
                                        drawFallbackRoute();
                                        return;
                                    }

                                    const path = google.maps.geometry.encoding.decodePath(encodedPolyline);
                                    console.log('✅ Decoded Path Points:', path.length);

                                    // Draw sophisticated fallback route
                                    const backendPolyline = new google.maps.Polyline({
                                        path: path,
                                        strokeColor: '#0047AB',
                                        strokeWeight: 6,
                                        strokeOpacity: 0.9,
                                        zIndex: 100
                                    });
                                    backendPolyline.setMap(googleMap.current);

                                    // Store for cleanup if needed (e.g. add to altRenderers or track separately)
                                    // For simplicity in this effect, we just let it render. 
                                    // Ideally, we'd track it to clear on unmount/update.

                                    // Update UI info
                                    setBestRoute({
                                        distance: route.distanceMeters ? `${(route.distanceMeters / 1609.34).toFixed(1)} mi` : '',
                                        duration: route.duration ? route.duration.replace('s', ' sec') : '', // Crude formatting, better to parse
                                        summary: ' Optimized Route'
                                    });


                                    // Fit bounds to path
                                    const bounds = new google.maps.LatLngBounds();
                                    path.forEach(pt => bounds.extend(pt));
                                    googleMap.current?.fitBounds(bounds, 50);
                                    return;
                                }
                            }
                            console.warn('Backend returned no valid route or polyline.');
                            drawFallbackRoute();
                        })
                        .catch((err) => {
                            console.error('Backend route fallback failed:', err);
                            drawFallbackRoute();
                        });
                }
            });
        } else if (markerPosition) {
            googleMap.current.setCenter(markerPosition);
        }

    }, [markerPosition, customerPosition, isLoaded]);

    if (loadError || authError) {
        return null; // Silently hide in UI
    }

    return (
        <Box sx={{ width: '100%', height, position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {!isLoaded && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', zIndex: 10 }}>
                    <CircularProgress size={32} thickness={5} />
                    <Typography variant="body2" fontWeight="bold" color="primary">Optimizing Best Route...</Typography>
                </Box>
            )}

            {/* Premium UI Overlay: Best Route Highlight */}
            {bestRoute && isLoaded && (
                <Paper
                    elevation={4}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 5,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.96)',
                        border: '2px solid #0047AB',
                        minWidth: '220px',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ bgcolor: '#0047AB', color: 'white', p: 0.8, borderRadius: '50%', display: 'flex' }}>
                            <NavIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, mb: 0.5, fontWeight: 'bold' }}>
                                SUGGESTED BEST ROUTE
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight="900" color="primary">
                                    {bestRoute.duration}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ({bestRoute.distance})
                                </Typography>
                                <Chip label={bestRoute.summary} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            )}

            {/* Nearby Route Status Indicators */}
            {isLoaded && (
                <Box sx={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Chip
                        icon={<TrafficIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label="Live Traffic"
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold', boxShadow: 1 }}
                    />
                    <Chip
                        icon={<RouteIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label="Nearby Alt Routes"
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold', boxShadow: 1 }}
                    />
                </Box>
            )}

            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </Box>
    );
};

export default MapComponent;
