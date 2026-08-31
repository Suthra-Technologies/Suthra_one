import React, { useState, useEffect, useRef } from 'react';
import { TextField, CircularProgress, InputAdornment, Tooltip } from '@mui/material';
import { LocationOn as LocationIcon, Search as SearchIcon } from '@mui/icons-material';
import { loadGoogleMapsScript } from '../utils/googleMaps';


interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        landmark: string;
        latitude: number;
        longitude: number;
        fullAddress: string;
        country: string;
        county: string;
    }) => void;
    apiKey?: string;
    label?: string;
    error?: boolean;
    helperText?: string;
    required?: boolean;
    onBlur?: () => void;
    sx?: any;
    size?: "small" | "medium";
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    apiKey,
    label = "Search Address",
    error,
    helperText,
    required,
    onBlur,
    sx,
    size
}) => {
    const [loading, setLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [authError, setAuthError] = useState((window as any).googleMapsAuthError || false);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        const handleError = () => setAuthError(true);
        window.addEventListener('google-maps-auth-failure', handleError);
        return () => window.removeEventListener('google-maps-auth-failure', handleError);
    }, []);

    useEffect(() => {
        if (apiKey && !scriptLoaded) {
            setLoading(true);
            loadGoogleMapsScript(apiKey)
                .then(() => {
                    setScriptLoaded(true);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Failed to load Google Maps script', error);
                    setLoading(false);
                });
        }
    }, [apiKey, scriptLoaded]);

    useEffect(() => {
        if (scriptLoaded && inputRef.current && !autocompleteRef.current) {
            if (window.google?.maps?.places?.Autocomplete) {
                try {
                    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                        // types: ['address'], // Removed to allow all types (establishments, geocodes, etc.)
                        fields: ['address_components', 'formatted_address', 'geometry'],
                    });

                    if (autocompleteRef.current) {
                        autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
                    }
                } catch (error) {
                    console.warn('Failed to initialize Google Places Autocomplete:', error);
                }
            }
        }
    }, [scriptLoaded]);

    const handlePlaceSelect = () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place || !place.geometry || !place.address_components) {
            return;
        }

        parseAndSelect(place);
    };

    const parseAndSelect = (place: google.maps.places.PlaceResult | any) => {
        const addressComponents = place.address_components || [];
        let street = '';
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zipCode = '';
        let landmark = '';
        let country = '';
        let county = '';

        addressComponents.forEach((component: any) => {
            const types = component.types;
            if (types.includes('street_number')) {
                streetNumber = component.long_name;
            }
            if (types.includes('route')) {
                route = component.long_name;
            }
            if (types.includes('locality')) {
                city = component.long_name;
            }
            if (!city && types.includes('postal_town')) {
                city = component.long_name;
            }
            if (!city && types.includes('sublocality_level_1')) {
                city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
            }
            if (types.includes('postal_code')) {
                zipCode = component.long_name;
            }
            if (types.includes('country')) {
                country = component.long_name;
            }
            if (types.includes('administrative_area_level_2')) {
                county = component.long_name;
            }
            if (types.includes('sublocality') || types.includes('neighborhood')) {
                landmark = component.long_name;
            }
        });

        street = `${streetNumber} ${route}`.trim();

        onSelect({
            street: street || place.name || '', // Fallback to place name if no street address (e.g. for businesses)
            city,
            state,
            zipCode,
            landmark,
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
            fullAddress: place.formatted_address || '',
            country,
            county,
        });

        // If we found a specific street address, use that. Otherwise fallback to formatted.
        onChange(street || place.formatted_address || '');
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                if (apiKey && window.google?.maps?.Geocoder) {
                    try {
                        const geocoder = new window.google.maps.Geocoder();
                        const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });

                        if (result.results && result.results[0]) {
                            parseAndSelect(result.results[0]);
                        }
                    } catch (error) {
                        console.error('Geocoding error:', error);
                        // Fallback with just coords if geocoding fails
                        onSelect({
                            street: '',
                            city: '',
                            state: '',
                            zipCode: '',
                            landmark: '',
                            latitude,
                            longitude,
                            fullAddress: `Lat: ${latitude}, Lng: ${longitude}`,
                            country: '',
                            county: '',
                        });
                        onChange(`Lat: ${latitude}, Lng: ${longitude}`);
                    }
                } else {
                    // No API key, just return coords
                    onSelect({
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        landmark: '',
                        latitude,
                        longitude,
                        fullAddress: `Lat: ${latitude}, Lng: ${longitude}`,
                        country: '',
                        county: '',
                    });
                    onChange(`Lat: ${latitude}, Lng: ${longitude}`);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                setLoading(false);
            }
        );
    };

    return (
        <>
            <TextField
                fullWidth
                size={size}
                inputRef={inputRef}
                label={label}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                placeholder="Start typing your address..."
                error={error || !apiKey}
                onBlur={onBlur}
                required={required}
                sx={sx}
                autoComplete="off"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            {loading ? <CircularProgress size={20} /> : <SearchIcon color="action" />}
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <Tooltip title="Use Current Location">
                                <LocationIcon
                                    color="primary"
                                    onClick={handleUseCurrentLocation}
                                    style={{ cursor: 'pointer', marginRight: 8 }}
                                />
                            </Tooltip>
                            <Tooltip title={scriptLoaded ? "Google Maps Active" : "Manual Entry Mode"}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: scriptLoaded ? '#4caf50' : '#bdbdbd' }} />
                            </Tooltip>
                        </InputAdornment>
                    )
                }}
                helperText={helperText || (!apiKey ? "Enter Google Maps API Key in settings for autocomplete" : (authError ? "" : "Powered by Google Maps"))}
            />
            <style>{`
                .pac-container {
                    z-index: 11000 !important;
                }
            `}</style>
        </>
    );
};

export default AddressAutocomplete;
