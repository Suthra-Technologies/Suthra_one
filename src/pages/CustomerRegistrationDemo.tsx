import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  PersonAdd,
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Apple as AppleIcon,
  RestaurantMenu,
  LocalOffer,
  Star,
  AccountCircle,
  Check
} from '@mui/icons-material';

const features: { icon: React.ReactNode; title: string; description: string }[] = [
  { icon: <PersonAdd />, title: 'Easy Registration', description: 'Quick 3-step registration process' },
  { icon: <GoogleIcon />, title: 'Social Login', description: 'Login with Google, Facebook, Twitter, or Apple' },
  { icon: <RestaurantMenu />, title: 'Food Preferences', description: 'Set dietary restrictions and spice levels' },
  { icon: <LocalOffer />, title: 'Loyalty Points', description: 'Earn points with every order' },
  { icon: <Star />, title: 'Favorite Items', description: 'Save your favorite dishes' },
  { icon: <AccountCircle />, title: 'Profile Management', description: 'Manage addresses and preferences' }
];

const socialProviders: { name: string; icon: React.ReactNode; color: string }[] = [
  { name: 'Google', icon: <GoogleIcon />, color: '#db4437' },
  { name: 'Facebook', icon: <FacebookIcon />, color: '#3b5998' },
  { name: 'Twitter', icon: <TwitterIcon />, color: '#1da1f2' },
  { name: 'Apple', icon: <AppleIcon />, color: '#000000' }
];

const CustomerRegistrationDemo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" align="center" gutterBottom>
        Customer Registration System
      </Typography>
      <Typography variant="h6" align="center" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Complete customer registration with social login integration
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <strong>Demo Ready!</strong> The customer registration system is now fully implemented with both traditional registration and social login options.
      </Alert>

      <Grid container spacing={4}>
        {/* Features Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Key Features
              </Typography>
              <Grid container spacing={2}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ mr: 2, color: 'primary.main' }}>
                          {feature.icon}
                        </Box>
                        <Typography variant="h6">
                          {feature.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Social Login Providers */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Social Login Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Customers can register and login using their existing social media accounts:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {socialProviders.map((provider) => (
                  <Chip
                    key={provider.name}
                    icon={provider.icon}
                    label={provider.name}
                    sx={{
                      backgroundColor: provider.color,
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Registration Process */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Registration Process
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Check color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Step 1: Basic Information"
                    secondary="Name, email, password, and phone number"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Check color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Step 2: Delivery Address"
                    secondary="Default address with delivery instructions"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Check color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Step 3: Food Preferences"
                    secondary="Dietary restrictions and spice level preferences"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom align="center">
                Try It Now!
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph align="center">
                Experience the complete customer registration flow
              </Typography>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/customer-auth')}
                sx={{ mb: 2, py: 1.5 }}
              >
                Customer Registration
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<RestaurantMenu />}
                onClick={() => navigate('/customer')}
                sx={{ mb: 3, py: 1.5 }}
              >
                Customer App Demo
              </Button>

              <Typography variant="h6" gutterBottom>
                Backend Features
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Check fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Customer Registration API"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Check fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Social Login Integration"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Check fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Customer Preferences Management"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Check fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Loyalty Points System"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Check fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Enhanced User Model"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerRegistrationDemo;
