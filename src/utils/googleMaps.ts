
let googleMapsScriptLoadingPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    if (window.google && window.google.maps) {
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

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('Google Maps Script loaded successfully');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Error loading Google Maps Script:', error);
            reject(error);
            googleMapsScriptLoadingPromise = null;
        };
        document.body.appendChild(script);
    });

    return googleMapsScriptLoadingPromise;
};
