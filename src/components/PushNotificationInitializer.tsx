import React, { useEffect } from 'react';
import { PushNotificationService } from '../services/pushNotification.service';
import { useAuth } from '../context/AuthContext';

const PushNotificationInitializer: React.FC = () => {
    const { user } = useAuth();

    useEffect(() => {
        // TEMPORARY FIX: Disabled Push Notifications to prevent crash on Android
        // due to missing google-services.json.
        // Uncomment when Firebase is configured.
        /*
        if (user) {
            PushNotificationService.register();
        } else {
            PushNotificationService.unregister();
        }
        */
    }, [user]);

    return null;
};

export default PushNotificationInitializer;
