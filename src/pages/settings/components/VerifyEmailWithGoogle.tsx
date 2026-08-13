import { useEffect, useRef, useState } from 'react';
import { CheckCircle as CheckCircleIcon, Google as GoogleIcon } from '@mui/icons-material';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-hot-toast';
import { tenantAPI } from '../../../services/api';

// Kept in sync with fe/src/pages/public/GoogleAuthRelayPage.tsx
const GOOGLE_AUTH_RELAY_MESSAGE_TYPE = 'nexzen-google-auth-relay';

// One fixed domain, authorized in Google Cloud Console ONCE — tenant subdomains open it
// as a popup rather than rendering the Google button themselves, since Google OAuth's
// "Authorized JavaScript origins" has no wildcard support and would otherwise need every
// tenant subdomain added by hand.
const GOOGLE_AUTH_RELAY_URL = import.meta.env.VITE_GOOGLE_AUTH_RELAY_URL || 'https://restaurents.nexzenpos.com/google-auth-relay';

interface VerifyEmailWithGoogleProps {
    contactEmail?: string;
    contactEmailVerified?: boolean;
    onVerified: (result: { contactEmail: string; contactEmailVerified: boolean }) => void;
}

export const VerifyEmailWithGoogle: React.FC<VerifyEmailWithGoogleProps> = ({ contactEmail, contactEmailVerified, onVerified }) => {
    const [verifying, setVerifying] = useState(false);
    const popupRef = useRef<Window | null>(null);

    useEffect(() => {
        const relayOrigin = new URL(GOOGLE_AUTH_RELAY_URL).origin;

        const handleMessage = async (event: MessageEvent) => {
            // Only accept messages from the known relay domain — postMessage with
            // targetOrigin '*' means anything on the page could otherwise spoof this.
            if (event.origin !== relayOrigin) return;
            const data = event.data;
            if (!data || data.type !== GOOGLE_AUTH_RELAY_MESSAGE_TYPE) return;

            if (data.error || !data.credential) {
                setVerifying(false);
                toast.error(data.error || 'Google sign-in failed. Please try again.');
                return;
            }

            try {
                const res = await tenantAPI.verifyEmailWithGoogle(data.credential);
                onVerified(res.data);
                toast.success(`Verified ${res.data.contactEmail}`);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Could not verify email with Google.');
            } finally {
                setVerifying(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openPopup = () => {
        setVerifying(true);
        const width = 480;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        popupRef.current = window.open(
            GOOGLE_AUTH_RELAY_URL,
            'nexzen-google-auth',
            `width=${width},height=${height},left=${left},top=${top}`,
        );
        if (!popupRef.current) {
            setVerifying(false);
            toast.error('Please allow pop-ups to verify with Google.');
        }
    };

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Contact Email Verification
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    {contactEmail || 'No contact email on file'}
                </Typography>
                {contactEmailVerified ? (
                    <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" />
                ) : (
                    <Chip label="Not verified" size="small" variant="outlined" />
                )}
            </Stack>

            {verifying ? (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Verifying…</Typography>
                </Stack>
            ) : (
                <Button variant="outlined" size="small" startIcon={<GoogleIcon />} onClick={openPopup}>
                    Verify with Google
                </Button>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Sign in with the Google account for your restaurant's contact email to verify it.
                Signing in with a different account will update your contact email to that address.
            </Typography>
        </Box>
    );
};
