import {
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
  AutoGraph as AutoGraphIcon,
  Autorenew as SyncIcon,
  BarChart as BarChartIcon,
  Bolt as BoltIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  CloudQueue as CloudIcon,
  CloudOutlined as CloudOutlinedIcon,
  ContentCopy as CopyIcon,
  Devices as DevicesIcon,
  Email as EmailIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  FormatQuote as FormatQuoteIcon,
  Groups as GroupsIcon,
  Hub as HubIcon,
  Inventory as InventoryIcon,
  Inventory2Outlined as Inventory2Icon,
  Kitchen as KitchenIcon,
  LocalShipping as LocalShippingIcon,
  Map as MapIcon,
  People as PeopleIcon,
  PlayCircleOutline as PlayIcon,
  PointOfSale as PointOfSaleIcon,
  QrCode as QrIcon,
  ReceiptLong as ReceiptLongIcon,
  Restaurant as RestaurantIcon,
  Security as SecurityIcon,
  SentimentSatisfiedAlt as SentimentSatisfiedAltIcon,
  Shield as ShieldIcon,
  ShoppingBag as ShoppingBagIcon,
  ShoppingCart as ShoppingCartIcon,
  Smartphone as SmartphoneIcon,
  Spa as SpaIcon,
  Star as StarIcon,
  Store as StoreIcon,
  SyncAlt as SyncAltIcon,
  EventSeat as TableIcon,
  TrendingUp as TrendingUpIcon,
  VerifiedUserOutlined as VerifiedUserOutlinedIcon,
  VideoCall as VideoCallIcon,
  Warehouse as WarehouseIcon,
  DeleteSweep as WastageIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  Drawer,
  Fade,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  Zoom,
} from "@mui/material";
import { keyframes } from "@mui/system";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PhoneInput from "../../components/PhoneInput";
import { CardGridSkeleton } from "../../components/common/PageSkeleton";
import { easternWallClockToUtcIso, formatSlotLabel, getEasternTzAbbreviation } from "../../utils/demoSlots";
import { planFeatureLabel, splitPlanFeatures } from "../../utils/planFeatures";

// Icons
import OrdersIconActiveImg from "/src/assets/images/icons/orders-active.png";
import OrdersIconImg from "/src/assets/images/icons/orders.png";
import PosIconActiveImg from "/src/assets/images/icons/POS-active-icon.png";
import PosIconImg from "/src/assets/images/icons/POS-icon.png";
import TableIconActiveImg from "/src/assets/images/icons/table-active.png";
import TableIconImg from "/src/assets/images/icons/table.png";
import BookingIconActiveImg from "/src/assets/images/icons/booking-active.png";
import BookingIconImg from "/src/assets/images/icons/booking.png";
import CateringIconActiveImg from "/src/assets/images/icons/catering-active.png";
import CateringIconImg from "/src/assets/images/icons/catering.png";
import KitchenOrdersIconActiveImg from "/src/assets/images/icons/kitchen-orders-active.png";
import KitchenOrdersIconImg from "/src/assets/images/icons/kitchen-orders.png";
import MenuIconActiveImg from "/src/assets/images/icons/menu-active.png";
import MenuIconImg from "/src/assets/images/icons/menu.png";
import InventoryIconActiveImg from "/src/assets/images/icons/inventory-active.png";
import InventoryIconImg from "/src/assets/images/icons/inventory.png";
import WastageIconActiveImg from "/src/assets/images/icons/wastage-active.png";
import WastageIconImg from "/src/assets/images/icons/wastage.png";
import PurchaseOrdersIconActiveImg from "/src/assets/images/icons/purchase-orders-active.png";
import PurchaseOrdersIconImg from "/src/assets/images/icons/purchase.png";
import VendorsIconActiveImg from "/src/assets/images/icons/vendors-active.png";
import VendorsIconImg from "/src/assets/images/icons/vendors.png";
import CouponsIconActiveImg from "/src/assets/images/icons/coupons-active.png";
import CouponsIconImg from "/src/assets/images/icons/coupons.png";
import UsersIconActiveImg from "/src/assets/images/icons/users-active.png";
import UsersIconImg from "/src/assets/images/icons/users.png";
import StaffIconActiveImg from "/src/assets/images/icons/staff-active.png";
import StaffIconImg from "/src/assets/images/icons/staff.png";

// Images
import Logo from "../../assets/images/Images/Home/Logo.webp";
import LogoIcon from "../../assets/images/Images/Home/LogoIcon.webp";
import heroAnalyticsLaptopImg from "../../assets/images/modules/hero_analytics_laptop.jpg";
import highlightInventorySyncImg from "../../assets/images/modules/highlight_inventory_sync.jpg";
import highlightStaffPayrollImg from "../../assets/images/modules/highlight_staff_payroll.jpg";
import demoVideo from "../../assets/videos/demo_video.mp4";
import stockInventoryImg from "../../assets/images/modules/stock_inventory.jpg";
import discountsLoyaltyImg from "../../assets/images/modules/discounts_loyalty.jpg";
import staffAttendanceImg from "../../assets/images/modules/staff_attendance.jpg";
import purchasesSuppliersImg from "../../assets/images/modules/purchases_suppliers.jpg";
import BM from "../../assets/images/BM.png";
import CM from "../../assets/images/CM.png";
import COUPONS_PIC from "../../assets/images/coupons.png";
import fqaimage from "../../assets/images/faq-image.jpg";
import IM from "../../assets/images/IM.png";
import KO from "../../assets/images/KO.png";
import MM from "../../assets/images/MM.png";
import OM from "../../assets/images/OM.png";
import cashierCart from "../../assets/images/cashier-cart.png";
import ORDERS_PIC from "../../assets/images/purchase.png";
import speakinghead from "../../assets/images/speaking-head.jpg";
import STAFF_PIC from "../../assets/images/staff.png";
import TM from "../../assets/images/TM.png";
import USERS_PIC from "../../assets/images/users.png";
import VENDORS_IMG from "../../assets/images/vendors.png";
import WM from "../../assets/images/WM.png";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// --- High-Quality Multi-Industry Stock Images ---
const INDUSTRY_IMAGES = {
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
  supermarket: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80",
  restaurant: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
  services: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
  enterprise: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
};

// --- Universal (Non-Industry-Specific) Module & Hero Photography ---
// Chosen to avoid any single-industry (e.g. food service) bias or third-party brand marks,
// since Suthra One serves retail, supermarkets, salons, wholesale, and restaurants alike.
const MODULE_IMAGES = {
  counterCheckout: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
  tabletCheckout: "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80",
  counterPayment: "https://images.unsplash.com/photo-1556742212-5b321f3c261b?auto=format&fit=crop&w=1200&q=80",
  loyaltyDiscount: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1200&q=80",
  posTerminalCheckout: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=1200&q=80",
  tapToPayCounter: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80",
};

