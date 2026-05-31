import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Stack, Paper } from '@mui/material';
import { loadGoogleMapsScript } from '../utils/googleMaps';
import { Navigation as NavIcon, Route as RouteIcon, Traffic as TrafficIcon } from '@mui/icons-material';
import { mapsAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface MapComponentProps {
    center: { lat: number; lng: number };
    markerPosition?: { lat: number; lng: number };
    customerPosition?: { lat: number; lng: number };
    customerAddress?: string;
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
    customerAddress,
    zoom = 15,
    height = '300px',
    onRouteInfo
}) => {
    const { settings } = useSettings();
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
    const [resolvedCustomerPosition, setResolvedCustomerPosition] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        const isValidCoord = (coord?: { lat: any; lng: any } | null) => {
            if (!coord) return false;
            const lat = Number(coord.lat);
            const lng = Number(coord.lng);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        };

        if (isValidCoord(customerPosition)) {
            setResolvedCustomerPosition({ lat: Number(customerPosition!.lat), lng: Number(customerPosition!.lng) });
        } else if (customerAddress && isLoaded) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: customerAddress }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                    const loc = results[0].geometry.location;
                    setResolvedCustomerPosition({ lat: loc.lat(), lng: loc.lng() });
                } else {
                    console.warn('Geocoding failed for address:', customerAddress, status);
                }
            });
        }
    }, [customerPosition, customerAddress, isLoaded]);


    useEffect(() => {
        const handleAuthError = () => {
            setAuthError(true);
            setLoadError('Google Maps API authentication failed');
        };
        window.addEventListener('google-maps-auth-failure', handleAuthError);

        const apiKey = settings?.system?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            // Keep waiting for settings to load if they haven't finished yet
            return;
        }

        loadGoogleMapsScript(apiKey)
            .then(() => {
                setIsLoaded(true);
                setLoadError(null);
            })
            .catch((err) => {
                console.error('Failed to load Google Maps:', err);
                setLoadError('Failed to load map');
            });

        return () => window.removeEventListener('google-maps-auth-failure', handleAuthError);
    }, [settings?.system?.googleMapsApiKey]);

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

        const isValid = (coord?: { lat: any; lng: any } | null) => {
            if (!coord) return false;
            const lat = Number(coord.lat);
            const lng = Number(coord.lng);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        };

        const finalCustomerPos = resolvedCustomerPosition || customerPosition;
        const hasDriver = isValid(markerPosition);
        const hasCustomer = isValid(finalCustomerPos);

        // 1. Manage Driver Marker with Pulse effect simulation (via Marker icon)
        if (hasDriver) {
            const driverPos = { lat: Number(markerPosition!.lat), lng: Number(markerPosition!.lng) };
            if (!driverMarker.current) {
                driverMarker.current = new google.maps.Marker({
                    position: driverPos,
                    map: googleMap.current,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
                        scaledSize: new google.maps.Size(45, 45),
                        anchor: new google.maps.Point(22, 22)
                    },
                    zIndex: 1000
                });
            } else {
                driverMarker.current.setPosition(driverPos);
            }
            driverMarker.current.setMap(googleMap.current);
        } else {
            if (driverMarker.current) {
                driverMarker.current.setMap(null);
            }
        }

        // 2. Manage Customer Marker
        if (hasCustomer) {
            const customerPos = { lat: Number(finalCustomerPos!.lat), lng: Number(finalCustomerPos!.lng) };
            if (!customerMarker.current) {
                customerMarker.current = new google.maps.Marker({
                    position: customerPos,
                    map: googleMap.current,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/512/1673/1673188.png',
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 40)
                    },
                    zIndex: 1000
                });
            } else {
                customerMarker.current.setPosition(customerPos);
            }
            customerMarker.current.setMap(googleMap.current);
        } else {
            if (customerMarker.current) {
                customerMarker.current.setMap(null);
            }
        }

        // 3. Clear previous alternatives
        altRenderers.current.forEach(r => r.setMap(null));
        altRenderers.current = [];

        // 4. Update Route and Alternatives
        if (hasDriver && hasCustomer && primaryRenderer.current) {
            const driverPos = { lat: Number(markerPosition!.lat), lng: Number(markerPosition!.lng) };
            const customerPos = { lat: Number(finalCustomerPos!.lat), lng: Number(finalCustomerPos!.lng) };
            const directionsService = new google.maps.DirectionsService();
            const request: google.maps.DirectionsRequest = {
                origin: driverPos,
                destination: customerPos,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                },
                provideRouteAlternatives: true
            };

            const drawFallbackRoute = () => {
                const path = [driverPos, customerPos];
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
                    const originStr = `${driverPos.lat},${driverPos.lng}`;
                    const destStr = `${customerPos.lat},${customerPos.lng}`;

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

                                    // Update UI info
                                    setBestRoute({
                                        distance: route.distanceMeters ? `${(route.distanceMeters / 1609.34).toFixed(1)} mi` : '',
                                        duration: route.duration ? route.duration.replace('s', ' sec') : '',
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
        } else if (hasDriver) {
            const driverPos = { lat: Number(markerPosition!.lat), lng: Number(markerPosition!.lng) };
            googleMap.current.setCenter(driverPos);
            googleMap.current.setZoom(15);
        } else if (hasCustomer) {
            const customerPos = { lat: Number(finalCustomerPos!.lat), lng: Number(finalCustomerPos!.lng) };
            googleMap.current.setCenter(customerPos);
            googleMap.current.setZoom(15);
        } else {
            // Geocode restaurant address from settings as a premium fallback
            const restAddress = settings?.restaurant?.address || settings?.restaurant?.street || settings?.restaurant?.city;
            if (restAddress && isLoaded) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: restAddress }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0] && googleMap.current) {
                        const loc = results[0].geometry.location;
                        googleMap.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
                        googleMap.current.setZoom(15);
                    }
                });
            }
        }

    }, [markerPosition, resolvedCustomerPosition, customerPosition, isLoaded, settings?.restaurant]);


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
