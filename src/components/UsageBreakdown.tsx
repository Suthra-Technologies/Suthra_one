import React from 'react';
import { alpha, Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';

interface Props {
  /** Payload from GET /subscription/usage or GET /superadmin/tenants/:id/usage. */
  usageData: any;
}

/**
 * The usage meters shared by the tenant's own "My Usage" dialog and the
 * superadmin's per-store view. Both endpoints return the same `usage` shape,
 * so the rendering lives here rather than being duplicated on each side.
 */
const UsageBreakdown: React.FC<Props> = ({ usageData }) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5} sx={{ py: 0.5 }}>
      {[
        { key: 'users', label: 'Users', icon: <GroupIcon sx={{ fontSize: 17 }} />, hint: 'Active staff accounts' },
        { key: 'tables', label: 'Tables', icon: <TableRestaurantIcon sx={{ fontSize: 17 }} />, hint: 'Configured tables' },
        { key: 'ordersThisMonth', label: 'Orders', icon: <ReceiptLongIcon sx={{ fontSize: 17 }} />, hint: 'Orders placed this month' },
        { key: 'smsThisMonth', label: 'SMS', icon: <SmsIcon sx={{ fontSize: 17 }} />, hint: 'Messages sent this month' },
        { key: 'emailsThisMonth', label: 'Emails', icon: <EmailIcon sx={{ fontSize: 17 }} />, hint: 'Emails sent this month' },
      ].map(({ key, label, icon, hint }) => {
        const row = usageData?.usage?.[key];
        if (!row) return null;

        const current = Number(row.current) || 0;
        const planMax = Number(row.max) || 0;

        // SMS/email top-up credits genuinely extend the cap — the backend
        // keeps allowing sends past the plan limit while a balance remains
        // and the top-up toggle is on. So count them toward the total the
        // user is measured against, rather than showing them separately.
        const topup = row.topupEnabled === false ? 0 : Number(row.balance) || 0;
        const max = planMax > 0 ? planMax + topup : planMax;

        // An unlimited plan reports 0 / a non-positive cap — show it as
        // unlimited instead of a misleading full bar.
        const unlimited = !(max > 0);
        const percent = unlimited ? 0 : Math.min(100, Math.round((current / max) * 100));

        // Accent shifts with pressure on the limit, so a row close to
        // its cap reads as a warning at a glance.
        const accent = unlimited
          ? theme.palette.primary.main
          : percent >= 100
            ? theme.palette.error.main
            : percent >= 80
              ? theme.palette.warning.main
              : theme.palette.success.main;

        // Keep a sliver of fill visible so a barely-used metric still
        // reads as a bar rather than an empty track.
        const fillWidth = unlimited ? 100 : Math.max(percent, current > 0 ? 4 : 0);

        return (
          <Box
            key={key}
            sx={{
              p: { xs: 1.5, sm: 1.75 },
              borderRadius: 2.5,
              border: `1px solid ${alpha(accent, 0.22)}`,
              background: `linear-gradient(135deg, ${alpha(accent, 0.07)} 0%, ${alpha(accent, 0.015)} 60%)`,
              transition: 'transform .25s ease, box-shadow .25s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 22px ${alpha(accent, 0.18)}`
              }
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.25 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  background: `linear-gradient(135deg, ${alpha(accent, 0.85)} 0%, ${accent} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(accent, 0.4)}`
                }}
              >
                {icon}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 12.5 }}
                >
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {hint}
                </Typography>
              </Box>

              <Box sx={{ ml: 'auto !important', textAlign: 'right' }}>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontWeight: 800,
                    fontSize: 19,
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                    color: accent
                  }}
                >
                  {current.toLocaleString()}
                  <Typography
                    component="span"
                    sx={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, color: 'text.disabled' }}
                  >
                    {unlimited ? ' / ∞' : ` / ${max.toLocaleString()}`}
                  </Typography>
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontSize: 10, letterSpacing: 0.8, color: 'text.secondary', textTransform: 'uppercase' }}
                >
                  {unlimited ? 'Unlimited' : `${Math.max(0, max - current).toLocaleString()} left`}
                </Typography>
              </Box>
            </Stack>

            {/* Broad capsule track — the percentage rides inside the fill
                once it is wide enough to hold the text. */}
            <Box
              sx={{
                position: 'relative',
                height: 16,
                borderRadius: 8,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                boxShadow: `inset 0 1px 3px ${alpha('#000000', theme.palette.mode === 'dark' ? 0.55 : 0.18)}`
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${fillWidth}%`,
                  borderRadius: 8,
                  transition: 'width .9s cubic-bezier(.4,0,.2,1)',
                  background: `linear-gradient(90deg, ${alpha(accent, 0.65)} 0%, ${accent} 100%)`,
                  boxShadow: `0 0 12px ${alpha(accent, 0.6)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  // Diagonal sheen over the gradient for a glossy finish.
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    background:
                      'repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 6px, rgba(255,255,255,0) 6px 12px)'
                  }
                }}
              >
                {!unlimited && percent >= 22 && (
                  <Typography
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      pr: 1,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,.35)'
                    }}
                  >
                    {percent}%
                  </Typography>
                )}
              </Box>

              {/* Below the threshold the label would not fit inside the
                  fill, so it sits just outside it instead. */}
              {!unlimited && percent < 22 && (
                <Typography
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `calc(${fillWidth}% + 8px)`,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    color: 'text.secondary'
                  }}
                >
                  {percent}%
                </Typography>
              )}
            </Box>

            {/* Spell out how the combined total was reached, so the
                denominator above is not mistaken for the plan limit. */}
            {topup > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{ fontSize: 10.5, color: 'text.secondary', letterSpacing: 0.2 }}
                >
                  {`Plan ${planMax.toLocaleString()} + top-up ${topup.toLocaleString()}`}
                </Typography>
              </Box>
            )}

            {/* Credits exist but the tenant switched top-up usage off, so
                they are not part of the usable total. */}
            {row.topupEnabled === false && Number(row.balance) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${Number(row.balance).toLocaleString()} top-up credits (disabled)`}
                  sx={{ height: 21, fontSize: 10.5, letterSpacing: 0.3, borderRadius: 1 }}
                />
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};

export default UsageBreakdown;
