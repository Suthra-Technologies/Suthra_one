export const initializeGoogleMaps = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      resolve((window as any).google.maps);
      return;
    }
    const checkGoogleMaps = () => {
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        resolve((window as any).google.maps);
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };
    checkGoogleMaps();
    setTimeout(() => {
      if ((window as any).google && (window as any).google.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    }, 10000);
  });
};

export const getCurrentLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
};

export const geocodeAddress = async (address: string): Promise<any> => {
  try {
    const maps = await initializeGoogleMaps();
    const geocoder = new maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            formattedAddress: results[0].formatted_address,
            addressComponents: results[0].address_components,
            placeId: results[0].place_id,
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  } catch (error) {
    throw error;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<any> => {
  try {
    const maps = await initializeGoogleMaps();
    const geocoder = new maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          resolve({
            formattedAddress: results[0].formatted_address,
            addressComponents: results[0].address_components,
            placeId: results[0].place_id,
          });
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  } catch (error) {
    throw error;
  }
};

export const searchPlaces = async (query: string, location: any = null, radius = 5000): Promise<any[]> => {
  try {
    const maps = await initializeGoogleMaps();
    const service = new maps.places.PlacesService(document.createElement('div'));
    const request: any = {
      query,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total'],
    };
    if (location) {
      request.location = new maps.LatLng(location.lat, location.lng);
      request.radius = radius;
    }
    return new Promise((resolve, reject) => {
      service.textSearch(request, (results: any, status: string) => {
        if (status === maps.places.PlacesServiceStatus.OK) {
          resolve(
            results.map((place: any) => ({
              placeId: place.place_id,
              name: place.name,
              address: place.formatted_address,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
            }))
          );
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  } catch (error) {
    throw error;
  }
};

export const getPlaceDetails = async (placeId: string): Promise<any> => {
  try {
    const maps = await initializeGoogleMaps();
    const service = new maps.places.PlacesService(document.createElement('div'));
    return new Promise((resolve, reject) => {
      service.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'opening_hours',
            'photos',
          ],
        },
        (place: any, status: string) => {
          if (status === maps.places.PlacesServiceStatus.OK) {
            resolve({
              placeId: place.place_id,
              name: place.name,
              address: place.formatted_address,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              phone: place.formatted_phone_number,
              website: place.website,
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              openingHours: place.opening_hours,
              photos: place.photos,
            });
          } else {
            reject(new Error(`Place details failed: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

export const areAddressesIdentical = (addr1: any, addr2: any): boolean => {
  if (!addr1 || !addr2) return false;
  
  const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // If both are strings
  if (typeof addr1 === 'string' && typeof addr2 === 'string') {
    return normalize(addr1) === normalize(addr2);
  }

  // If both are objects with lat/lng
  if (typeof addr1 === 'object' && typeof addr2 === 'object' && addr1.lat && addr1.lng && addr2.lat && addr2.lng) {
    return Math.abs(addr1.lat - addr2.lat) < 0.0001 && Math.abs(addr1.lng - addr2.lng) < 0.0001;
  }

  // Mixed types: geocoding would be needed for a perfect comparison, 
  // but we can at least check if one string matches the other's formatted property if available
  if (typeof addr1 === 'string' && typeof addr2 === 'object') {
     if (addr2.formattedAddress && normalize(addr1) === normalize(addr2.formattedAddress)) return true;
     if (addr2.fullAddress && normalize(addr1) === normalize(addr2.fullAddress)) return true;
  }
  if (typeof addr1 === 'object' && typeof addr2 === 'string') {
    if (addr1.formattedAddress && normalize(addr1.formattedAddress) === normalize(addr2)) return true;
    if (addr1.fullAddress && normalize(addr1.fullAddress) === normalize(addr2)) return true;
  }

  return false;
};

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const calculateDistance = async (origin: any, destination: any): Promise<any> => {
  if (areAddressesIdentical(origin, destination)) {
    return {
      distance: { text: '0 km', value: 0 },
      duration: { text: '0 mins', value: 0 },
    };
  }
  try {
    const maps = await initializeGoogleMaps();
    const service = new maps.DistanceMatrixService();
    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: maps.TravelMode.DRIVING,
          unitSystem: maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (response: any, status: string) => {
          if (status === 'OK') {
            const element = response.rows[0].elements[0];
            if (element.status === 'OK') {
              resolve({
                distance: {
                  text: element.distance.text,
                  value: element.distance.value,
                },
                duration: {
                  text: element.duration.text,
                  value: element.duration.value,
                },
              });
            } else {
              reject(new Error(`Distance calculation failed: ${element.status}`));
            }
          } else {
            reject(new Error(`Distance Matrix failed: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

export const formatAddressComponents = (addressComponents: any[]): any => {
  const components: any = {};
  addressComponents.forEach((component) => {
    const types = component.types;
    if (types.includes('street_number')) {
      components.streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      components.route = component.long_name;
    }
    if (types.includes('locality')) {
      components.city = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      components.state = component.short_name;
    }
    if (types.includes('postal_code')) {
      components.zipCode = component.long_name;
    }
    if (types.includes('country')) {
      components.country = component.long_name;
    }
  });
  return {
    street: `${components.streetNumber || ''} ${components.route || ''}`.trim(),
    city: components.city || '',
    state: components.state || '',
    zipCode: components.zipCode || '',
    country: components.country || '',
  };
};

export const METERS_PER_MILE = 1609.34;

// restaurantLocation: {lat, lng} or string address
// customerLocation: {lat, lng} or string address
// maxRadius: in meters
export const isWithinDeliveryRadius = async (
  restaurantLocation: any,
  customerLocation: any,
  maxRadiusMeters: number
): Promise<{ isWithin: boolean; distanceText?: string; distanceValue?: number }> => {
  // Global Override: accepting all addresses as per user request
  const bypassRestriction = true;

  // 0. Immediate check for identical addresses (saves API calls and handles identical strings)
  if (areAddressesIdentical(restaurantLocation, customerLocation)) {
    return { isWithin: true, distanceText: '0 miles', distanceValue: 0 };
  }

  try {
    // 1. Try Distance Matrix (Accurate road distance)
    const response = await calculateDistance(restaurantLocation, customerLocation);
    const distanceMeters = response.distance.value;
    return {
      isWithin: bypassRestriction || distanceMeters <= maxRadiusMeters,
      distanceText: response.distance.text,
      distanceValue: distanceMeters,
    };
  } catch (error) {
    console.warn('Distance Matrix failed, trying haversine fallback:', error);

    // 2. Fallback to Haversine (Straight line distance)
    try {
      let rLoc = restaurantLocation;
      let cLoc = customerLocation;

      // Geocode strings if necessary
      if (typeof rLoc === 'string') {
        const geo = await geocodeAddress(rLoc);
        rLoc = { lat: geo.lat, lng: geo.lng };
      } else if (rLoc.latitude && rLoc.longitude && !rLoc.lat) {
          rLoc = { lat: rLoc.latitude, lng: rLoc.longitude };
      }

      if (typeof cLoc === 'string') {
        const geo = await geocodeAddress(cLoc);
        cLoc = { lat: geo.lat, lng: geo.lng };
      } else if (cLoc.latitude && cLoc.longitude && !cLoc.lat) {
          cLoc = { lat: cLoc.latitude, lng: cLoc.longitude };
      }

      if (rLoc.lat !== undefined && rLoc.lng !== undefined && cLoc.lat !== undefined && cLoc.lng !== undefined) {
        const distanceMeters = haversineDistance(rLoc.lat, rLoc.lng, cLoc.lat, cLoc.lng);
        const distanceMiles = distanceMeters / METERS_PER_MILE;

        return {
          isWithin: bypassRestriction || distanceMeters <= maxRadiusMeters,
          distanceText: `~${distanceMiles.toFixed(1)} miles`,
          distanceValue: distanceMeters,
        };
      }
    } catch (fallbackError) {
      console.error('Haversine fallback also failed:', fallbackError);
    }

    // Final safety: one last check for identity in case properties shifted
    if (areAddressesIdentical(restaurantLocation, customerLocation)) {
      return { isWithin: true, distanceText: '0 miles', distanceValue: 0 };
    }

    // Default to true for now since we've bypassed restrictions
    return { isWithin: true };
  }
};

export const getNearbyRestaurants = async (location: any, radius = 10000): Promise<any[]> => {
  try {
    const maps = await initializeGoogleMaps();
    const service = new maps.places.PlacesService(document.createElement('div'));
    return new Promise((resolve, reject) => {
      service.nearbySearch(
        {
          location: new maps.LatLng(location.lat, location.lng),
          radius,
          type: 'restaurant',
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating'],
        },
        (results: any, status: string) => {
          if (status === maps.places.PlacesServiceStatus.OK) {
            resolve(
              results.map((place: any) => ({
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address,
                location: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                },
                rating: place.rating,
              }))
            );
          } else {
            reject(new Error(`Nearby search failed: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

(window as any).initMap = () => {
  console.log('Google Maps API loaded successfully');
};

export default {
  initializeGoogleMaps,
  getCurrentLocation,
  geocodeAddress,
  reverseGeocode,
  searchPlaces,
  getPlaceDetails,
  calculateDistance,
  formatAddressComponents,
  isWithinDeliveryRadius,
  getNearbyRestaurants,
  getDirections: async (origin: any, destination: any): Promise<any> => {
    try {
      const maps = await initializeGoogleMaps();
      const directionsService = new maps.DirectionsService();
      return new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin: new maps.LatLng(origin.lat, origin.lng),
            destination: new maps.LatLng(destination.lat, destination.lng),
            travelMode: maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });
    } catch (error) {
      throw error;
    }
  },
  decodePolyline: (encoded: string): [number, number][] => {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  },
};
