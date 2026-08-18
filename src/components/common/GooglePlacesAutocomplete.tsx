import React, { useRef, useEffect, useState } from 'react';
import {
  TextField,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Chip,
  Typography,
  Alert
} from '@mui/material';
import {
  LocationOn,
  MyLocation,
  Clear
} from '@mui/icons-material';
import { initializeGoogleMaps, getCurrentLocation, formatAddressComponents } from '../../services/googleMapsService';

interface GooglePlacesAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  countryRestriction?: string[];
  types?: string[];
  includeCurrentLocation?: boolean;
  [key: string]: any;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value = '',
  onChange,
  onPlaceSelect,
  label = 'Address',
  placeholder = 'Enter address or search for places',
  required = false,
  error = false,
  helperText = '',
  countryRestriction = ['us'],
  types = ['address'],
  includeCurrentLocation = true,
  apiKey,
  ...textFieldProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [mapError, setMapError] = useState('');

  // Hold the latest callbacks in refs so the place_changed listener (attached once)
  // always invokes the current onChange/onPlaceSelect without needing to re-attach.
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  useEffect(() => {
    let cancelled = false;
    const initializeAutocomplete = async () => {
      try {
        if (apiKey) {
          const { loadGoogleMapsScript } = await import('../../utils/googleMaps');
          await loadGoogleMapsScript(apiKey);
        }
        const maps = await initializeGoogleMaps();
        if (cancelled) return;
        if (inputRef.current && !autocompleteRef.current) {
          const autocomplete = new maps.places.Autocomplete(inputRef.current, {
            types,
            componentRestrictions: countryRestriction.length ? { country: countryRestriction } : undefined,
            fields: [
              'place_id',
              'formatted_address',
              'address_components',
              'geometry',
              'name',
              'types'
            ]
          });
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) {
              setMapError('No details available for the selected place');
              return;
            }
            const formattedComponents = formatAddressComponents(place.address_components || []);
            const placeData = {
              placeId: place.place_id,
              name: place.name,
              formattedAddress: place.formatted_address,
              components: formattedComponents,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              types: place.types
            };
            setSelectedPlace(placeData);
            onChangeRef.current && onChangeRef.current(place.formatted_address || '');
            onPlaceSelectRef.current && onPlaceSelectRef.current(placeData);
            setMapError('');
          });
          autocompleteRef.current = autocomplete;
        }
      } catch (error: any) {
        if (!cancelled) setMapError('Failed to load Google Maps. Please try again.');
      }
    };
    initializeAutocomplete();
    return () => {
      cancelled = true;
    };
    // Only re-run when the API key changes (e.g. arrives async from settings).
    // Listeners are attached once and read the latest callbacks via refs above.
  }, [apiKey]);

  // Detach Google listeners only when the component truly unmounts.
  useEffect(() => () => {
    if (autocompleteRef.current) {
      window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
    }
  }, []);

  const handleCurrentLocation = async () => {
    setCurrentLocationLoading(true);
    setMapError('');
    try {
      const maps = await initializeGoogleMaps();
      const location = await getCurrentLocation();
      const geocoder = new maps.Geocoder();
      geocoder.geocode(
        { location: { lat: location.lat, lng: location.lng } },
        (results: any, status: string) => {
          setCurrentLocationLoading(false);
          if (status === 'OK' && results[0]) {
            const place = results[0];
            const formattedComponents = formatAddressComponents(place.address_components || []);
            const placeData = {
              placeId: place.place_id,
              formattedAddress: place.formatted_address,
              components: formattedComponents,
              location: {
                lat: location.lat,
                lng: location.lng
              },
              isCurrentLocation: true
            };
            setSelectedPlace(placeData);
            onChange && onChange(place.formatted_address);
            onPlaceSelect && onPlaceSelect(placeData);
            if (inputRef.current) {
              inputRef.current.value = place.formatted_address;
            }
          } else {
            setMapError('Unable to get address for current location');
          }
        }
      );
    } catch (error: any) {
      setCurrentLocationLoading(false);
      setMapError(error.message || 'Unable to get current location');
    }
  };

  const handleClear = () => {
    setSelectedPlace(null);
    onChange && onChange('');
    onPlaceSelect && onPlaceSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setMapError('');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    onChange && onChange(inputValue);
    if (selectedPlace && inputValue !== selectedPlace.formattedAddress) {
      setSelectedPlace(null);
      onPlaceSelect && onPlaceSelect(null);
    }
  };

  return (
    <Box>
      <TextField
        {...textFieldProps}
        inputRef={inputRef}
        label={label}
        placeholder={placeholder}
        required={required}
        error={error || !!mapError}
        helperText={mapError || helperText}
        onChange={handleInputChange}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {currentLocationLoading && <CircularProgress size={20} />}
              {includeCurrentLocation && !currentLocationLoading && (
                <IconButton
                  onClick={handleCurrentLocation}
                  title="Use current location"
                  size="small"
                >
                  <MyLocation />
                </IconButton>
              )}
              {value && (
                <IconButton
                  onClick={handleClear}
                  title="Clear address"
                  size="small"
                >
                  <Clear />
                </IconButton>
              )}
            </InputAdornment>
          ),
          ...textFieldProps.InputProps
        }}
      />
      {selectedPlace && (
        <Box sx={{ mt: 1 }}>
          <Chip
            icon={<LocationOn />}
            label={selectedPlace.isCurrentLocation ? 'Current Location' : 'Selected Address'}
            size="small"
            color="primary"
            variant="outlined"
          />
          {selectedPlace.name && selectedPlace.name !== selectedPlace.formattedAddress && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {selectedPlace.name}
            </Typography>
          )}
        </Box>
      )}
      {mapError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {mapError}
        </Alert>
      )}
      <style>{`
        .pac-container {
          z-index: 10000 !important;
        }
      `}</style>
    </Box>
  );
};

export default GooglePlacesAutocomplete;
