import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Restaurant,
  DeliveryDining,
  Phone,
  LocationOn,
  Schedule,
  Receipt,
  Share,
  Print,
  Refresh
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizations: string[];
}
interface RestaurantInfo {
  name: string;
  phone: string;
  address: string;
}
interface TimelineItem {
  status: string;
  time: Date | null;
  completed: boolean;
  label: string;
}
interface OrderData {
  orderNumber: string;
  status: string;
  orderType: string;
  estimatedTime: string;
  totalAmount: number;
  items: OrderItem[];
  deliveryAddress: string;
  customerPhone: string;
  restaurantInfo: RestaurantInfo;
  timeline: TimelineItem[];
}

const OrderConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [orderData] = useState<OrderData>({
    orderNumber: 'ORD-' + Math.random().toString(36).substr(2, 9)?.toUpperCase(),
    status: 'confirmed',
    orderType: 'delivery',
    estimatedTime: '35-45',
    totalAmount: 42.67,
    items: [
      {
        name: 'Margherita Pizza',
        quantity: 1,
        price: 18.99,
        customizations: ['Extra Cheese', 'Thin Crust']
      },
      {
        name: 'Caesar Salad',
        quantity: 1,
        price: 12.99,
        customizations: []
      },
      {
        name: 'Garlic Bread',
        quantity: 2,
        price: 6.99,
        customizations: []
      }
    ],
    deliveryAddress: '123 Main Street, Downtown, NY 10001',
    customerPhone: '+1 (555) 123-4567',
    restaurantInfo: {
      name: 'Delicious Bites Restaurant',
      phone: '+1 (555) 987-6543',
      address: '456 Restaurant Ave, Food District, NY 10002'
    },
    timeline: [
      { status: 'placed', time: new Date(), completed: true, label: 'Order Placed' },
      { status: 'confirmed', time: null, completed: true, label: 'Order Confirmed' },
      { status: 'preparing', time: null, completed: false, label: 'Preparing Food' },
      { status: 'ready', time: null, completed: false, label: 'Ready for Takeaway/Delivery' },
      { status: 'delivered', time: null, completed: false, label: 'Delivered' }
    ]
  });
  const [currentStatus, setCurrentStatus] = useState<string>('confirmed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
      case 'confirmed':
        return 'primary';
      case 'preparing':
        return 'warning';
      case 'ready':
        return 'info';
      case 'delivered':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string, completed: boolean) => {
    const iconProps = {
      sx: {
        color: completed ? `${getStatusColor(status)}.main` : 'grey.500',
        fontSize: 24
      }
    };
    switch (status) {
      case 'placed':
        return <Receipt {...iconProps} />;
      case 'confirmed':
        return <CheckCircle {...iconProps} />;
      case 'preparing':
        return <Restaurant {...iconProps} />;
      case 'ready':
        return <Schedule {...iconProps} />;
      case 'delivered':
        return <DeliveryDining {...iconProps} />;
      default:
        return <Receipt {...iconProps} />;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Order ${orderData.orderNumber}`,
        text: `I just placed an order at ${orderData.restaurantInfo.name}!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Order link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTrackOrder = () => {
    navigate(`/orders/${orderData.orderNumber}`);
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              width: 78mm;
              margin: 0 auto;
              padding: 5px;
              font-family: 'Courier New', monospace;
            }
            /* Hide unnecessary elements when printing */
            button, .no-print {
              display: none !important;
            }
            /* Compact spacing for thermal printer */
            .MuiContainer-root {
              padding: 5px !important;
              max-width: 100% !important;
            }
            .MuiPaper-root {
              padding: 8px !important;
              margin-bottom: 8px !important;
              box-shadow: none !important;
            }
            .MuiTypography-h4 {
              font-size: 16px !important;
            }
            .MuiTypography-h6 {
              font-size: 14px !important;
            }
            .MuiTypography-body1, .MuiTypography-body2 {
              font-size: 12px !important;
            }
            .MuiTypography-subtitle1 {
              font-size: 12px !important;
            }
            /* Ensure grid items stack vertically */
            .MuiGrid-item {
              max-width: 100% !important;
              flex-basis: 100% !important;
            }
          }
        `}
      </style>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
          <CheckCircle sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Order Confirmed!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Order #{orderData.orderNumber}
          </Typography>
          <Typography variant="body1">
            Thank you for your order! We're preparing your delicious meal.
          </Typography>
        </Paper>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Order Status</Typography>
                <IconButton onClick={() => window.location.reload()} size="small">
                  <Refresh />
                </IconButton>
              </Box>
              <List>
                {orderData.timeline.map((item, index) => (
                  <ListItem key={item.status} sx={{ py: 2 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getStatusIcon(item.status, item.completed)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="h6"
                          sx={{
                            color: item.completed ? 'text.primary' : 'text.secondary',
                            fontWeight: item.completed ? 600 : 400
                          }}
                        >
                          {item.label}
                        </Typography>
                      }
                      secondary={
                        item.time && (
                          <Typography variant="body2" color="text.secondary">
                            {item.time.toLocaleTimeString()}
                          </Typography>
                        )
                      }
                    />
                    {item.completed && (
                      <Chip
                        label="Completed"
                        size="small"
                        color={getStatusColor(item.status)}
                        variant="outlined"
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Details
              </Typography>
              {(orderData?.items || []).map((item, index) => (
                <Box key={index} sx={{ py: 2, borderBottom: index < (orderData?.items || []).length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {item.quantity}x {item.name}
                      </Typography>
                      {item.customizations.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {item.customizations.join(', ')}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
              <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal</Typography>
                  <Typography>${(orderData.totalAmount - 3.99 - orderData.totalAmount * 0.08).toFixed(2)}</Typography>
                </Box>
                {orderData.orderType === 'delivery' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Delivery Fee</Typography>
                    <Typography>$3.99</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Tax</Typography>
                  <Typography>${(orderData.totalAmount * 0.08).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    ${orderData.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Estimated Time</Typography>
                </Box>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {orderData.estimatedTime} mins
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {orderData.orderType === 'delivery' ? 'For delivery' : 'For takeaway'}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {orderData.orderType === 'delivery' ? (
                    <>
                      <DeliveryDining color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Delivery Address</Typography>
                    </>
                  ) : (
                    <>
                      <Restaurant color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Takeaway Location</Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <LocationOn sx={{ color: 'text.secondary', mr: 1, mt: 0.5 }} />
                  <Typography variant="body2">
                    {orderData.orderType === 'delivery'
                      ? orderData.deliveryAddress
                      : orderData.restaurantInfo.address}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Phone sx={{ color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2">
                    {orderData.customerPhone}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Restaurant Info
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {orderData.restaurantInfo.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Phone sx={{ color: 'text.secondary', mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {orderData.restaurantInfo.phone}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <LocationOn sx={{ color: 'text.secondary', mr: 1, fontSize: 16, mt: 0.2 }} />
                  <Typography variant="body2">
                    {orderData.restaurantInfo.address}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleTrackOrder}
                startIcon={<LocationOn />}
              >
                Track Order
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/menu')}
              >
                Order Again
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleShare}
                  startIcon={<Share />}
                  sx={{ flex: 1 }}
                >
                  Share
                </Button>
                <Button
                  variant="outlined"
                  onClick={handlePrint}
                  startIcon={<Print />}
                  sx={{ flex: 1 }}
                >
                  Print
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Need Help?
          </Typography>
          <Typography variant="body2">
            If you have any questions about your order, please call us at {orderData.restaurantInfo.phone}
            or contact support through the app.
          </Typography>
        </Alert>
      </Container>
    </>
  );
};

export default OrderConfirmationPage;
