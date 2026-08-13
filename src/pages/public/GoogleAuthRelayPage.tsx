import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';

/**
 * Minimal standalone page meant to be opened in a popup from a tenant subdomain.
 *
 * Google OAuth's "Authorized JavaScript origins" list has no wildcard support, so a
 * button rendered directly on a tenant subdomain (slug.nexzenpos.com) would need that
 * exact subdomain added to the Google Cloud Console client on every signup. Instead,
 * this page lives on ONE fixed domain, authorized once, ever. Tenant pages open it as a
 * popup; it requests identity + gmail.send consent, and relays the resulting Google
 * authorization code back to the opener via postMessage, then closes itself. The opener
 * sends that code to the backend, which exchanges it for tokens — the code itself is
 * single-use and useless without the client secret, so passing it via postMessage is safe.
 */
const GOOGLE_AUTH_RELAY_MESSAGE_TYPE = 'nexzen-google-auth-relay';
const GMAIL_SEND_SCOPE = 'email profile https://www.googleapis.com/auth/gmail.send';

const RelayButton: React.FC = () => {
    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: GMAIL_SEND_SCOPE,
        // Google only issues a refresh_token on a fresh consent grant. select_account
        // surfaces the account chooser (rather than silently reusing the last session),
        // which reliably re-triggers full consent for a re-verify. If Google still omits
        // a refresh_token (already-granted account, no new consent shown), the backend
        // keeps the previously stored one rather than clobbering it with nothing.
        select_account: true,
        redirect_uri: window.location.origin + window.location.pathname,
        onSuccess: (codeResponse) => {
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: GOOGLE_AUTH_RELAY_MESSAGE_TYPE,
                        code: codeResponse.code,
                        redirectUri: window.location.origin + window.location.pathname,
                    },
                    '*',
                );
            }
            window.close();
        },
        onError: () => {
            if (window.opener) {
                window.opener.postMessage(
                    { type: GOOGLE_AUTH_RELAY_MESSAGE_TYPE, code: null, error: 'Google sign-in failed.' },
                    '*',
                );
            }
            window.close();
        },
    });

    return (
        <Button variant="outlined" startIcon={<GoogleIcon />} onClick={() => login()}>
            Sign in with Google
        </Button>
    );
};

const GoogleAuthRelayPage: React.FC = () => {
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
                <RelayButton />
            </GoogleOAuthProvider>
            <CircularProgress size={16} sx={{ opacity: 0.4, mt: 2 }} />
        </Box>
    );
};

export default GoogleAuthRelayPage;
export { GOOGLE_AUTH_RELAY_MESSAGE_TYPE };