// --- Animations ---
const floatSlow = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(0.8deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const floatMedium = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-16px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.35); }
  70% { box-shadow: 0 0 0 24px rgba(255, 107, 53, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
`;

const streamFlow = keyframes`
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
`;

const syncPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
`;

// --- Unified Light Design System ---
const UNIFIED_BG = "#FAFAFC"; // Single unified consistent light background for all sections
const CARD_BG = "#FFFFFF";

const DS = {
  orange: "#FF6B35",
  orangeHover: "#E85A28",
  dark: "#0F172A",
  darkHover: "#1E293B",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  white: "#FFFFFF",
  purple: "#FF6B35", // remapped to Brand Orange
  purpleLight: "rgba(255, 107, 53, 0.15)",
  purpleDark: "#0F172A", // remapped to Brand Black
  emerald: "#FF6B35",
  purpleGradient: "linear-gradient(135deg, #FF6B35 0%, #E85A28 100%)",
  heroLightGlow: "radial-gradient(circle at 50% 15%, rgba(255, 107, 53, 0.12) 0%, rgba(15, 23, 42, 0.03) 50%, #FAFAFC 80%)",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontHeading: "'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif",
  radiusBtn: "9999px",
  radiusCard: "24px",
};

// --- Hero Multi-Device Scroll Showcase Stages ---
const HERO_SHOWCASE_STAGES = [
  {
    id: "countertop",
    tag: "Countertop POS",
    title: "High-Speed Counter POS",
    desc: "Complete touch register, barcode scanner, and cash drawer hardware setup.",
    image: MODULE_IMAGES.counterCheckout,
    badges: [
      {
        pos: { top: "4%", left: { xs: "-2%", sm: "4%" } },
        icon: ShoppingCartIcon,
        color: DS.orange,
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Barcode Checkout",
        subtitle: "✓ 0.6s Instant Scan",
        subColor: "#E85A28",
        animDelay: "0s",
      },
      {
        pos: { top: "34%", right: { xs: "-4%", sm: "-2%" } },
        icon: Inventory2Icon,
        color: DS.purple,
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Multi-Outlet Sync",
        subtitle: "1,480 SKUs Live",
        subColor: DS.purple,
        animDelay: "0.8s",
      },
      {
        pos: { bottom: "6%", left: { xs: "0%", sm: "8%" } },
        icon: CheckIcon,
        color: "#FF6B35",
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Payment $128.50",
        subtitle: "✓ Cashless & Card Paid",
        subColor: "#E85A28",
        animDelay: "1.5s",
      },
    ],
  },
  {
    id: "tablet",
    tag: "Tablet & Mobile Billing",
    title: "Portable Aisle & Table POS",
    desc: "Take orders and accept contactless payments directly from mobile tablets.",
    image: MODULE_IMAGES.tabletCheckout,
    badges: [
      {
        pos: { top: "4%", left: { xs: "-2%", sm: "4%" } },
        icon: SmartphoneIcon,
        color: "#FF6B35",
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Mobile POS Billing",
        subtitle: "✓ Aisle & Tableside Scan",
        subColor: "#E85A28",
        animDelay: "0s",
      },
      {
        pos: { top: "34%", right: { xs: "-4%", sm: "-2%" } },
        icon: QrIcon,
        color: "#FF6B35",
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Contactless NFC",
        subtitle: "Apple Pay & QR Scan",
        subColor: "#E85A28",
        animDelay: "0.8s",
      },
      {
        pos: { bottom: "6%", left: { xs: "0%", sm: "8%" } },
        icon: ReceiptLongIcon,
        color: DS.orange,
        bg: "rgba(255, 107, 53, 0.12)",
        title: "Digital Invoices",
        subtitle: "✓ Instant SMS & WhatsApp Bill",
        subColor: "#E85A28",
        animDelay: "1.5s",
      },
    ],
  },
  {
    id: "analytics",
    tag: "Cloud Multi-Store Hub",
    title: "Real-Time Cloud Analytics",
    desc: "Monitor live store revenue, top sellers, and profit margins across branches.",
    image: heroAnalyticsLaptopImg,
    badges: [
      {
        pos: { top: "4%", left: { xs: "-2%", sm: "4%" } },
        icon: TrendingUpIcon,
        color: "#FF6B35",
        bg: "rgba(255, 107, 53, 0.12)",
        title: "+24.1% YoY Revenue",
        subtitle: "✓ Real-Time Sales Spikes",
        subColor: "#E85A28",
        animDelay: "0s",
      },
      {
        pos: { top: "34%", right: { xs: "-4%", sm: "-2%" } },
        icon: StoreIcon,
        color: DS.purple,
        bg: "rgba(255, 107, 53, 0.12)",
        title: "12 Stores Live",
        subtitle: "Central Cloud Sync",
        subColor: DS.purple,
        animDelay: "0.8s",
      },
      {
        pos: { bottom: "6%", left: { xs: "0%", sm: "8%" } },
        icon: BarChartIcon,
        color: "#FF6B35",
        bg: "rgba(255, 107, 53, 0.12)",
        title: "$645,800 Profit Margin",
        subtitle: "✓ 34% Net Operational Margin",
        subColor: "#E85A28",
        animDelay: "1.5s",
      },
    ],
  },
];

// --- Multi-Industry Categories Data ---
const INDUSTRIES_DATA = [
  {
    id: "retail",
    name: "Retail & Boutiques",
    badge: "Apparel, Electronics & General Stores",
    icon: ShoppingCartIcon,
    accent: "#FF6B35",
    headline: "Fast Barcode Scanning & Variant-Level Inventory",
    description:
      "Handle thousands of SKUs with color, size, and brand variations. Generate barcodes, print custom tags, and process customer returns with seamless accuracy.",
    image: INDUSTRY_IMAGES.retail,
    features: [
      "SKU, barcode & matrix variant management (Size/Color/Brand)",
      "Split payments, store credits & instant digital receipts",
      "Customer loyalty points & automated SMS promo campaigns",
      "Automated stock deduction with low-stock replenishment alerts",
    ],
  },
  {
    id: "supermarket",
    name: "Supermarkets & Groceries",
    badge: "High-Volume Hypermarkets & Marts",
    icon: StoreIcon,
    accent: "#FF6B35",
    headline: "Rapid Checkout & Batch Expiry Tracking",
    description:
      "Designed for peak hour rush. Integrates with electronic weighing scales, supports bulk barcode scanning, and tracks batch expiration dates seamlessly.",
    image: INDUSTRY_IMAGES.supermarket,
    features: [
      "Sub-second barcode scan & integrated digital scale billing",
      "Batch, lot, and expiry date management with waste prevention",
      "Multi-cashier registers with cash drawer audit controls",
      "Wholesale pricing tiers, bulk bundle discounts, and coupons",
    ],
  },
  {
    id: "restaurants",
    name: "Restaurants, Cafes & Bars",
    badge: "Dine-In, Takeaway, Bars & Cloud Kitchens",
    icon: RestaurantIcon,
    accent: "#FF6B35",
    headline: "Floor Plan Tables, Real-time KDS & QR Ordering",
    description:
      "Connect your dining room to the kitchen effortlessly. Visual table management, live digital Kitchen Display System (KDS), split tickets, and touch POS.",
    image: INDUSTRY_IMAGES.restaurant,
    features: [
      "Visual interactive floor plan with real-time table statuses",
      "Paperless Kitchen Display System (KDS) with cook-time alerts",
      "Contactless QR code tableside ordering & Apple/Google Pay",
      "Recipe ingredient deduction & waste log auditing",
    ],
  },
  {
    id: "services",
    name: "Salons & Service Hubs",
    badge: "Spas, Clinics, Repair & Beauty Centers",
    icon: SpaIcon,
    accent: "#EC4899",
    headline: "Appointment Scheduling & Stylist Commission Tracking",
    description:
      "Manage clients, appointments, service packages, and staff commissions seamlessly in one unified interface with automatic customer reminders.",
    image: INDUSTRY_IMAGES.services,
    features: [
      "Smart booking calendar with timeline & list views",
      "Employee commission calculations & tips distribution",
      "Client visit histories, treatment notes & preference profiles",
      "Service package bundles, gift vouchers & recurring memberships",
    ],
  },
  {
    id: "enterprise",
    name: "Wholesale & Multi-Location",
    badge: "Franchises, Chains & Distribution Networks",
    icon: WarehouseIcon,
    accent: "#FF6B35",
    headline: "Centralized HQ Control & Inter-Store Stock Transfers",
    description:
      "Scale from 1 to 500+ outlets. Manage all branch operations, inter-store inventory transfers, vendor purchase orders, and consolidated P&L reporting in real time.",
    image: INDUSTRY_IMAGES.enterprise,
    features: [
      "Centralized cloud master catalog synced across all branches",
      "Inter-store stock transfer requests with transit tracking",
      "Supplier purchase orders (PO) with approval workflows",
      "Granular role-based permissions (Cashier, Manager, Admin, Auditor)",
    ],
  },
];

// --- Quick Feature Highlights ---
const QUICK_HIGHLIGHTS = [
  {
    title: "Universal POS Terminal",
    desc: "Lightning fast touch & barcode billing optimized for rush-hour speed across all devices.",
    icon: PointOfSaleIcon,
    accent: "#FF6B35",
    badge: "Sub-second Billing",
    bgImage: MODULE_IMAGES.tapToPayCounter,
  },
  {
    title: "Multi-Store Inventory",
    desc: "Real-time stock syncing across branches, automated reorder triggers & variant tracking.",
    icon: Inventory2Icon,
    accent: "#FF6B35",
    badge: "Zero Stockouts",
    bgImage: highlightInventorySyncImg,
  },
  {
    title: "Staff & Payroll Hub",
    desc: "Track staff shifts, attendance geo-stamps, performance sales metrics, and wage payouts.",
    icon: PeopleIcon,
    accent: "#FF6B35",
    badge: "Smart Workforce",
    bgImage: highlightStaffPayrollImg,
  },
  {
    title: "CRM & Loyalty Engine",
    desc: "Drive repeat sales with targeted SMS marketing, reward points, and dynamic discount coupons.",
    icon: StarIcon,
    accent: "#FF6B35",
    badge: "+35% Retention",
    bgImage: MODULE_IMAGES.loyaltyDiscount,
  },
];



// --- Ecosystem Nodes for Central Hub Diagram ---
const ECOSYSTEM_NODES = [
  {
    id: "inventory",
    label: "Inventory & SKUs",
    icon: Inventory2Icon,
    color: "#FF6B35",
    accentBg: "#FFF5EE",
    desc: "Real-time stock sync",
    badge: "⚡ 0.01s Sync",
    badgeBg: "#FFF5EE",
    badgeColor: "#FF6B35",
    pos: { top: "2%", left: "50%", transform: "translateX(-50%)" },
  },
  {
    id: "billing",
    label: "High-Speed Billing",
    icon: PointOfSaleIcon,
    color: "#FF6B35",
    accentBg: "#FFF5EE",
    desc: "Touch & Barcode POS",
    badge: "⚡ Sub-Second",
    badgeBg: "#FFF5EE",
    badgeColor: "#E85A28",
    pos: { top: "36%", left: { xs: "0%", md: "2%" }, transform: "translateY(-50%)" },
  },
  {
    id: "staff",
    label: "Staff & Payroll",
    icon: PeopleIcon,
    color: "#FF6B35",
    accentBg: "#FFF5EE",
    desc: "Shift & wage logs",
    badge: "🕒 Live Geo-Clock",
    badgeBg: "#FFF5EE",
    badgeColor: "#FF6B35",
    pos: { top: "36%", right: { xs: "0%", md: "2%" }, transform: "translateY(-50%)" },
  },
  {
    id: "crm",
    label: "CRM & Customers",
    icon: GroupsIcon,
    color: "#FF6B35",
    accentBg: "#FFF5EE",
    desc: "Loyalty & rewards",
    badge: "🔄 Real-Time Sync",
    badgeBg: "#FFF5EE",
    badgeColor: "#E85A28",
    pos: { bottom: "4%", left: { xs: "2%", md: "8%" } },
  },
  {
    id: "analytics",
    label: "Executive Analytics",
    icon: BarChartIcon,
    color: "#FF6B35",
    accentBg: "#FFF5EE",
    desc: "Live profit & tax",
    badge: "📊 Instant Insights",
    badgeBg: "#FFF5EE",
    badgeColor: "#E85A28",
    pos: { bottom: "4%", right: { xs: "2%", md: "8%" } },
  },
];

const ECOSYSTEM_TRUST_ITEMS = [
  { icon: AccessTimeIcon, title: "100% Real-Time", subtitle: "Changes reflect instantly" },
  { icon: CloudIcon, title: "One Central Cloud", subtitle: "All data, one source of truth" },
  { icon: ShieldIcon, title: "Secure & Reliable", subtitle: "Enterprise-grade security" },
  { icon: BoltIcon, title: "Zero Discrepancies", subtitle: "No manual reconciliation" },
];

const HERO_TRUST_ITEMS = [
  { icon: AccessTimeIcon, text: "3-Day Free Trial" },
  { icon: StoreIcon, text: "Built for All Business Types" },
  { icon: PointOfSaleIcon, text: "Touch & Barcode POS" },
  { icon: VerifiedUserOutlinedIcon, text: "24/7 Dedicated Support" },
];

const STATS_DATA = [
  { value: "5,000+", label: "Active Businesses", icon: StoreIcon, color: "#FF6B35" },
  { value: "$250M+", label: "Annual Transactions", icon: AutoGraphIcon, color: "#FF6B35" },
  { value: "15M+", label: "Receipts Generated", icon: ShoppingBagIcon, color: "#FF6B35" },
  { value: "99.99%", label: "Cloud Uptime", icon: ShieldIcon, color: "#FF6B35" },
];

const CTA_TRUST_ITEMS = [
  "Ready in Under 5 Minutes",
  "No Credit Card Required",
  "Multi-Device & Cloud Native",
  "Bank-Grade 256-bit Encryption",
];

// --- 6 Simple & Universal Core Business Modules ---
const featureData = [
  {
    title: "Billing & POS",
    badge: "Quick Checkout",
    subheading: "Fast barcode scanning and touch billing built for rush hours on any computer, tablet, or phone.",
    icon: {
      inactive: PosIconImg,
      active: PosIconActiveImg,
    },
    images: [MODULE_IMAGES.posTerminalCheckout],
    points: [
      "Quick barcode scanning, item search, and touch buttons for instant billing",
      "Accept all payments: Cash, Card, UPI, Mobile Wallets, and Split Bills",
      "Print receipts on thermal printers or send instant digital SMS/Email bills",
      "Works offline and keeps your daily cash totals accurate automatically",
    ],
  },
  {
    title: "Stock & Inventory",
    badge: "Stock Tracking",
    subheading: "Keep track of items, sizes, colors, and stock levels so you never run out of products.",
    icon: {
      inactive: InventoryIconImg,
      active: InventoryIconActiveImg,
    },
    images: [stockInventoryImg],
    points: [
      "Track items with sizes, colors, and brands with custom barcode printing",
      "Get automatic low-stock alerts before items run out",
      "Transfer stock between stores and track shipments easily",
      "Track expiry dates and batch numbers to prevent product wastage",
    ],
  },
  {
    title: "Orders & Bookings",
    badge: "Live Orders",
    subheading: "Manage walk-in customers, online orders, delivery, and appointments in one screen.",
    icon: {
      inactive: OrdersIconImg,
      active: OrdersIconActiveImg,
    },
    images: [MODULE_IMAGES.counterPayment],
    points: [
      "Live order board showing New, Preparing, Ready, and Completed orders",
      "Handles store walk-ins, online pickups, and delivery orders together",
      "Easy booking calendar for customer appointments and table reservations",
      "Automatic SMS updates sent to customers when orders are ready",
    ],
  },
  {
    title: "Discounts & Loyalty",
    badge: "Customer Rewards",
    subheading: "Reward your regular customers and run special discount offers to grow your sales.",
    icon: {
      inactive: CouponsIconImg,
      active: CouponsIconActiveImg,
    },
    images: [discountsLoyaltyImg],
    points: [
      "Customer contact profiles with past purchase history and loyalty points",
      "Automatic reward points that customers can use for discounts at checkout",
      "Create custom promo codes, percentage discounts, and Buy-1-Get-1 offers",
      "Send SMS and email offers to bring customers back to your store",
    ],
  },
  {
    title: "Staff & Attendance",
    badge: "Team Management",
    subheading: "Track employee shift times, attendance, staff roles, and commission payouts.",
    icon: {
      inactive: StaffIconImg,
      active: StaffIconActiveImg,
    },
    images: [staffAttendanceImg],
    points: [
      "Easy PIN clock-in and clock-out to track daily staff working hours",
      "Calculate employee sales commissions and tips automatically",
      "Secure permissions: choose what Cashiers, Managers, and Staff can see",
      "Clear activity history logs for all discounts, edits, and refunds",
    ],
  },
  {
    title: "Purchases & Suppliers",
    badge: "Vendor Orders",
    subheading: "Order goods from suppliers, track incoming deliveries, and manage unpaid bills easily.",
    icon: {
      inactive: PurchaseOrdersIconImg,
      active: PurchaseOrdersIconActiveImg,
    },
    images: [purchasesSuppliersImg],
    points: [
      "Create and send purchase orders directly to suppliers in one click",
      "Check incoming deliveries against invoices to make sure nothing is missing",
      "Supplier contact book with payment terms and balance tracking",
      "Clear profit and cost reports so you know your exact business margins",
    ],
  },
];

// --- Testimonials Data ---
const TESTIMONIALS_DATA = [
  {
    quote:
      "Transitioning our 4 retail fashion boutiques to this POS revolutionized how we track stock. Variant matrix and instant barcode billing cut customer checkout lines in half!",
    author: "Elena Rostova",
    role: "Founder & Creative Director",
    company: "Luxe Thread Boutiques",
    industry: "Retail & Fashion",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    quote:
      "In our supermarket, speed is everything during evening rush hours. The scale integration and barcode scanning are instantaneous. Our inventory syncs across warehouses flawlessly.",
    author: "Rajesh Varma",
    role: "Operations Director",
    company: "FreshMart Superstores (12 Outlets)",
    industry: "Supermarket & Groceries",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    quote:
      "Orders flow directly from dining tables to our kitchen displays without paper errors. We slashed table turnover times by 35% in our first quarter.",
    author: "Ravi Kumar",
    role: "Managing Partner",
    company: "Urban Grill & Dining Group",
    industry: "Restaurants & Hospitality",
    avatar: speakinghead,
    rating: 5,
  },
];

// --- Reusable Scroll Reveal Hook ---
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (domRef.current) observer.unobserve(domRef.current);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const currentElem = domRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }
    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, []);

  return { domRef, isVisible };
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Hero 3-stage device showcase state (0 = Countertop, 1 = Tablet, 2 = Laptop)
  const [heroImageStep, setHeroImageStep] = useState(0);

  // Auto-cycle through devices smoothly every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroImageStep((prev) => (prev + 1) % HERO_SHOWCASE_STAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleHeroStepClick = (idx: number) => {
    setHeroImageStep(idx);
  };

  // Selected industry tab state & in-card wheel scroll
  const [selectedIndustry, setSelectedIndustry] = useState<string>("retail");
  const lastIndustryWheelTime = useRef(0);

  const handleIndustryWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastIndustryWheelTime.current < 260) return;
    const currentIndex = INDUSTRIES_DATA.findIndex((i) => i.id === selectedIndustry);
    if (e.deltaY > 10) {
      if (currentIndex < INDUSTRIES_DATA.length - 1) {
        lastIndustryWheelTime.current = now;
        setSelectedIndustry(INDUSTRIES_DATA[currentIndex + 1].id);
      }
    } else if (e.deltaY < -10) {
      if (currentIndex > 0) {
        lastIndustryWheelTime.current = now;
        setSelectedIndustry(INDUSTRIES_DATA[currentIndex - 1].id);
      }
    }
  };

  const handleIndustrySelect = (id: string) => {
    setSelectedIndustry(id);
  };
  const currentIndustryObj = useMemo(
    () => INDUSTRIES_DATA.find((i) => i.id === selectedIndustry) || INDUSTRIES_DATA[0],
    [selectedIndustry]
  );

  // Active module feature state
  const [activeFeature, setActiveFeature] = useState(0);
  const [featurePage, setFeaturePage] = useState(0);
  const ITEMS_PER_PAGE = 7;
  const totalFeaturePages = Math.ceil(featureData.length / ITEMS_PER_PAGE);
  const visibleFeatureItems = featureData.slice(
    featurePage * ITEMS_PER_PAGE,
    featurePage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  // Highlights & testimonials rotation
  const [quickSlide, setQuickSlide] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Modals & Drawers
  const [videoOpen, setVideoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Public Plans from API
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Demo Form State & APIs (Preserved 100%)
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phonePrefix: "+1",
    phoneNumber: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({});
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    meetingLink?: string;
  }>({
    open: false,
    type: "success",
    title: "",
    message: "",
    meetingLink: "",
  });
  const [copied, setCopied] = useState(false);

  // Scroll Reveal sections
  const heroReveal = useScrollReveal();
  const industryReveal = useScrollReveal();
  const highlightsReveal = useScrollReveal();
  const ecosystemReveal = useScrollReveal();
  const featuresReveal = useScrollReveal();
  const testimonialsReveal = useScrollReveal();
  const pricingReveal = useScrollReveal();
  const demoReveal = useScrollReveal();

  // Fetch public plans on mount
  useEffect(() => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";
    fetch(`${apiUrl}/api/superadmin/plans/public`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data.filter((p: any) => p.isActive !== false && p.interval !== "trial"));
        }
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  // Fetch available slots when preferred date changes
  useEffect(() => {
    if (formData.preferredDate) {
      setFetchingSlots(true);
      setFormData((prev) => ({ ...prev, preferredTime: "" }));
      const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";
      fetch(`${apiUrl}/api/email/demo-requests/slots?date=${formData.preferredDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.slots) {
            setAvailableSlots(data.slots);
          } else {
            setAvailableSlots([]);
          }
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setFetchingSlots(false));
    } else {
      setAvailableSlots([]);
    }
  }, [formData.preferredDate]);

  // Auto-rotate quick highlights & testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setQuickSlide((prev) => (prev + 1) % QUICK_HIGHLIGHTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const testTimer = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS_DATA.length);
    }, 6000);
    return () => clearInterval(testTimer);
  }, []);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
        if (errors.phoneNumber) {
          setErrors((prev) => ({ ...prev, phoneNumber: "" }));
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDemoSubmit = async (e: any) => {
    e.preventDefault();

    if (formData.phoneNumber.length !== 10) {
      setErrors({ phoneNumber: "Phone number must be exactly 10 digits" });
      return;
    }
    if (!formData.preferredDate || !formData.preferredTime) {
      setDialogState({
        open: true,
        type: "error",
        title: "Preferred Slot Required",
        message: "Please select a preferred date and time for your demo.",
      });
      return;
    }

    setLoading(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";

      const payload = {
        businessName: formData.businessName,
        email: formData.email,
        phonePrefix: formData.phonePrefix,
        phoneNumber: formData.phoneNumber,
        preferredDateTime: easternWallClockToUtcIso(
          formData.preferredDate,
          formData.preferredTime
        ),
      };

      const response = await fetch(`${apiUrl}/api/email/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const meetLink = data.meetingLink;
        setDialogState({
          open: true,
          type: "success",
          title: meetLink ? "Demo Scheduled Successfully!" : "Request Sent Successfully!",
          message: meetLink
            ? "Your demo is confirmed! A Google Meet link has been generated. You can join the meeting directly using the link below."
            : "Thank you for your interest. Our team will contact you shortly to schedule your personalized demo.",
          meetingLink: meetLink || "",
        });
        setFormData({
          businessName: "",
          email: "",
          phonePrefix: "+1",
          phoneNumber: "",
          preferredDate: "",
          preferredTime: "",
        });
      } else {
        throw new Error("Failed to send request");
      }
    } catch (err) {
      console.error(err);
      setDialogState({
        open: true,
        type: "error",
        title: "Submission Failed",
        message: "Something went wrong. Please check your connection and try again, or contact us directly.",
        meetingLink: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToDemo = () => {
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: UNIFIED_BG,
        color: DS.textPrimary,
        overflowX: "hidden",
        fontFamily: DS.fontBody,
      }}
    >
      {/* ─── Unified Light Top Navbar ─────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "rgba(250, 250, 252, 0.9)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid #E2E8F0",
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              justifyContent: "space-between",
              height: { xs: 68, md: 76 },
              gap: 2,
            }}
          >
            {/* Logo Brand Mark */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.6}
              sx={{ cursor: "pointer", flexShrink: 0, py: 0.5, textDecoration: "none" }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <Box
                component="img"
                src={LogoIcon}
                alt="Suthra One"
                sx={{
                  height: { xs: 40, sm: 46, md: 50 },
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 10px rgba(255,107,53,0.22))",
                }}
              />
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: DS.fontHeading,
                      fontWeight: 800,
                      fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.6rem" },
                      letterSpacing: "-0.03em",
                      color: DS.textPrimary,
                      lineHeight: 1.05,
                    }}
                  >
                    Suthra
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: DS.fontHeading,
                      fontWeight: 800,
                      fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.6rem" },
                      letterSpacing: "-0.03em",
                      color: DS.orange,
                      lineHeight: 1.05,
                    }}
                  >
                    One
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontFamily: DS.fontBody,
                    fontSize: { xs: "0.58rem", sm: "0.64rem", md: "0.68rem" },
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#64748B",
                    textTransform: "uppercase",
                    lineHeight: 1.2,
                    mt: 0.25,
                  }}
                >
                  ALL-IN-ONE POS SYSTEM
                </Typography>
              </Box>
            </Stack>

            {/* Desktop Navigation */}
            <Box
              sx={{
                display: { xs: "none", lg: "flex" },
                flex: 1,
                justifyContent: "center",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  bgcolor: "#FFFFFF",
                  px: 2,
                  py: 0.75,
                  borderRadius: DS.radiusBtn,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                {[
                  { label: "Overview", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
                  { label: "Industries", action: () => document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "Features", action: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "Ecosystem", action: () => document.getElementById("ecosystem")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "Pricing", action: () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }) },
                ].map((item) => (
                  <Button
                    key={item.label}
                    onClick={item.action}
                    sx={{
                      color: "#475569",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      fontFamily: DS.fontBody,
                      px: 2,
                      py: 0.75,
                      borderRadius: DS.radiusBtn,
                      textTransform: "none",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "#F1F5F9",
                        color: DS.purple,
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* Action Buttons */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/login")}
                sx={{
                  color: "#334155",
                  borderColor: "#CBD5E1",
                  borderRadius: DS.radiusBtn,
                  px: 2.75,
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  fontFamily: DS.fontBody,
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#94A3B8",
                    bgcolor: "#F1F5F9",
                  },
                }}
              >
                Log In
              </Button>
              <Button
                variant="contained"
                onClick={scrollToDemo}
                sx={{
                  background: "linear-gradient(135deg, #FF6B35 0%, #E85A28 100%)",
                  color: "#fff",
                  borderRadius: DS.radiusBtn,
                  px: 3,
                  py: 0.9,
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  fontFamily: DS.fontBody,
                  textTransform: "none",
                  boxShadow: "0 4px 16px rgba(255,107,53,0.35)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #E85A28 0%, #D84818 100%)",
                    boxShadow: "0 6px 22px rgba(255,107,53,0.45)",
                  },
                }}
              >
                Try Free for 3 Days
              </Button>
            </Stack>

            {/* Mobile Hamburger */}
            <Box sx={{ display: { xs: "flex", lg: "none" } }}>
              <IconButton
                aria-label="menu"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "#334155" }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ width: 22, height: 2, bgcolor: "#334155", borderRadius: 1 }} />
                  ))}
                </Box>
              </IconButton>
            </Box>

            {/* Mobile Drawer */}
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              PaperProps={{ sx: { width: 290, bgcolor: "#FFFFFF", color: DS.textPrimary, p: 2.5 } }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box component="img" src={Logo} alt="Suthra One" sx={{ height: 38 }} />
                <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "#334155" }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Stack spacing={1.5}>
                {[
                  { label: "Overview", action: () => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                  { label: "Industries", action: () => { setMobileMenuOpen(false); document.getElementById("industries")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: "Features", action: () => { setMobileMenuOpen(false); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: "Ecosystem", action: () => { setMobileMenuOpen(false); document.getElementById("ecosystem")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: "Pricing", action: () => { setMobileMenuOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: "Request Demo", action: () => { setMobileMenuOpen(false); scrollToDemo(); } },
                ].map((item) => (
                  <Button
                    key={item.label}
                    fullWidth
                    onClick={item.action}
                    sx={{
                      color: "#334155",
                      justifyContent: "flex-start",
                      textTransform: "none",
                      fontWeight: 600,
                      py: 1,
                      px: 1.5,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#F1F5F9" },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Box sx={{ pt: 2, borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                    sx={{ color: "#334155", borderColor: "#CBD5E1", borderRadius: DS.radiusBtn, textTransform: "none" }}
                  >
                    Log In
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => { setMobileMenuOpen(false); scrollToDemo(); }}
                    sx={{ bgcolor: DS.orange, color: "#fff", borderRadius: DS.radiusBtn, textTransform: "none", fontWeight: 700 }}
                  >
                    Try Free for 3 Days
                  </Button>
                </Box>
              </Stack>
            </Drawer>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ─── Hero Section (Clean Compact Showcase, No Empty Gaps) ─── */}
      <Box
        ref={heroReveal.domRef}
        sx={{
          bgcolor: UNIFIED_BG,
          backgroundImage: DS.heroLightGlow,
          pt: { xs: 13, md: 16 },
          pb: { xs: 7, md: 10 },
          position: "relative",
          overflow: "hidden",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: heroReveal.isVisible ? 1 : 0,
          transform: heroReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
            {/* Left Column Text */}
            <Grid item xs={12} lg={6}>
              {/* Badge */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2.2,
                  py: 0.85,
                  borderRadius: DS.radiusBtn,
                  bgcolor: "rgba(255, 107, 53, 0.08)",
                  border: "1px solid rgba(255, 107, 53, 0.2)",
                  mb: 3,
                }}
              >
                <BoltIcon sx={{ color: DS.orange, fontSize: 18 }} />
                <Typography
                  sx={{
                    color: DS.purpleDark,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontFamily: DS.fontHeading,
                  }}
                >
                  Universal POS & Business ERP Platform
                </Typography>
              </Box>

              {/* Main Heading */}
              <Typography
                component="h1"
                sx={{
                  fontFamily: DS.fontHeading,
                  fontWeight: 800,
                  fontSize: { xs: "2.4rem", sm: "3.2rem", md: "3.8rem", xl: "4.2rem" },
                  color: DS.textPrimary,
                  lineHeight: 1.12,
                  letterSpacing: "-0.03em",
                  mb: 3,
                }}
              >
                One Powerful POS Suite for{" "}
                <Box
                  component="span"
                  sx={{
                    background: "linear-gradient(135deg, #FF6B35 0%, #E85A28 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: "inline",
                  }}
                >
                  Every Business.
                </Box>
              </Typography>

              {/* Subheading */}
              <Typography
                sx={{
                  color: DS.textSecondary,
                  fontSize: { xs: "1rem", sm: "1.125rem", md: "1.2rem" },
                  lineHeight: 1.7,
                  maxWidth: 580,
                  mb: 4.5,
                  fontFamily: DS.fontBody,
                }}
              >
                From fast-paced retail shops and busy restaurants to multi-aisle supermarkets, salons, and wholesale warehouses — manage fast checkout, live inventory, staff payroll, and real-time CRM with effortless precision.
              </Typography>

              {/* CTA Buttons */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mb: 5 }}
              >
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={scrollToDemo}
                  sx={{
                    background: "linear-gradient(135deg, #FF6B35 0%, #E85A28 100%)",
                    color: "#fff",
                    borderRadius: DS.radiusBtn,
                    px: 4,
                    py: 1.75,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    fontFamily: DS.fontBody,
                    textTransform: "none",
                    boxShadow: "0 8px 24px rgba(255,107,53,0.35)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #E85A28 0%, #D84818 100%)",
                      boxShadow: "0 12px 30px rgba(255,107,53,0.5)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.25s ease",
                  }}
                >
                  Start 3-Day Free Trial
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayIcon sx={{ color: DS.purple, fontSize: 24 }} />}
                  onClick={() => setVideoOpen(true)}
                  sx={{
                    color: DS.dark,
                    borderColor: "#CBD5E1",
                    borderRadius: DS.radiusBtn,
                    px: 3.5,
                    py: 1.75,
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    fontFamily: DS.fontBody,
                    textTransform: "none",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    "&:hover": {
                      borderColor: DS.purple,
                      bgcolor: "#F8FAFC",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.25s ease",
                  }}
                >
                  Watch Live Demo
                </Button>
              </Stack>

              {/* Trust Features Strip */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                flexWrap="wrap"
                gap={1.5}
                sx={{
                  p: 2,
                  borderRadius: "20px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
                }}
              >
                {HERO_TRUST_ITEMS.map((item) => (
                  <Stack
                    key={item.text}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ px: 1.5, py: 0.5 }}
                  >
                    <item.icon sx={{ fontSize: 19, color: DS.orange }} />
                    <Typography
                      sx={{
                        color: "#475569",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        fontFamily: DS.fontBody,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>

            {/* Right Column - Interactive 3-Device Visual Showcase */}
            <Grid item xs={12} lg={6}>
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: { xs: 380, sm: 480, md: 520 },
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: "32px",
                  bgcolor: "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(226, 232, 240, 0.9)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.06)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {/* 3-Stage Layered Images with Smooth Transition */}
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    maxWidth: { xs: 380, sm: 480, md: 540 },
                    height: { xs: 290, sm: 360, md: 410 },
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  {HERO_SHOWCASE_STAGES.map((stage, idx) => {
                    const active = heroImageStep === idx;
                    const offset = (idx - heroImageStep) * 100;
                    return (
                      <Box
                        key={stage.id}
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          opacity: active ? 1 : 0,
                          transform: `translateY(${offset}%) scale(${active ? 1 : 0.92})`,
                          pointerEvents: active ? "auto" : "none",
                          transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                          zIndex: active ? 10 : 1,
                        }}
                      >
                        <Box
                          component="img"
                          src={stage.image}
                          alt={stage.title}
                          sx={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.12))",
                            animation: active ? `${floatSlow} 7s ease-in-out infinite` : "none",
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>

                {/* 3 Step Interactive Device Switcher */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    mt: { xs: 2, md: 2.5 },
                    p: 0.75,
                    borderRadius: "999px",
                    bgcolor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    zIndex: 40,
                  }}
                >
                  {HERO_SHOWCASE_STAGES.map((stage, idx) => {
                    const active = heroImageStep === idx;
                    return (
                      <Button
                        key={stage.id}
                        onClick={() => handleHeroStepClick(idx)}
                        size="small"
                        sx={{
                          borderRadius: "999px",
                          px: { xs: 1.5, sm: 2 },
                          py: 0.6,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: DS.fontHeading,
                          textTransform: "none",
                          bgcolor: active ? DS.orange : "transparent",
                          color: active ? "#FFFFFF" : "#64748B",
                          boxShadow: active ? "0 4px 12px rgba(255,107,53,0.3)" : "none",
                          transition: "all 0.25s ease",
                          "&:hover": {
                            bgcolor: active ? DS.orangeHover : "rgba(0,0,0,0.04)",
                          },
                        }}
                      >
                        {idx + 1}. {stage.tag}
                      </Button>
                    );
                  })}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>



      {/* ─── Interactive Industry Showcase (In-Card Wheel Scrollable) ─────────── */}
      <Box
        id="industries"
        ref={industryReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          position: "relative",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: industryReveal.isVisible ? 1 : 0,
          transform: industryReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="xl">
          {/* Section Header */}
          <Box textAlign="center" mb={{ xs: 5, md: 6 }}>
            <Chip
              label="Tailored For Every Industry"
              sx={{
                bgcolor: "rgba(255, 107, 53, 0.08)",
                color: DS.purple,
                fontWeight: 700,
                fontSize: "0.8125rem",
                mb: 2,
                fontFamily: DS.fontHeading,
              }}
            />
            <Typography
              sx={{
                fontFamily: DS.fontHeading,
                fontWeight: 800,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.2rem" },
                color: DS.dark,
                letterSpacing: "-0.03em",
                mb: 2,
              }}
            >
              Built Specifically for Your Type of Store
            </Typography>
            <Typography
              sx={{
                color: "#64748B",
                fontSize: { xs: "1rem", md: "1.125rem" },
                fontFamily: DS.fontBody,
                maxWidth: 680,
                mx: "auto",
                lineHeight: 1.7,
              }}
            >
              Switch between industries below to see how our custom features, workflows, and hardware integrations fit your exact business needs.
            </Typography>
          </Box>

          {/* Industry Tab Buttons */}
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.5, md: 2 }}
            justifyContent={{ xs: "flex-start", md: "center" }}
            sx={{
              overflowX: "auto",
              pb: 2,
              mb: 2,
              "&::-webkit-scrollbar": { height: 6 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#CBD5E1", borderRadius: 3 },
            }}
          >
            {INDUSTRIES_DATA.map((ind) => {
              const active = ind.id === selectedIndustry;
              const IconComp = ind.icon;
              return (
                <Button
                  key={ind.id}
                  onClick={() => handleIndustrySelect(ind.id)}
                  startIcon={<IconComp sx={{ fontSize: 20 }} />}
                  sx={{
                    px: { xs: 2.5, sm: 3 },
                    py: 1.4,
                    borderRadius: DS.radiusBtn,
                    fontFamily: DS.fontHeading,
                    fontWeight: 700,
                    fontSize: { xs: "0.875rem", sm: "0.95rem" },
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    bgcolor: active ? ind.accent : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#334155",
                    border: active ? `1px solid ${ind.accent}` : "1px solid #E2E8F0",
                    boxShadow: active ? `0 8px 24px ${ind.accent}40` : "0 2px 8px rgba(0,0,0,0.03)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      bgcolor: active ? ind.accent : "#F1F5F9",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {ind.name}
                </Button>
              );
            })}
          </Stack>

          <Typography
            sx={{
              mb: 4,
              fontSize: "0.75rem",
              color: "#94A3B8",
              fontFamily: DS.fontBody,
              textAlign: "center",
              display: { xs: "none", sm: "block" },
            }}
          >
            ↕ Scroll with mouse wheel on the card or click tabs above to switch industries
          </Typography>

          {/* Active Industry Showcase Card (With in-card scroll on mouse wheel) */}
          <Paper
            elevation={0}
            onWheel={handleIndustryWheel}
            sx={{
              borderRadius: "28px",
              bgcolor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 16px 40px rgba(0,0,0,0.04)",
              overflow: "hidden",
              p: { xs: 3.5, sm: 5, md: 6 },
              cursor: "ns-resize",
            }}
          >
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              {/* Left Column: Image with Vertical Reel Transition */}
              <Grid item xs={12} lg={6}>
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: "20px",
                    overflow: "hidden",
                    boxShadow: "0 16px 36px rgba(0,0,0,0.08)",
                    height: { xs: 280, sm: 380, md: 440 },
                  }}
                >
                  {INDUSTRIES_DATA.map((ind, iIdx) => {
                    const active = ind.id === selectedIndustry;
                    const currentIndex = INDUSTRIES_DATA.findIndex((i) => i.id === selectedIndustry);
                    const offset = (iIdx - currentIndex) * 100;
                    return (
                      <Box
                        key={ind.id}
                        sx={{
                          position: "absolute",
                          inset: 0,
                          opacity: active ? 1 : 0,
                          transform: `translateY(${offset}%)`,
                          transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                          pointerEvents: active ? "auto" : "none",
                        }}
                      >
                        <Box
                          component="img"
                          src={ind.image}
                          alt={ind.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 3,
                            background: "linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0) 100%)",
                            color: "#fff",
                          }}
                        >
                          <Chip
                            label={ind.badge}
                            size="small"
                            sx={{
                              bgcolor: ind.accent,
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              mb: 1,
                            }}
                          />
                          <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", fontFamily: DS.fontHeading }}>
                            {ind.name} POS Solution
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>

              {/* Right Column: Features */}
              <Grid item xs={12} lg={6}>
                <Fade in key={`text-${currentIndustryObj.id}`} timeout={500}>
                  <Box>
                    <Typography
                      sx={{
                        color: currentIndustryObj.accent,
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        fontFamily: DS.fontHeading,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        mb: 1,
                      }}
                    >
                      Industry Optimized Flow
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: DS.fontHeading,
                        fontWeight: 800,
                        fontSize: { xs: "1.6rem", sm: "2rem", md: "2.3rem" },
                        color: DS.dark,
                        lineHeight: 1.2,
                        mb: 2,
                      }}
                    >
                      {currentIndustryObj.headline}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#64748B",
                        fontSize: "1.05rem",
                        lineHeight: 1.7,
                        fontFamily: DS.fontBody,
                        mb: 3.5,
                      }}
                    >
                      {currentIndustryObj.description}
                    </Typography>

                    {/* Checkpoints */}
                    <Stack spacing={2} sx={{ mb: 4 }}>
                      {currentIndustryObj.features.map((feat, i) => (
                        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                          <CheckIcon
                            sx={{
                              color: currentIndustryObj.accent,
                              fontSize: 22,
                              mt: 0.2,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              color: "#334155",
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              fontFamily: DS.fontBody,
                            }}
                          >
                            {feat}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={scrollToDemo}
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: currentIndustryObj.accent,
                        color: "#fff",
                        borderRadius: DS.radiusBtn,
                        px: 3.5,
                        py: 1.4,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        fontFamily: DS.fontHeading,
                        textTransform: "none",
                        boxShadow: `0 8px 24px ${currentIndustryObj.accent}35`,
                        "&:hover": {
                          bgcolor: currentIndustryObj.accent,
                          filter: "brightness(0.92)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      See {currentIndustryObj.name} in Action
                    </Button>
                  </Box>
                </Fade>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ─── Highlights Showcase Cards ───────────────────────────────────────── */}
      <Box
        ref={highlightsReveal.domRef}
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: UNIFIED_BG,
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: highlightsReveal.isVisible ? 1 : 0,
          transform: highlightsReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} lg={4}>
              <Chip
                label="Unmatched Flexibility"
                sx={{
                  bgcolor: "rgba(255, 107, 53, 0.08)",
                  color: DS.orange,
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  mb: 2,
                  fontFamily: DS.fontHeading,
                }}
              />
              <Typography
                sx={{
                  fontFamily: DS.fontHeading,
                  fontWeight: 800,
                  fontSize: { xs: "2rem", md: "2.75rem" },
                  color: DS.dark,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  mb: 2,
                }}
              >
                Everything You Need, In One Unified Platform
              </Typography>
              <Typography
                sx={{
                  color: "#64748B",
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  mb: 4,
                  fontFamily: DS.fontBody,
                }}
              >
                No more juggling 5 disconnected apps. Unify your checkout registers, multi-warehouse stock, employee shifts, customer loyalty, and financial reports under one single login.
              </Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                sx={{
                  bgcolor: "rgba(255, 107, 53, 0.08)",
                  color: DS.purple,
                  borderRadius: DS.radiusBtn,
                  px: 3.5,
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  fontFamily: DS.fontHeading,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "rgba(255, 107, 53, 0.16)",
                    transform: "translateX(4px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Explore All 6 Modules
              </Button>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                {QUICK_HIGHLIGHTS.map((item) => (
                  <Grid item xs={12} sm={6} key={item.title}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 3, md: 3.5 },
                        borderRadius: "24px",
                        position: "relative",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        minHeight: { xs: 260, sm: 280 },
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          backgroundImage: `url(${item.bgImage})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          opacity: 1,
                          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                          transform: "scale(1)",
                          zIndex: 0,
                        },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.20) 0%, rgba(15, 23, 42, 0.65) 45%, rgba(15, 23, 42, 0.94) 100%)",
                          zIndex: 1,
                        },
                        "&:hover": {
                          boxShadow: "0 24px 50px rgba(0,0,0,0.25)",
                          transform: "translateY(-6px)",
                          borderColor: DS.orange,
                          "&::before": {
                            transform: "scale(1.08)",
                          },
                        },
                      }}
                    >
                      {/* Top Bar inside Card */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ position: "relative", zIndex: 2 }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "14px",
                            bgcolor: "rgba(15, 23, 42, 0.68)",
                            backdropFilter: "blur(14px)",
                            border: "1px solid rgba(255, 255, 255, 0.22)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <item.icon sx={{ fontSize: 24, color: item.accent }} />
                        </Box>
                        <Chip
                          label={item.badge}
                          size="small"
                          sx={{
                            bgcolor: "rgba(15, 23, 42, 0.68)",
                            color: "#FFFFFF",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            fontFamily: DS.fontHeading,
                            backdropFilter: "blur(14px)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                            border: `1px solid ${item.accent}70`,
                          }}
                        />
                      </Stack>

                      {/* Bottom Content inside Card */}
                      <Box sx={{ position: "relative", zIndex: 2, mt: 4 }}>
                        <Typography
                          sx={{
                            fontFamily: DS.fontHeading,
                            fontWeight: 800,
                            fontSize: "1.3rem",
                            color: "#FFFFFF",
                            mb: 1,
                            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{
                            color: "#E2E8F0",
                            fontSize: "0.92rem",
                            lineHeight: 1.6,
                            fontFamily: DS.fontBody,
                            textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                          }}
                        >
                          {item.desc}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Ecosystem Interactive Diagram Section (Matched Design) ───────── */}
      <Box
        id="ecosystem"
        ref={ecosystemReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          position: "relative",
          overflow: "hidden",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: ecosystemReveal.isVisible ? 1 : 0,
          transform: ecosystemReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="lg">
          {/* Header Section */}
          <Box textAlign="center" mb={{ xs: 5, md: 7 }}>
            <Chip
              icon={<CloudOutlinedIcon sx={{ fontSize: "1.1rem !important", color: "#FF6B35" }} />}
              label="Connected Business Ecosystem"
              sx={{
                bgcolor: "rgba(255, 107, 53, 0.08)",
                color: "#FF6B35",
                fontWeight: 700,
                fontSize: "0.85rem",
                mb: 2.5,
                px: 1.2,
                py: 0.6,
                borderRadius: "999px",
                fontFamily: DS.fontHeading,
                border: "1px solid rgba(255, 107, 53, 0.16)",
              }}
            />
            <Typography
              sx={{
                fontFamily: DS.fontHeading,
                fontWeight: 900,
                fontSize: { xs: "2.2rem", sm: "3rem", md: "3.6rem" },
                color: DS.dark,
                letterSpacing: "-0.035em",
                lineHeight: 1.15,
                mb: 2,
              }}
            >
              One Central Cloud.<br />
              Every Connection{" "}
              <Box component="span" sx={{ color: "#FF6B35" }}>
                Synced.
              </Box>
            </Typography>
            <Typography
              sx={{
                color: "#64748B",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                fontFamily: DS.fontBody,
                maxWidth: 680,
                mx: "auto",
                mb: 2,
              }}
            >
              Changes made on any POS terminal, web dashboard, or mobile tablet reflect instantly everywhere. Zero discrepancies, zero manual reconciliations.
            </Typography>
          </Box>

          {/* Interactive Cloud Sync Visualizer Canvas */}
          <Box
            sx={{
              position: "relative",
              minHeight: { xs: 540, md: 590 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 2,
            }}
          >
            {/* Background Dotted Grid Accent Left & Right */}
            <Box
              sx={{
                position: "absolute",
                left: "-3%",
                top: "15%",
                width: "180px",
                height: "260px",
                backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 1.5px)",
                backgroundSize: "16px 16px",
                opacity: 0.6,
                pointerEvents: "none",
                display: { xs: "none", md: "block" },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                right: "-3%",
                top: "15%",
                width: "180px",
                height: "260px",
                backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 1.5px)",
                backgroundSize: "16px 16px",
                opacity: 0.6,
                pointerEvents: "none",
                display: { xs: "none", md: "block" },
              }}
            />

            {/* Background Dashed Orbit Ring */}
            <Box
              sx={{
                position: "absolute",
                width: { xs: 340, md: 540 },
                height: { xs: 340, md: 540 },
                borderRadius: "50%",
                border: "1.5px dashed rgba(255, 107, 53, 0.22)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />

            {/* SVG Streaming Synced Curved Beams */}
            <Box
              component="svg"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 2,
                display: { xs: "none", md: "block" },
              }}
            >
              {/* Top: Inventory */}
              <path
                d="M 500 240 Q 500 150 500 95"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.85"
                style={{ animation: `${streamFlow} 1s linear infinite` }}
              />
              <circle cx="500" cy="165" r="5" fill="#FF6B35" />

              {/* Left: High-Speed Billing */}
              <path
                d="M 400 300 Q 280 270 230 250"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.85"
                style={{ animation: `${streamFlow} 1.2s linear infinite` }}
              />
              <circle cx="310" cy="275" r="5" fill="#FF6B35" />

              {/* Bottom Left: CRM & Customers */}
              <path
                d="M 420 340 Q 320 400 240 450"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.85"
                style={{ animation: `${streamFlow} 1.4s linear infinite` }}
              />
              <circle cx="330" cy="395" r="5" fill="#FF6B35" />

              {/* Right: Staff & Payroll */}
              <path
                d="M 600 300 Q 720 270 770 250"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.85"
                style={{ animation: `${streamFlow} 1.2s linear infinite` }}
              />
              <circle cx="690" cy="275" r="5" fill="#FF6B35" />

              {/* Bottom Right: Analytics */}
              <path
                d="M 580 340 Q 680 400 760 450"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.85"
                style={{ animation: `${streamFlow} 1.4s linear infinite` }}
              />
              <circle cx="670" cy="395" r="5" fill="#FF6B35" />
            </Box>

            {/* Center Master Cloud Hub */}
            <Box
              sx={{
                position: "relative",
                zIndex: 4,
                px: { xs: 3, md: 4.5 },
                py: { xs: 3, md: 3.5 },
                borderRadius: "36px",
                bgcolor: "#FFFFFF",
                border: "2px solid rgba(255, 107, 53, 0.25)",
                boxShadow: "0 24px 60px rgba(255, 107, 53, 0.22), 0 0 40px rgba(255, 107, 53, 0.12)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: { xs: 220, md: 260 },
                animation: `${pulseGlow} 4s infinite ease-in-out`,
              }}
            >
              <Box
                component="img"
                src={LogoIcon}
                alt="Suthra One Cloud HQ"
                sx={{
                  height: { xs: 48, md: 58 },
                  width: "auto",
                  objectFit: "contain",
                  mb: 1.2,
                  filter: "drop-shadow(0 4px 14px rgba(255, 107, 53, 0.35))",
                }}
              />
              <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.3 }}>
                <Typography sx={{ fontFamily: DS.fontHeading, fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.2rem" }, color: DS.dark }}>
                  Suthra
                </Typography>
                <Typography sx={{ fontFamily: DS.fontHeading, fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.2rem" }, color: "#FF6B35" }}>
                  Cloud HQ
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: "0.72rem", color: "#64748B", fontFamily: DS.fontBody, mb: 1.4 }}>
                Central POS Sync Engine
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.6,
                  py: 0.45,
                  borderRadius: "999px",
                  bgcolor: "#FFF5EE",
                  border: "1px solid #A7F3D0",
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#FF6B35",
                    boxShadow: "0 0 8px #10B981",
                    animation: `${syncPulse} 1.5s infinite`,
                  }}
                />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#E85A28", fontFamily: DS.fontHeading }}>
                  0.01s Live Sync
                </Typography>
              </Box>
            </Box>

            {/* Orbiting Ecosystem Satellite Nodes */}
            {ECOSYSTEM_NODES.map((node) => {
              const NodeIcon = node.icon;
              return (
                <Box
                  key={node.id}
                  sx={{
                    position: "absolute",
                    ...node.pos,
                    zIndex: 3,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.8, md: 2.2 },
                      borderRadius: "20px",
                      bgcolor: "#FFFFFF",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                      minWidth: { xs: 150, sm: 180, md: 215 },
                      maxWidth: { xs: 170, sm: 200, md: 235 },
                      border: "1.5px solid rgba(226, 232, 240, 0.9)",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.6,
                      "&:hover": {
                        transform: "scale(1.06) translateY(-3px)",
                        borderColor: node.color,
                        boxShadow: `0 16px 36px ${node.color}25`,
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 42, md: 48 },
                        height: { xs: 42, md: 48 },
                        bgcolor: node.accentBg,
                        color: node.color,
                        borderRadius: "14px",
                        flexShrink: 0,
                        border: `1px solid ${node.color}25`,
                      }}
                    >
                      <NodeIcon sx={{ fontSize: { xs: 22, md: 26 } }} />
                    </Avatar>
                    <Box sx={{ textAlign: "left", minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: "0.85rem", md: "0.95rem" },
                          fontFamily: DS.fontHeading,
                          color: DS.dark,
                          lineHeight: 1.2,
                          mb: 0.3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontFamily: DS.fontBody,
                          mb: 0.8,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.desc}
                      </Typography>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1.2,
                          py: 0.3,
                          borderRadius: "999px",
                          bgcolor: node.badgeBg,
                          color: node.badgeColor,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          fontFamily: DS.fontHeading,
                          border: `1px solid ${node.color}30`,
                        }}
                      >
                        {node.badge}
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              );
            })}
          </Box>

          {/* Bottom 4-Item Feature Trust Bar */}
          <Paper
            elevation={0}
            sx={{
              mt: { xs: 6, md: 8 },
              p: { xs: 2.5, md: 3 },
              borderRadius: "24px",
              bgcolor: "#FFFFFF",
              border: "1.5px solid rgba(226, 232, 240, 0.9)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
            }}
          >
            <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="center">
              {ECOSYSTEM_TRUST_ITEMS.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={idx}>
                    <Stack direction="row" spacing={1.8} alignItems="center">
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: "rgba(255, 107, 53, 0.1)",
                          color: "#FF6B35",
                          borderRadius: "14px",
                          flexShrink: 0,
                        }}
                      >
                        <ItemIcon sx={{ fontSize: 22 }} />
                      </Avatar>
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: DS.fontHeading,
                            fontWeight: 800,
                            fontSize: "0.92rem",
                            color: DS.dark,
                            lineHeight: 1.2,
                            mb: 0.3,
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: DS.fontBody,
                            fontSize: "0.78rem",
                            color: "#64748B",
                          }}
                        >
                          {item.subtitle}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ─── Multi-Module Feature Tabs & Detailed Visualizer ──────────────────── */}
      <Box
        id="features"
        ref={featuresReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: featuresReveal.isVisible ? 1 : 0,
          transform: featuresReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="xl">
          {/* Section Heading */}
          <Box textAlign="center" mb={6}>
            <Chip
              label="End-to-End Enterprise Architecture"
              sx={{
                bgcolor: "rgba(255, 107, 53, 0.08)",
                color: DS.purple,
                fontWeight: 700,
                fontSize: "0.8125rem",
                mb: 2,
                fontFamily: DS.fontHeading,
              }}
            />
            <Typography
              sx={{
                fontFamily: DS.fontHeading,
                fontWeight: 800,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.2rem" },
                color: DS.dark,
                letterSpacing: "-0.03em",
                mb: 2,
              }}
            >
              6 Core Universal Power Modules
            </Typography>
            <Typography
              sx={{
                color: "#64748B",
                fontSize: "1.05rem",
                fontFamily: DS.fontBody,
                maxWidth: 640,
                mx: "auto",
              }}
            >
              Select any operational module below to preview live software dashboards, capabilities, and workflow highlights.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: "28px",
              border: "1px solid #E2E8F0",
              px: { xs: 2.5, sm: 4, md: 6 },
              py: { xs: 4, md: 6 },
              bgcolor: "#FFFFFF",
              boxShadow: "0 16px 40px rgba(0,0,0,0.04)",
            }}
          >
            {/* 6 Module Responsive Selector (All Visible - No Pagination Needed) */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(6, 1fr)",
                },
                gap: { xs: 1.5, sm: 2, md: 2.5 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: 4,
                bgcolor: "#FAFAFC",
                border: "1px solid #E2E8F0",
                mb: 6,
              }}
            >
              {featureData.map((item, index) => {
                const active = index === activeFeature;
                return (
                  <Box
                    key={item.title}
                    onClick={() => setActiveFeature(index)}
                    sx={{
                      cursor: "pointer",
                      textAlign: "center",
                      borderRadius: 3,
                      height: "100%",
                      minHeight: { xs: 100, sm: 115, md: 125 },
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      px: { xs: 1, sm: 1.5 },
                      py: { xs: 1.5, sm: 2 },
                      bgcolor: active ? DS.orange : "#FFFFFF",
                      transition: "all 0.25s ease",
                      boxShadow: active
                        ? "0 12px 28px rgba(255,107,53,0.35)"
                        : "0 2px 8px rgba(0,0,0,0.03)",
                      border: active ? "none" : "1px solid #E2E8F0",
                      "&:hover": {
                        transform: "translateY(-3px)",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={active ? item.icon.active : item.icon.inactive}
                      alt={item.title}
                      sx={{
                        width: { xs: 30, sm: 34, md: 38 },
                        height: { xs: 30, sm: 34, md: 38 },
                        mb: 1.2,
                        opacity: active ? 1 : 0.75,
                      }}
                    />
                    <Typography
                      fontWeight={700}
                      fontSize={{ xs: 11, sm: 12.5 }}
                      fontFamily={DS.fontHeading}
                      sx={{
                        lineHeight: 1.3,
                        color: active ? "#fff" : "#1E293B",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Content Area - Live Screenshot & Points */}
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <Fade in key={activeFeature} timeout={400}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "20px",
                      bgcolor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 16px 36px rgba(0,0,0,0.06)",
                    }}
                  >
                    <Box
                      component="img"
                      src={featureData[activeFeature].images[0]}
                      alt={featureData[activeFeature].title}
                      sx={{
                        width: "100%",
                        maxHeight: { xs: 260, sm: 360, md: 420 },
                        objectFit: "contain",
                        borderRadius: "14px",
                        display: "block",
                      }}
                    />
                  </Box>
                </Fade>
              </Grid>

              <Grid item xs={12} md={6}>
                <Fade in key={`details-${activeFeature}`} timeout={400}>
                  <Box>
                    <Chip
                      label={featureData[activeFeature].badge}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,107,53,0.1)",
                        color: DS.orange,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        fontFamily: DS.fontHeading,
                        mb: 1.5,
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: DS.fontHeading,
                        fontWeight: 800,
                        fontSize: { xs: "1.75rem", sm: "2.2rem" },
                        color: DS.dark,
                        mb: 1,
                      }}
                    >
                      {featureData[activeFeature].title}
                    </Typography>

                    {featureData[activeFeature].subheading && (
                      <Typography
                        sx={{
                          color: "#64748B",
                          fontSize: "1.05rem",
                          lineHeight: 1.6,
                          mb: 3.5,
                          fontFamily: DS.fontBody,
                        }}
                      >
                        {featureData[activeFeature].subheading}
                      </Typography>
                    )}

                    <Stack spacing={2}>
                      {featureData[activeFeature].points.map((point, i) => (
                        <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                          <CheckIcon sx={{ color: DS.orange, mt: "3px", fontSize: 20, flexShrink: 0 }} />
                          <Typography sx={{ color: "#334155", fontSize: "0.95rem", lineHeight: 1.6 }}>
                            {point}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Fade>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ─── Social Proof & Multi-Industry Testimonials (Unified Light Theme) ── */}
      <Box
        ref={testimonialsReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: testimonialsReveal.isVisible ? 1 : 0,
          transform: testimonialsReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} alignItems="stretch">
            {/* Testimonial Box */}
            <Grid item xs={12} lg={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 5 },
                  borderRadius: "28px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                }}
              >
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Chip
                      label={TESTIMONIALS_DATA[testimonialIdx].industry}
                      sx={{
                        bgcolor: "rgba(255, 107, 53, 0.08)",
                        color: DS.purple,
                        fontWeight: 700,
                        fontFamily: DS.fontHeading,
                      }}
                    />
                    <Stack direction="row" spacing={0.5}>
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} sx={{ fontSize: 20, color: "#FBBF24" }} />
                      ))}
                    </Stack>
                  </Stack>
                  <FormatQuoteIcon sx={{ fontSize: 44, color: DS.purple, opacity: 0.25, mb: 1, transform: "scaleX(-1)" }} />
                  <Typography
                    sx={{
                      fontFamily: DS.fontBody,
                      fontSize: { xs: "1.05rem", md: "1.2rem" },
                      color: "#1E293B",
                      lineHeight: 1.8,
                      mb: 4,
                      fontStyle: "italic",
                    }}
                  >
                    "{TESTIMONIALS_DATA[testimonialIdx].quote}"
                  </Typography>
                </Box>

                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={TESTIMONIALS_DATA[testimonialIdx].avatar}
                    sx={{ width: 56, height: 56, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", fontFamily: DS.fontHeading, color: DS.dark }}>
                      {TESTIMONIALS_DATA[testimonialIdx].author}
                    </Typography>
                    <Typography sx={{ color: "#64748B", fontSize: "0.875rem", fontFamily: DS.fontBody }}>
                      {TESTIMONIALS_DATA[testimonialIdx].role} • {TESTIMONIALS_DATA[testimonialIdx].company}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Live Platform Stats Grid on Clean Light/Indigo Canvas */}
            <Grid item xs={12} lg={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 6 },
                  borderRadius: "28px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                }}
              >
                <Grid container spacing={4}>
                  {STATS_DATA.map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                      <Grid item xs={6} key={stat.label}>
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Avatar
                            sx={{
                              width: 52,
                              height: 52,
                              bgcolor: `${stat.color}15`,
                              color: stat.color,
                              mx: "auto",
                              mb: 2,
                            }}
                          >
                            <StatIcon sx={{ fontSize: 26 }} />
                          </Avatar>
                          <Typography
                            sx={{
                              fontFamily: DS.fontHeading,
                              fontWeight: 900,
                              fontSize: { xs: "2rem", sm: "2.5rem" },
                              color: DS.dark,
                              lineHeight: 1.1,
                              mb: 0.5,
                            }}
                          >
                            {stat.value}
                          </Typography>
                          <Typography
                            sx={{
                              color: "#64748B",
                              fontSize: "0.9rem",
                              fontFamily: DS.fontBody,
                              fontWeight: 600,
                            }}
                          >
                            {stat.label}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Free Trial Call to Action Strip ─────────────────────────────────── */}
      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, md: 4 }, bgcolor: UNIFIED_BG }}>
        <Container maxWidth="xl">
          <Paper
            elevation={0}
            sx={{
              borderRadius: "32px",
              background: "linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #FF6B35 100%)",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 20px 50px rgba(255, 107, 53, 0.25)",
            }}
          >
            <Grid container alignItems="center">
              <Grid item xs={12} md={7} sx={{ p: { xs: 4, sm: 6, md: 8 }, position: "relative", zIndex: 1 }}>
                <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem", fontWeight: 700, fontFamily: DS.fontHeading, textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5 }}>
                  Accelerate Your Business Today
                </Typography>
                <Typography
                  sx={{
                    fontFamily: DS.fontHeading,
                    fontWeight: 900,
                    fontSize: { xs: "1.8rem", sm: "2.6rem", md: "3.1rem" },
                    color: "#fff",
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    mb: 3,
                  }}
                >
                  Start Your 3-Day Free Trial.
                  <br />
                  No Credit Card Required.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4 }}>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={scrollToDemo}
                    sx={{
                      bgcolor: DS.orange,
                      color: "#fff",
                      borderRadius: DS.radiusBtn,
                      px: 4,
                      py: 1.6,
                      fontWeight: 700,
                      fontSize: "1rem",
                      fontFamily: DS.fontHeading,
                      textTransform: "none",
                      boxShadow: "0 8px 24px rgba(255,107,53,0.45)",
                      "&:hover": {
                        bgcolor: DS.orangeHover,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    Start Free Trial Now
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.4)",
                      borderRadius: DS.radiusBtn,
                      px: 3.5,
                      py: 1.6,
                      fontWeight: 700,
                      fontSize: "1rem",
                      fontFamily: DS.fontHeading,
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "#fff",
                        bgcolor: "rgba(255,255,255,0.12)",
                      },
                    }}
                  >
                    Explore System Features
                  </Button>
                </Stack>
                <Stack direction="row" flexWrap="wrap" spacing={{ xs: 2, md: 3 }}>
                  {CTA_TRUST_ITEMS.map((item) => (
                    <Stack key={item} direction="row" spacing={0.75} alignItems="center">
                      <CheckIcon sx={{ fontSize: 18, color: "#FF6B35" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", fontWeight: 600, fontFamily: DS.fontBody }}>
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
              <Grid
                item
                xs={12}
                md={5}
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  justifyContent: "center",
                  p: { md: 3 },
                  position: "relative",
                }}
              >
                <Box
                  component="img"
                  src={MODULE_IMAGES.counterCheckout}
                  alt="Suthra One POS Suite"
                  sx={{
                    width: "100%",
                    maxWidth: 480,
                    height: "auto",
                    maxHeight: 330,
                    objectFit: "contain",
                    filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.55))",
                    transition: "transform 0.4s ease",
                    "&:hover": {
                      transform: "scale(1.04) translateY(-4px)",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ─── Pricing Plans Section (Unified Light Theme) ─────────────────────── */}
      <Box
        id="pricing"
        ref={pricingReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: pricingReveal.isVisible ? 1 : 0,
          transform: pricingReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Chip
              label="Transparent Value"
              sx={{
                bgcolor: "rgba(255, 107, 53, 0.08)",
                color: DS.purple,
                fontWeight: 700,
                fontSize: "0.8125rem",
                mb: 2,
                fontFamily: DS.fontHeading,
              }}
            />
            <Typography
              sx={{
                fontFamily: DS.fontHeading,
                fontWeight: 800,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.2rem" },
                color: DS.dark,
                letterSpacing: "-0.03em",
                mb: 2,
              }}
            >
              Simple, Predictable Pricing Plans
            </Typography>
            <Typography sx={{ color: "#64748B", fontSize: "1.05rem", fontFamily: DS.fontBody, maxWidth: 540, mx: "auto" }}>
              Choose the perfect plan for your business size. Scale up or change tiers anytime with zero lock-in contracts.
            </Typography>
          </Box>

          {plansLoading ? (
            <CardGridSkeleton count={3} cardHeight={420} />
          ) : plans.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="body1" color="text.secondary">
                No active public plans at the moment. Please contact us for custom enterprise pricing.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4} justifyContent="center" alignItems="stretch">
              {plans.map((plan: any, i: number) => {
                const { basePlan, extra } = splitPlanFeatures(plan, plans);
                const limitItems = [
                  plan.maxUsers ? `Max Users: ${plan.maxUsers}` : null,
                  plan.maxTables ? `Max Tables/Registers: ${plan.maxTables}` : null,
                  plan.maxOrders ? `Orders/month: ${plan.maxOrders}` : null,
                  plan.maxSms !== undefined && plan.maxSms !== null
                    ? plan.maxSms === 0 || plan.maxSms === -1
                      ? `SMS/month: Unlimited`
                      : `SMS/month: ${plan.maxSms}`
                    : null,
                  (plan.maxEmail ?? plan.maxEmails) !== undefined &&
                  (plan.maxEmail ?? plan.maxEmails) !== null
                    ? (plan.maxEmail ?? plan.maxEmails) === 0 || (plan.maxEmail ?? plan.maxEmails) === -1
                      ? `Emails/month: Unlimited`
                      : `Emails/month: ${plan.maxEmail ?? plan.maxEmails}`
                    : null,
                ].filter(Boolean) as string[];

                const featureItems = extra.map(planFeatureLabel);
                const isPopular = i === Math.floor(plans.length / 2);

                return (
                  <Grid item xs={12} md={4} key={plan._id || i}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        height: "100%",
                        borderRadius: "24px",
                        bgcolor: isPopular ? "#FFFFFF" : "#FFFFFF",
                        color: DS.textPrimary,
                        border: isPopular ? `2px solid ${DS.purple}` : "1px solid #E2E8F0",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: isPopular ? "0 18px 42px rgba(255, 107, 53, 0.15)" : "0 4px 16px rgba(0,0,0,0.03)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-6px)",
                        },
                      }}
                    >
                      {isPopular && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            bgcolor: DS.purple,
                            color: "#fff",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: DS.radiusBtn,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            fontFamily: DS.fontHeading,
                          }}
                        >
                          Most Popular
                        </Box>
                      )}

                      <Typography
                        variant="h6"
                        fontWeight={800}
                        fontFamily={DS.fontHeading}
                        gutterBottom
                        sx={{ color: isPopular ? DS.purpleDark : "inherit" }}
                      >
                        {plan.name}
                      </Typography>

                      <Typography
                        variant="h3"
                        fontWeight={900}
                        fontFamily={DS.fontHeading}
                        mb={1}
                        sx={{ color: DS.dark }}
                      >
                        ${Number(plan.price || 0).toFixed(2)}
                        <Box component="span" sx={{ fontSize: "1.1rem", fontWeight: 500, color: "#64748B" }}>
                          /{plan.interval === "yearly" ? "yr" : "mo"}
                        </Box>
                      </Typography>

                      <Typography
                        variant="body2"
                        mb={3}
                        sx={{ color: "#64748B", minHeight: 40 }}
                      >
                        {plan.description || `Everything you need to power your business with the ${plan.name} plan.`}
                      </Typography>

                      {limitItems.length > 0 && (
                        <Box mb={2.5}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            fontFamily={DS.fontHeading}
                            mb={0.5}
                            sx={{ color: DS.dark }}
                          >
                            Plan Limits:
                          </Typography>
                          {limitItems.map((item: string, j: number) => (
                            <Typography
                              key={j}
                              variant="body2"
                              sx={{ color: "#475569", lineHeight: 1.7 }}
                            >
                              • {item}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      <Typography
                        variant="body2"
                        fontWeight={700}
                        fontFamily={DS.fontHeading}
                        mb={1}
                        sx={{ color: DS.dark }}
                      >
                        {basePlan ? `Everything in ${basePlan.name}, plus:` : "Included Features:"}
                      </Typography>

                      <Stack spacing={0.75} mb={4} sx={{ flexGrow: 1 }}>
                        {featureItems.map((item: string, j: number) => (
                          <Stack key={j} direction="row" spacing={1} alignItems="center">
                            <CheckIcon sx={{ fontSize: 16, color: isPopular ? DS.purple : DS.orange }} />
                            <Typography
                              variant="body2"
                              sx={{ color: "#334155" }}
                            >
                              {item}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          mt: "auto",
                          py: 1.5,
                          bgcolor: isPopular ? DS.purple : "#FFFFFF",
                          color: isPopular ? "#fff" : "#0F172A",
                          border: isPopular ? "none" : "1px solid #CBD5E1",
                          borderRadius: DS.radiusBtn,
                          fontWeight: 700,
                          fontFamily: DS.fontHeading,
                          textTransform: "none",
                          fontSize: "0.95rem",
                          boxShadow: isPopular ? "0 8px 20px rgba(255, 107, 53, 0.3)" : "none",
                          "&:hover": {
                            bgcolor: isPopular ? DS.purpleDark : "#F1F5F9",
                          },
                        }}
                        onClick={() => {
                          navigate(`/register?planId=${plan._id}`);
                        }}
                      >
                        Choose {plan.name}
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>

      {/* ─── Demo Request Section (Unified Light Theme) ───────────────────────── */}
      <Box
        id="demo-form"
        ref={demoReveal.domRef}
        sx={{
          py: { xs: 9, md: 14 },
          bgcolor: UNIFIED_BG,
          transition: "opacity 0.8s ease, transform 0.8s ease",
          opacity: demoReveal.isVisible ? 1 : 0,
          transform: demoReveal.isVisible ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
            {/* Left Graphic Side */}
            <Grid item xs={12} md={6}>
              <Box sx={{ position: "relative" }}>
                <Box
                  component="img"
                  src={fqaimage}
                  alt="POS ERP Demo Scheduling"
                  sx={{
                    width: "100%",
                    height: "auto",
                    borderRadius: "24px",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
                  }}
                />
                <Paper
                  elevation={0}
                  sx={{
                    position: "absolute",
                    bottom: -20,
                    right: 20,
                    p: 2.5,
                    borderRadius: "20px",
                    bgcolor: "#FFFFFF",
                    color: DS.dark,
                    boxShadow: "0 16px 36px rgba(0,0,0,0.1)",
                    border: "1px solid #E2E8F0",
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Avatar sx={{ bgcolor: "rgba(255,107,53,0.12)", color: DS.orange }}>
                    <VideoCallIcon />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", fontFamily: DS.fontHeading }}>
                      1-on-1 Expert Demo
                    </Typography>
                    <Typography sx={{ color: "#64748B", fontSize: "0.75rem" }}>
                      Instant Google Meet Link
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Grid>

            {/* Right Form Side */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 6 },
                  borderRadius: "28px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.04)",
                  "& .MuiFormLabel-asterisk": { color: "#d32f2f" },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: DS.fontHeading,
                    fontWeight: 800,
                    fontSize: { xs: "1.6rem", md: "2.1rem" },
                    color: DS.dark,
                    mb: 1,
                  }}
                >
                  Experience the ERP –{" "}
                  <Box component="span" sx={{ color: DS.orange }}>Try Free</Box>
                </Typography>

                <Typography sx={{ color: "#64748B", fontSize: "0.95rem", fontFamily: DS.fontBody, mb: 4 }}>
                  Fill out the form below and select your preferred slot for an instant, customized walkthrough.
                </Typography>

                <Grid
                  container
                  spacing={2.5}
                  component="form"
                  onSubmit={handleDemoSubmit}
                >
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      name="businessName"
                      label="Business Name"
                      placeholder="e.g. Acme Retail or Urban Cafe"
                      value={formData.businessName}
                      onChange={handleFormChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      type="email"
                      name="email"
                      label="Email Address"
                      placeholder="name@business.com"
                      value={formData.email}
                      onChange={handleFormChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <PhoneInput
                      fullWidth
                      required
                      name="phoneNumber"
                      label="Phone Number"
                      placeholder="9876543210"
                      value={formData.phoneNumber}
                      onChange={(val) => {
                        const onlyNums = val.replace(/[^0-9]/g, "");
                        if (onlyNums.length <= 10) {
                          setFormData((prev) => ({ ...prev, phoneNumber: onlyNums }));
                          if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                        }
                      }}
                      dialCode={formData.phonePrefix}
                      onDialCodeChange={(code) => setFormData((prev) => ({ ...prev, phonePrefix: code }))}
                      error={!!errors.phoneNumber}
                      helperText={errors.phoneNumber}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="date"
                      name="preferredDate"
                      label="Preferred Date"
                      value={formData.preferredDate}
                      onChange={handleFormChange}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: new Date().toISOString().split("T")[0] }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      select
                      name="preferredTime"
                      label={fetchingSlots ? "Loading slots..." : `Preferred Time (${getEasternTzAbbreviation()})`}
                      value={formData.preferredTime}
                      onChange={handleFormChange}
                      disabled={!formData.preferredDate || fetchingSlots}
                    >
                      {availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <MenuItem key={slot} value={slot}>
                            {formatSlotLabel(slot, getEasternTzAbbreviation())}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          {formData.preferredDate ? "No slots available" : "Select date first"}
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Checkbox defaultChecked size="small" />}
                      label={
                        <Typography variant="caption" color="text.secondary">
                          I agree to the{" "}
                          <Box
                            component={Link}
                            to="/terms-and-conditions"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "inherit", textDecoration: "underline" }}
                          >
                            Terms & Conditions
                          </Box>{" "}
                          and{" "}
                          <Box
                            component={Link}
                            to="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "inherit", textDecoration: "underline" }}
                          >
                            Privacy Policy
                          </Box>
                        </Typography>
                      }
                    />
                  </Grid>

                  <Grid item xs={12} mt={1}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        py: 1.8,
                        borderRadius: DS.radiusBtn,
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        fontFamily: DS.fontHeading,
                        textTransform: "none",
                        bgcolor: DS.orange,
                        boxShadow: "0 8px 24px rgba(255,107,53,0.3)",
                        "&:hover": {
                          bgcolor: DS.orangeHover,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      {loading ? "Scheduling Demo..." : "Request Personalized Demo"}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ─── Footer Section (Unified Light Theme) ─────────────────────────────── */}
      <Box sx={{ bgcolor: UNIFIED_BG, color: DS.textPrimary, pt: 8, pb: 4, borderTop: "1px solid #E2E8F0" }}>
        <Container maxWidth="lg">
          <Grid container spacing={5} justifyContent="space-between">
            {/* Brand Info */}
            <Grid item xs={12} md={4}>
              <Box sx={{ pr: { md: 4 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Box
                    component="img"
                    src={LogoIcon}
                    alt="Suthra One"
                    sx={{ height: 42, width: "auto", objectFit: "contain" }}
                  />
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="h5" fontWeight="900" fontFamily={DS.fontHeading} color={DS.dark}>
                      Suthra
                    </Typography>
                    <Typography variant="h5" fontWeight="900" fontFamily={DS.fontHeading} color={DS.orange}>
                      One
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.8, mb: 3 }}>
                  Universal Point of Sale and ERP Cloud platform empowering retail stores, supermarkets, restaurants, salons, and enterprises to scale with speed and intelligence.
                </Typography>
              </Box>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle1" fontWeight="800" fontFamily={DS.fontHeading} sx={{ mb: 2.5, color: DS.dark }}>
                Platform Navigation
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { label: "Industry Solutions", target: "industries" },
                  { label: "Feature Capabilities", target: "features" },
                  { label: "Cloud Ecosystem", target: "ecosystem" },
                  { label: "Pricing Tiers", target: "pricing" },
                  { label: "Request a Demo", target: "demo-form" },
                ].map((link) => (
                  <Typography
                    key={link.label}
                    variant="body2"
                    sx={{
                      color: "#64748B",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": { color: DS.purple, transform: "translateX(4px)" },
                    }}
                    onClick={() => document.getElementById(link.target)?.scrollIntoView({ behavior: "smooth" })}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            {/* Contact Details */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1" fontWeight="800" fontFamily={DS.fontHeading} sx={{ mb: 2.5, color: DS.dark }}>
                Contact & Support
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <MapIcon sx={{ color: DS.orange, fontSize: 20, mt: 0.3 }} />
                  <Typography
                    variant="body2"
                    sx={{ color: "#64748B" }}
                  >
                    123 Innovation Boulevard, Suite 500,<br />
                    Tech District, CA 94016
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SmartphoneIcon sx={{ color: DS.orange, fontSize: 20 }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href="tel:+18005550199"
                    sx={{ color: "#64748B", textDecoration: "none", fontWeight: 600, "&:hover": { color: DS.dark } }}
                  >
                    +1 (800) 555-0199
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <EmailIcon sx={{ color: DS.orange, fontSize: 20 }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href="mailto:support@example.com"
                    sx={{ color: "#64748B", textDecoration: "none", fontWeight: 600, "&:hover": { color: DS.dark } }}
                  >
                    support@example.com
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>

          {/* Bottom Bar */}
          <Box
            sx={{
              mt: 6,
              pt: 4,
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              © {new Date().getFullYear()} Suthra One. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography
                variant="caption"
                component={Link}
                to="/privacy-policy"
                sx={{ color: "#64748B", textDecoration: "none", "&:hover": { color: DS.dark } }}
              >
                Privacy Policy
              </Typography>
              <Typography variant="caption" sx={{ color: "#CBD5E1" }}>|</Typography>
              <Typography
                variant="caption"
                component={Link}
                to="/terms-and-conditions"
                sx={{ color: "#64748B", textDecoration: "none", "&:hover": { color: DS.dark } }}
              >
                Terms & Conditions
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              Engineered by{" "}
              <Box
                component="a"
                href="https://suthraone.com/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: DS.purple, fontWeight: 700, textDecoration: "none" }}
              >
                Suthra One
              </Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ─── Video Demo Dialog Modal ────────────────────────────────────────── */}
      <Dialog
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: "black", borderRadius: 4, overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0, bgcolor: "black", position: "relative" }}>
          <IconButton
            onClick={() => setVideoOpen(false)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "white",
              bgcolor: "rgba(0,0,0,0.6)",
              zIndex: 10,
              "&:hover": { bgcolor: "rgba(255,0,0,0.7)" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <video
              autoPlay
              controls
              style={{ width: "100%", maxHeight: "80vh", outline: "none" }}
            >
              <source
                src={demoVideo}
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── Custom Success/Error Dialog for Demo Booking ────────────────────── */}
      <Dialog
        open={dialogState.open}
        onClose={() => setDialogState((prev) => ({ ...prev, open: false }))}
        PaperProps={{
          sx: {
            borderRadius: 5,
            p: 2,
            minWidth: { xs: 300, md: 420 },
            textAlign: "center",
          },
        }}
      >
        <DialogContent>
          <Zoom in={true} style={{ transitionDelay: "100ms" }}>
            <Box sx={{ mb: 2 }}>
              {dialogState.type === "success" ? (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "success.light",
                    color: "success.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                  }}
                >
                  <CheckIcon sx={{ fontSize: 50 }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "error.light",
                    color: "error.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                  }}
                >
                  <ErrorIcon sx={{ fontSize: 50 }} />
                </Box>
              )}
            </Box>
          </Zoom>
          <Typography variant="h5" fontWeight="900" fontFamily={DS.fontHeading} gutterBottom>
            {dialogState.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: dialogState.meetingLink ? 2 : 4 }}>
            {dialogState.message}
          </Typography>

          {dialogState.meetingLink && (
            <Box
              sx={{
                mt: 2,
                mb: 4,
                p: 2.5,
                borderRadius: 4,
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                color="success"
                href={dialogState.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<VideoCallIcon />}
                fullWidth
                sx={{
                  borderRadius: 50,
                  fontWeight: "bold",
                  py: 1.5,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
                }}
              >
                Join Google Meet
              </Button>

              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  bgcolor: "white",
                  borderRadius: 3,
                  border: "1px solid #e0e0e0",
                  p: 1,
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flexGrow: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                    color: "text.secondary",
                    px: 1,
                  }}
                >
                  {dialogState.meetingLink}
                </Typography>
                <Tooltip title={copied ? "Copied!" : "Copy Link"} placement="top">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(dialogState.meetingLink || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    sx={{ color: "primary.main" }}
                  >
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          <Button
            variant="contained"
            color={dialogState.type === "success" ? "success" : "error"}
            fullWidth
            onClick={() => setDialogState((prev) => ({ ...prev, open: false }))}
            sx={{ borderRadius: 50, fontWeight: "bold", py: 1.5, fontFamily: DS.fontHeading }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HomePage;
