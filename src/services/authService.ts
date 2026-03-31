import api from './api';

export const customerRegister = async (userData: any) => {
  try {
    const response = await api.post('/auth/customer/register', userData);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const socialLogin = async (socialData: any) => {
  try {
    const response = await api.post('/auth/social-login', socialData);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Social login failed');
  }
};

export const updateCustomerPreferences = async (preferences: any) => {
  try {
    const response = await api.put('/auth/customer/preferences', preferences);
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update preferences');
  }
};

export const getCustomerProfile = async () => {
  try {
    const response = await api.get('/auth/customer/profile');
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch customer profile');
  }
};

export const login = async (credentials: any) => {
  try {
    const response = await api.post('/auth/login', credentials);
    if (response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const register = async (userData: any) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // window.location.href = '/login';
};

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = getCurrentUser();
  return !!(token && user);
};

export const hasRole = (role: string) => {
  const user = getCurrentUser();
  return user?.role === role;
};

export const hasPermission = (module: string, action: string) => {
  const user = getCurrentUser();
  if (!user?.permissions) return false;
  const modulePermission = user.permissions.find((p: any) => p.module === module);
  return modulePermission?.actions.includes(action) || false;
};

export const getLoyaltyPoints = () => {
  const user = getCurrentUser();
  return user?.customerPreferences?.loyaltyPoints || 0;
};

export const SOCIAL_PROVIDERS = {
  google: {
    name: 'Google',
    icon: 'Google',
    color: '#db4437',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },
  facebook: {
    name: 'Facebook',
    icon: 'Facebook',
    color: '#3b5998',
    clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
  },
  twitter: {
    name: 'Twitter',
    icon: 'Twitter',
    color: '#1da1f2',
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID,
  },
  apple: {
    name: 'Apple',
    icon: 'Apple',
    color: '#000000',
    clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
  },
};

export const initGoogleAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.google === 'undefined') {
      reject(new Error('Google SDK not loaded'));
      return;
    }
    window.google.accounts.id.initialize({
      client_id: SOCIAL_PROVIDERS.google.clientId,
      callback: async (response: any) => {
        try {
          const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
          const socialData = {
            provider: 'google',
            providerId: userInfo.sub,
            email: userInfo.email,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            displayName: userInfo.name,
            profilePicture: userInfo.picture,
            accessToken: response.credential,
          };
          const result = await socialLogin(socialData);
          resolve(result.data);
        } catch (error) {
          reject(error);
        }
      },
    });
  });
};

export const initFacebookAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.FB === 'undefined') {
      reject(new Error('Facebook SDK not loaded'));
      return;
    }
    window.FB.login((response: any) => {
      if (response.authResponse) {
        window.FB.api('/me', { fields: 'name,email,first_name,last_name,picture' }, async (userInfo: any) => {
          try {
            const socialData = {
              provider: 'facebook',
              providerId: userInfo.id,
              email: userInfo.email,
              firstName: userInfo.first_name,
              lastName: userInfo.last_name,
              displayName: userInfo.name,
              profilePicture: userInfo.picture?.data?.url,
              accessToken: response.authResponse.accessToken,
            };
            const result = await socialLogin(socialData);
            resolve(result.data);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error('Facebook login cancelled'));
      }
    }, { scope: 'email,public_profile' });
  });
};

export const initAppleAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.AppleID === 'undefined') {
      reject(new Error('Apple ID SDK not loaded'));
      return;
    }
    window.AppleID.auth.signIn().then(async (response: any) => {
      try {
        const identityToken = response.authorization.id_token;
        const userInfo = JSON.parse(atob(identityToken.split('.')[1]));
        const socialData = {
          provider: 'apple',
          providerId: userInfo.sub,
          email: userInfo.email,
          firstName: response.user?.firstName || '',
          lastName: response.user?.lastName || '',
          displayName: response.user?.firstName ? `${response.user.firstName} ${response.user.lastName}` : userInfo.email,
          accessToken: identityToken,
        };
        const result = await socialLogin(socialData);
        resolve(result.data);
      } catch (error) {
        reject(error);
      }
    }).catch(reject);
  });
};

export default {
  customerRegister,
  socialLogin,
  updateCustomerPreferences,
  getCustomerProfile,
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  hasPermission,
  getLoyaltyPoints,
  initGoogleAuth,
  initFacebookAuth,
  initAppleAuth,
  SOCIAL_PROVIDERS,
};
