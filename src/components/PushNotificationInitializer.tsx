import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotificationService } from '../services/pushNotification.service';
import { useAuth } from '../context/AuthContext';

const PushNotificationInitializer: React.FC = () => {
    const { user, tenantSlug } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            PushNotificationService.register(navigate, tenantSlug || undefined);
        } else {
            PushNotificationService.unregister();
        }
    }, [user, tenantSlug, navigate]);

    return null;
};

export default PushNotificationInitializer;
