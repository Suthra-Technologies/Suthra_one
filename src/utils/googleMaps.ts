
let googleMapsScriptLoadingPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    if (window.google && window.google.maps && window.google.maps.places) {
        return Promise.resolve();
    }

    if (googleMapsScriptLoadingPromise) {
        return googleMapsScriptLoadingPromise;
    }

    googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
        // Define global authentication failure handler
        (window as any).gm_authFailure = () => {
            (window as any).googleMapsAuthError = true;
            console.error('Google Maps authentication failed. Please check if your API key is valid and the required APIs are enabled.');
            // Dispatch a custom event so components can respond
            window.dispatchEvent(new Event('google-maps-auth-failure'));
        };

        // Suppress Google Maps Platform alerts (Rejected Request alerts)
        const originalAlert = window.alert;
        (window as any).alert = (message: any) => {
            if (typeof message === 'string' &&
                (message.includes('Google Maps Platform rejected your request') ||
                    message.includes('API is not activated'))) {
                console.error('Suppressed Google Maps Alert:', message);
                return;
            }
            originalAlert(message);
        };

        // Define the initialization callback
        const callbackName = `initGoogleMaps_${Math.random().toString(36).substring(2)}`;
        (window as any)[callbackName] = () => {
            console.log('Google Maps Script loaded successfully via callback');
            resolve();
            delete (window as any)[callbackName];
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        
        script.onerror = (error) => {
            console.error('Error loading Google Maps Script:', error);
            reject(error);
            googleMapsScriptLoadingPromise = null;
            delete (window as any)[callbackName];
        };
        document.body.appendChild(script);
    });

    return googleMapsScriptLoadingPromise;
};
