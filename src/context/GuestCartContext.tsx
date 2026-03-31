import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  quantity: number;
  customizations?: any[];
  itemTotal: number;
}

export interface CustomerPreferences {
  dietaryRestrictions: string[];
  spiceLevel: string;
  notes: string;
}

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  orderType: 'delivery' | 'takeaway';
  deliveryAddress: string | null;
  customerPreferences: CustomerPreferences;
  promoCode: string | null;
  discount: number;
}

export interface GuestCartContextType {
  cart: CartState;
  addItem: (item: any, quantity?: number, customizations?: any[]) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (orderType: 'delivery' | 'takeaway') => void;
  setDeliveryAddress: (address: string) => void;
  applyPreferences: (preferences: Partial<CustomerPreferences>) => void;
  getCartSummary: () => {
    totalItems: number;
    totalAmount: number;
    itemCount: number;
    isEmpty: boolean;
  };
}

const GuestCartContext = createContext<GuestCartContextType | undefined>(undefined);

const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  APPLY_PREFERENCES: 'APPLY_PREFERENCES',
  SET_DELIVERY_ADDRESS: 'SET_DELIVERY_ADDRESS',
  SET_ORDER_TYPE: 'SET_ORDER_TYPE',
};

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  orderType: 'delivery',
  deliveryAddress: null,
  customerPreferences: {
    dietaryRestrictions: [],
    spiceLevel: 'medium',
    notes: '',
  },
  promoCode: null,
  discount: 0,
};

function cartReducer(state: CartState, action: any): CartState {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { item, quantity = 1, customizations = [] } = action.payload;
      const existingItemIndex = state.items.findIndex(
        cartItem =>
          cartItem.id === item._id &&
          JSON.stringify(cartItem.customizations) === JSON.stringify(customizations)
      );
      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = state.items.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        const newItem: CartItem = {
          id: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category,
          quantity,
          customizations,
          itemTotal: (item.price + customizations.reduce((sum: number, c: any) => sum + (c.price || 0), 0)) * quantity,
        };
        updatedItems = [...state.items, newItem];
      }
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.itemTotal, 0);
      return { ...state, items: updatedItems, totalItems, totalAmount };
    }
    case CART_ACTIONS.REMOVE_ITEM: {
      const updatedItems = state.items.filter((_, index) => index !== action.payload.index);
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.itemTotal, 0);
      return { ...state, items: updatedItems, totalItems, totalAmount };
    }
    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: CART_ACTIONS.REMOVE_ITEM, payload: { index } });
      }
      const updatedItems = state.items.map((item, i) => {
        if (i === index) {
          const customizations = item.customizations ?? [];
          const basePrice = item.price + customizations.reduce((sum, c) => sum + (c.price || 0), 0);
          return { ...item, quantity, itemTotal: basePrice * quantity };
        }
        return item;
      });
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.itemTotal, 0);
      return { ...state, items: updatedItems, totalItems, totalAmount };
    }
    case CART_ACTIONS.CLEAR_CART:
      return initialState;
    case CART_ACTIONS.SET_ORDER_TYPE:
      return { ...state, orderType: action.payload.orderType };
    case CART_ACTIONS.SET_DELIVERY_ADDRESS:
      return { ...state, deliveryAddress: action.payload.address };
    case CART_ACTIONS.APPLY_PREFERENCES:
      return { ...state, customerPreferences: { ...state.customerPreferences, ...action.payload.preferences } };
    default:
      return state;
  }
}

export const GuestCartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    localStorage.setItem('guestCart', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const savedCart = localStorage.getItem('guestCart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        parsedCart.items.forEach((item: any) => {
          dispatch({
            type: CART_ACTIONS.ADD_ITEM,
            payload: {
              item: {
                _id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                category: item.category,
              },
              quantity: item.quantity,
              customizations: item.customizations,
            },
          });
        });
      } catch (error) {
        // Error loading saved cart
      }
    }
  }, []);

  const addItem = (item: any, quantity = 1, customizations: any[] = []) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: { item, quantity, customizations } });
  };

  const removeItem = (index: number) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: { index } });
  };

  const updateQuantity = (index: number, quantity: number) => {
    dispatch({ type: CART_ACTIONS.UPDATE_QUANTITY, payload: { index, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
    localStorage.removeItem('guestCart');
  };

  const setOrderType = (orderType: 'delivery' | 'takeaway') => {
    dispatch({ type: CART_ACTIONS.SET_ORDER_TYPE, payload: { orderType } });
  };

  const setDeliveryAddress = (address: string) => {
    dispatch({ type: CART_ACTIONS.SET_DELIVERY_ADDRESS, payload: { address } });
  };

  const applyPreferences = (preferences: Partial<CustomerPreferences>) => {
    dispatch({ type: CART_ACTIONS.APPLY_PREFERENCES, payload: { preferences } });
  };

  const getCartSummary = () => ({
    totalItems: state.totalItems,
    totalAmount: state.totalAmount,
    itemCount: state.items.length,
    isEmpty: state.items.length === 0,
  });

  const value: GuestCartContextType = {
    cart: state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setOrderType,
    setDeliveryAddress,
    applyPreferences,
    getCartSummary,
  };

  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>;
};

export const useGuestCart = () => {
  const context = useContext(GuestCartContext);
  if (!context) {
    throw new Error('useGuestCart must be used within a GuestCartProvider');
  }
  return context;
};

export default GuestCartContext;
