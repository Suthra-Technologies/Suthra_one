import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';

/**
 * Minimal standalone page meant to be opened in a popup from a tenant subdomain.
 *
 * Google OAuth's "Authorized JavaScript origins" list has no wildcard support, so a
 * button rendered directly on a tenant subdomain (slug.nexzenpos.com) would need that
 * exact subdomain added to the Google Cloud Console client on every signup. Instead,
 * this page lives on ONE fixed domain (restaurents.nexzenpos.com) that's authorized
 * once, ever. Tenant pages open it as a popup, and it relays the resulting Google ID
 * token back to the opener via postMessage, then closes itself — no backend involved.
 */
const GOOGLE_AUTH_RELAY_MESSAGE_TYPE = 'nexzen-google-auth-relay';

const GoogleAuthRelayPage: React.FC = () => {
    useEffect(() => {
        if (!window.opener) {
            // Not opened as a popup — nothing useful to do here.
            return;
        }
    }, []);

    const handleSuccess = (credentialResponse: CredentialResponse) => {
        if (window.opener) {
            window.opener.postMessage(
                { type: GOOGLE_AUTH_RELAY_MESSAGE_TYPE, credential: credentialResponse.credential || null },
                '*',
            );
        }
        window.close();
    };

    const handleError = () => {
        if (window.opener) {
            window.opener.postMessage(
                { type: GOOGLE_AUTH_RELAY_MESSAGE_TYPE, credential: null, error: 'Google sign-in failed.' },
                '*',
            );
        }
        window.close();
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', p: 3, textAlign: 'center' }}>
                <Typography color="error">Google sign-in is not configured.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Sign in to verify your email</Typography>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GoogleLogin onSuccess={handleSuccess} onError={handleError} text="signin_with" />
            </GoogleOAuthProvider>
            <CircularProgress size={16} sx={{ opacity: 0.4, mt: 2 }} />
        </Box>
    );
};

export default GoogleAuthRelayPage;
export { GOOGLE_AUTH_RELAY_MESSAGE_TYPE };
