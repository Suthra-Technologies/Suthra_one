import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton, Stack } from '@mui/material';

/** Full-page skeleton: header bar + stat tiles + a content card. Use for top-level page loading states. */
export const DashboardSkeleton: React.FC = () => (
    <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3, lg: 4 }, py: { xs: 1.6, md: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 3 }}>
            <Skeleton variant="text" width={220} height={40} />
            <Skeleton variant="rounded" width={160} height={40} />
        </Stack>
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                    <Skeleton variant="rounded" height={100} />
                </Grid>
            ))}
        </Grid>
        <Skeleton variant="rounded" height={360} />
    </Box>
);

/** Row of cards, e.g. for orders/menu/customers grids. */
export const CardGridSkeleton: React.FC<{ count?: number; cardHeight?: number }> = ({ count = 8, cardHeight = 220 }) => (
    <Grid container spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rounded" height={cardHeight} />
            </Grid>
        ))}
    </Grid>
);

/** A single order/list-item-style card skeleton (header row + a couple of detail lines). */
export const ListItemCardSkeleton: React.FC = () => (
    <Card variant="outlined">
        <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Skeleton variant="text" width={120} height={28} />
                <Skeleton variant="rounded" width={80} height={24} />
            </Stack>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
        </CardContent>
    </Card>
);

/** Stack of list-item card skeletons, for order lists / kitchen queues / customer lists. */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <Stack spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
            <ListItemCardSkeleton key={i} />
        ))}
    </Stack>
);

/** Table-shaped skeleton: header row + N body rows of column skeletons. */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 8, columns = 5 }) => (
    <Stack spacing={1}>
        <Stack direction="row" spacing={2}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={`h-${i}`} variant="text" width={`${100 / columns}%`} height={32} />
            ))}
        </Stack>
        {Array.from({ length: rows }).map((_, r) => (
            <Stack direction="row" spacing={2} key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                    <Skeleton key={c} variant="text" width={`${100 / columns}%`} height={24} />
                ))}
            </Stack>
        ))}
    </Stack>
);
