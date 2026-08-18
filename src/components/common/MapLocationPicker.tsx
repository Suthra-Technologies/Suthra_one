import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import { MyLocation, Close, LocationOn, Search } from '@mui/icons-material';
import { loadGoogleMapsScript } from '../../utils/googleMaps';

export interface PickedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface MapLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
  apiKey?: string;
  /** Where to center the map when first opened (e.g. current delivery coords or restaurant). */
  initialCenter?: { lat: number; lng: number };
  initialAddress?: string;
}

// Geographic center of the contiguous US — used only when we have no better hint.
const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  open,
  onClose,
  onConfirm,
  apiKey,
  initialCenter,
  initialAddress,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markerObj = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialCenter || null,
  );
  const [address, setAddress] = useState(initialAddress || '');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  // Reverse-geocode a point to a human-readable address and store both.
  const resolveAddress = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
    if (!geocoder.current) return;
    setGeocoding(true);
    geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
      setGeocoding(false);
      if (status === 'OK' && results && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('');
      }
    });
  }, []);

  // Load the Maps script when the dialog opens.
  useEffect(() => {
    if (!open) return;
    const key = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setLoadError('Google Maps is not configured.');
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(key)
      .then(() => {
        if (!cancelled) {
          setIsLoaded(true);
          setLoadError('');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load the map. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, apiKey]);

  // Build the map + draggable marker once the script is ready and the dialog is mounted.
  useEffect(() => {
    if (!open || !isLoaded || !mapRef.current || mapObj.current) return;

    geocoder.current = new google.maps.Geocoder();
    const start = initialCenter || US_CENTER;
    const startZoom = initialCenter ? 16 : 4;

    const map = new google.maps.Map(mapRef.current, {
      center: start,
      zoom: startZoom,
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl: false,
      gestureHandling: 'greedy',
      // Disable Google's built-in POI info windows so every tap drops our pin
      // instead of opening a native popup that swallows the click.
      clickableIcons: false,
    });
    mapObj.current = map;

    const marker = new google.maps.Marker({
      position: start,
      map,
      draggable: true,
    });
    markerObj.current = marker;

    // Drag the pin → update + reverse-geocode.
    marker.addListener('dragend', () => {
      const p = marker.getPosition();
      if (p) resolveAddress(p.lat(), p.lng());
    });

    // Tap anywhere on the map → move pin there.
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      resolveAddress(e.latLng.lat(), e.latLng.lng());
    });

    // Search box → move the map + pin to the chosen place.
    if (searchInputRef.current && !autocompleteRef.current && google.maps.places) {
      const ac = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'formatted_address'],
        componentRestrictions: { country: ['us'] },
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry || !place.geometry.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.setCenter({ lat, lng });
        map.setZoom(16);
        marker.setPosition({ lat, lng });
        setPosition({ lat, lng });
        setAddress(place.formatted_address || '');
      });
      autocompleteRef.current = ac;
    }

    // If we opened with a known point, resolve its address immediately.
    if (initialCenter) resolveAddress(initialCenter.lat, initialCenter.lng);
  }, [open, isLoaded, initialCenter, resolveAddress]);

  // Reset map instances when the dialog closes so a fresh one is built next open.
  useEffect(() => {
    if (open) return;
    if (autocompleteRef.current) {
      google.maps?.event?.clearInstanceListeners(autocompleteRef.current);
    }
    mapObj.current = null;
    markerObj.current = null;
    autocompleteRef.current = null;
    setIsLoaded(false);
  }, [open]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapObj.current) {
          mapObj.current.setCenter({ lat, lng });
          mapObj.current.setZoom(16);
        }
        markerObj.current?.setPosition({ lat, lng });
        resolveAddress(lat, lng);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleConfirm = () => {
    if (!position) return;
    // Coordinates are what drive the delivery quote; if reverse-geocoding didn't
    // return a label, fall back to the typed address or a coordinate string so the
    // quote still fires.
    const finalAddress =
      address || initialAddress || `Pinned location (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)})`;
    onConfirm({ address: finalAddress, latitude: position.lat, longitude: position.lng });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn color="primary" />
          <span>Pin your delivery location</span>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loadError ? (
          <Alert severity="error">{loadError}</Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Search an address, or tap the map / drag the pin to set the exact spot. We'll use these coordinates for an accurate delivery quote.
            </Typography>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              size="small"
              placeholder="Search for an address or place"
              disabled={!isLoaded}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ position: 'relative', width: '100%', height: 340, borderRadius: 2, overflow: 'hidden', border: '1px solid #ddd' }}>
              {!isLoaded && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.9)', zIndex: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            </Box>
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                startIcon={locating ? <CircularProgress size={16} /> : <MyLocation />}
                onClick={handleUseCurrentLocation}
                disabled={locating || !isLoaded}
              >
                Use my current location
              </Button>
            </Box>
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, minHeight: 48 }}>
              <Typography variant="caption" color="text.secondary">Selected address</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {geocoding ? 'Locating…' : address || 'Tap the map to choose a point'}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      {/* Places dropdown must render above the MUI Dialog (z-index ~1300). */}
      <style>{`.pac-container { z-index: 2000 !important; }`}</style>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!position || geocoding}>
          Confirm location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapLocationPicker;
