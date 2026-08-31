import {
  Business as BusinessIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Error as ErrorIcon,
  Inventory as InventoryIcon,
  Kitchen as KitchenIcon,
  Map as MapIcon,
  People as PeopleIcon,
  PlayCircleOutline as PlayIcon,
  PointOfSale as PointOfSaleIcon,
  QrCode as QrIcon,
  Smartphone as SmartphoneIcon,
  EventSeat as TableIcon,
  VideoCall as VideoCallIcon,
  DeleteSweep as WastageIcon
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  Drawer,
  Fade,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  useTheme,
  Zoom
} from "@mui/material";
import { keyframes } from "@mui/system";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Checkbox,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import PhoneInput from "../../components/PhoneInput";
import { easternWallClockToUtcIso, formatSlotLabel, getEasternTzAbbreviation } from "../../utils/demoSlots";

// Orders
import OrdersIconActiveImg from "/src/assets/images/icons/orders-active.png";
import OrdersIconImg from "/src/assets/images/icons/orders.png";

// POS
import PosIconActiveImg from "/src/assets/images/icons/POS-active-icon.png";
import PosIconImg from "/src/assets/images/icons/POS-icon.png";

// Table
import TableIconActiveImg from "/src/assets/images/icons/table-active.png";
import TableIconImg from "/src/assets/images/icons/table.png";

// Booking
import BookingIconActiveImg from "/src/assets/images/icons/booking-active.png";
import BookingIconImg from "/src/assets/images/icons/booking.png";

// Catering
import CateringIconActiveImg from "/src/assets/images/icons/catering-active.png";
import CateringIconImg from "/src/assets/images/icons/catering.png";

// Kitchen Orders
import KitchenOrdersIconActiveImg from "/src/assets/images/icons/kitchen-orders-active.png";
import KitchenOrdersIconImg from "/src/assets/images/icons/kitchen-orders.png";

// KDSFV
// import KdsIconImg from '/src/assets/images/icons/kds.png';
// import KdsIconActiveImg from '/src/assets/images/icons/kds-active.png';

// Menu
import MenuIconActiveImg from "/src/assets/images/icons/menu-active.png";
import MenuIconImg from "/src/assets/images/icons/menu.png";

// Inventory
import InventoryIconActiveImg from "/src/assets/images/icons/inventory-active.png";
import InventoryIconImg from "/src/assets/images/icons/inventory.png";

// Wastage
import WastageIconActiveImg from "/src/assets/images/icons/wastage-active.png";
import WastageIconImg from "/src/assets/images/icons/wastage.png";

// Purchase Orders
import PurchaseOrdersIconActiveImg from "/src/assets/images/icons/purchase-orders-active.png";
import PurchaseOrdersIconImg from "/src/assets/images/icons/purchase.png";

// Vendors
import VendorsIconActiveImg from "/src/assets/images/icons/vendors-active.png";
import VendorsIconImg from "/src/assets/images/icons/vendors.png";

// Coupons
import CouponsIconActiveImg from "/src/assets/images/icons/coupons-active.png";
import CouponsIconImg from "/src/assets/images/icons/coupons.png";

// Users
import UsersIconActiveImg from "/src/assets/images/icons/users-active.png";
import UsersIconImg from "/src/assets/images/icons/users.png";

// Staff
import StaffIconActiveImg from "/src/assets/images/icons/staff-active.png";
import StaffIconImg from "/src/assets/images/icons/staff.png";

// Subscription

// Recipe
// import RecipeIconImg from '/src/assets/images/icons/recipe.png';
// import RecipeIconActiveImg from '/src/assets/images/icons/recipe-active.png';

import { Box, Container, Grid, IconButton, Typography } from "@mui/material";
import { CardGridSkeleton } from "../../components/common/PageSkeleton";
import { planFeatureLabel, splitPlanFeatures } from "../../utils/planFeatures";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// --- Assets ---
// Video Background (Pexels Public Domain)
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1920&q=80";
// Images
import BM from "../../assets/images/BM.png";
import bulbimage from "../../assets/images/bulb-image.jpg";
import chef2 from "../../assets/images/chef-2dishes.jpg";
import chef from "../../assets/images/chef-image.jpg";
import CM from "../../assets/images/CM.png";
import COUPONS_PIC from "../../assets/images/coupons.png";
import cup from "../../assets/images/cup-image.jpg";
import fqaimage from "../../assets/images/faq-image.jpg";
import GUEST_ORDER_PIC from "../../assets/images/guest-order.png";
import IM from "../../assets/images/IM.png";
import KO from "../../assets/images/KO.png";
import MM from "../../assets/images/MM.png";
import mobile from "../../assets/images/mobile-image.jpg";
import OM from "../../assets/images/OM.png";
import POS from "../../assets/images/POS.png";
import ORDERS_PIC from "../../assets/images/purchase.png";
import sitting from "../../assets/images/sitting-image.jpg";
import speakinghead from "../../assets/images/speaking-head.jpg";
import STAFF_PIC from "../../assets/images/staff.png";
import tickmark from "../../assets/images/tick-mark.jpg";
import USERS_PIC from "../../assets/images/users.png";
import VENDORS_IMG from "../../assets/images/vendors.png";
import waiter from "../../assets/images/waiter-image.jpg";
import WM from "../../assets/images/WM.png";
// import womenserved from "../../assets/images/women-served.jpg";
import TM from "../../assets/images/TM.png";
import womenserved1 from "../../assets/images/women-served1.jpg";
const MOCKUP_DASHBOARD =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"; // Premium Restaurant Interior/Management
const MOCKUP_ORDERS =
  "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80"; // Order service/Waitress
const MOCKUP_COUPONS =
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80"; // Coupons/Marketing context
const IMG_INVENTORY =
  "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=1200&q=80"; // Ingredients/Stock
const IMG_WASTAGE =
  "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=1200&q=80"; // Kitchen storage/Waste management
const MOCKUP_USERS =
  "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80"; // Professional Chef/Staff management
const MOCKUP_CASHIER_CART =
  "https://images.unsplash.com/photo-1556745753-b2904692b3cd?auto=format&fit=crop&w=1200&q=80"; // POS Payment Transaction
const MOCKUP_CASHIER_TABLES =
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80"; // Table Seating/Restaurant Floor
const MOCKUP_CASHIER_CATERING =
  "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80"; // Large Group/Catering food
const MOCKUP_GUEST_ORDER = GUEST_ORDER_PIC;
const MOCKUP_KITCHEN_KDS =
  "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80"; // Tablet/Display in kitchen context for KDS
const IMG_SUPERADMIN =
  "https://images.unsplash.com/photo-1551434678-e076c2236033?auto=format&fit=crop&w=800&q=80";
const IMG_KITCHEN =
  "https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=800&q=80";
const IMG_FOH =
  "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80";
const IMG_GUEST =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";

const VISIBLE_ICONS = 5; // matches your design
const ICON_WIDTH = 160; // px (must match styling)

// --- Configuration ---
const DEMO_SLIDES = [
  { img: MOCKUP_DASHBOARD, label: "Real-time Executive Dashboard" },
  { img: IMG_FOH, label: "Lightning Fast POS Interface" },
  { img: IMG_KITCHEN, label: "Digital Kitchen Display System" },
  { img: IMG_GUEST, label: "Customer Loyalty & Ordering" },
];

// --- Animations ---
const floatAnimation = keyframes`
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
    70% { box-shadow: 0 0 0 20px rgba(33, 150, 243, 0); }
    100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
`;

const marquee = keyframes`
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
`;

// --- Data ---
const ROLES_DATA = [
  /*
          {
              // id: 0,
              // label: "Super Admin",
              // title: "Platform Overview & Infrastructure",
              // roleDesc: "The Platform Owner (God Mode)",
              // color: "#1A237E",
              // image: IMG_SUPERADMIN,
              features: [
                  // {
                  //     title: "Multi-Tenant Lifecycle",
                  //     desc: "Scale from 1 to 100s of branches. Create unique environments in seconds.",
                  //     useCase: "Setup a new franchise branch at 'app.pos.com/new-branch' instantly.",
                  //     icon: <FranchiseIcon />
                  // },
                  // {
                  //     title: "Stripe Subscription Engine",
                  //     desc: "Automated SaaS billing integrated with Stripe.",
                  //     useCase: "Auto-charge monthly subscriptions for 100+ tenants securely.",
                  //     icon: <PaymentIcon />
                  // },
                  // {
                  //     title: "Centralized Helpdesk",
                  //     desc: "Single point of truth for resolving tenant issues worldwide.",
                  //     useCase: "Resolve a printer issue in London from the HQ dashboard.",
                  //     icon: <SupportIcon />
                  // }
              ]
          },
      */
  {
    id: 1,
    label: "Admin & Manager",
    title: "Restaurant Administration",
    roleDesc: "Profitability, Staff, & Efficiency",
    color: "#E65100",
    images: [MOCKUP_DASHBOARD, IMG_INVENTORY, IMG_WASTAGE],
    features: [
      {
        title: "Recipe-Based Inventory",
        desc: "Automated stock deduction based on actual sales.",
        useCase: "Selling 1 Burger automatically deducts 1 Bun and 1 Patty.",
        icon: <InventoryIcon />,
      },
      {
        title: "Advanced Waste Management",
        desc: "Identify invisible losses like spoilage or prep errors.",
        useCase:
          "Track 'Expired Milk' to reduce future purchase orders by 20%.",
        icon: <WastageIcon />,
      },
    ],
  },
  {
    id: 2,
    label: "Front of House",
    title: "Cashier & Waiter Operations",
    roleDesc: "Speed, Accuracy, & Satisfaction",
    color: "#2E7D32",
    images: [
      MOCKUP_CASHIER_CART,
      MOCKUP_CASHIER_TABLES,
      MOCKUP_CASHIER_CATERING,
    ],
    features: [
      {
        title: "High-Speed POS",
        desc: "Quick Search & Category Grid for sub-10s orders.",
        useCase: "Process rush-hour queues without delays.",
        icon: <PointOfSaleIcon />,
      },
    ],
  },
  {
    id: 3,
    label: "Kitchen (KDS)",
    title: "The Kitchen Engine",
    roleDesc: "Seamless Production & Communication",
    color: "#C62828",
    images: [
      MOCKUP_KITCHEN_KDS,
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80",
    ],
    features: [
      {
        title: "Digital KDS",
        desc: "Replace messy paper chits with real-time digital boards.",
        useCase: "Chef marks 'Pasta' ready; Runner gets instant notify.",
        icon: <KitchenIcon />,
      },
    ],
  },
  {
    id: 4,
    label: "Guest App",
    title: "The Guest Experience",
    roleDesc: "Frictionless Ordering & Loyalty",
    color: "#9C27B0",
    images: [
      "https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=1200&q=80",
      IMG_GUEST,
    ],
    features: [
      {
        title: "QR Order & Pay",
        desc: "Scan QR to Order and Pay directly from the table.",
        useCase: "Guest pays via phone (Stripe/Apple Pay) without waiter.",
        icon: <QrIcon />,
      },
      {
        title: "Self-Service Booking",
        desc: "Online table reservations 24/7.",
        useCase: "Customer books for tomorrow at midnight via website.",
        icon: <TableIcon />,
      },
    ],
  },
];

const featureData = [
  {
    title: "Orders Management",
    subheading: "Control every ticket from start to finish.",
    icon: {
      inactive: OrdersIconImg,
      active: OrdersIconActiveImg,
    },
    images: [OM],
    points: [
      "Unified hub to manage Dine-In, Takeaway, and Online delivery orders in one screen",
      "Live status tracking with Pending, Preparing, and Ready badges",
      "Detailed insight with token numbers, table IDs, and customer names at a glance",
      "Quick edits to add items, apply discounts, or update active tickets on the fly",
      "Flexible checkout supporting multiple payment types with automated tax calculations",
    ],
  },

  {
    title: "Point of Sale",
    subheading:
      "Process rush-hour queues without delays using a visual, touch-friendly interface.",
    icon: {
      inactive: PosIconImg,
      active: PosIconActiveImg,
    },
    images: [POS],
    points: [
      "Visual menu grid with high-quality photo-based items for instant cart additions",
      "Smart navigation between categories like Biryani, Curries, or Starters",
      "Flexible order types with one-click switching between Dine-In and Takeaway",
      "Integrated CRM to capture customer name and phone number for loyalty tracking",
      "One-click checkout for Cash, Card, and Online payments with validations",
    ],
  },

  {
    title: "Table Management",
    subheading: "Maximize occupancy and streamline guest seating flow.",
    icon: {
      inactive: TableIconImg,
      active: TableIconActiveImg,
    },
    images: [TM],
    points: [
      "Live table availability with filters for Available, Occupied, Reserved, and Cleaning",
      "Smart capacity visibility showing seating limits and location zones",
      "Reservation control between Tables and Bookings without conflicts",
      "Visual floor plan with table cards, names, and images",
      "Dynamic layouts using the + Add Table feature",
    ],
  },

  {
    title: "Bookings Management",
    subheading:
      "Streamline reservations and optimize table turnover with a centralized scheduler.",
    icon: {
      inactive: BookingIconImg,
      active: BookingIconActiveImg,
    },
    images: [BM],
    points: [
      "Dual view modes with List View and Timeline View",
      "Real-time reservation lifecycle tracking with color-coded statuses",
      "Smart timeline to prevent double-booking and identify gaps",
      "Detailed guest logs including name, phone, guest count, and table",
      "Instant booking creation with capacity-based table filtering",
    ],
  },

  {
    title: "Catering Management",
    subheading:
      "Handle large-scale events and bulk orders with a dedicated workflow.",
    icon: {
      inactive: CateringIconImg,
      active: CateringIconActiveImg,
    },
    images: [CM],
    points: [
      "Centralized catering contracts with customer and event details",
      "Inventory estimation to calculate stock needs before events",
      "Live lifecycle tracking with clear order status indicators",
      "Financial clarity with total amounts and payment tracking",
      "Quick lead capture using the + New Catering Order button",
    ],
  },

  {
    title: "Kitchen Management",
    subheading:
      "Sync your back-of-house with real-time updates and digital precision.",
    icon: {
      inactive: KitchenOrdersIconImg,
      active: KitchenOrdersIconActiveImg,
    },
    images: [KO],
    points: [
      "Live production board with Urgent, Pending, and Ready filters",
      "Instant order stage updates for seamless FOH–Kitchen sync",
      "Item-level readiness tracking with checklists and progress bars",
      "Smart timers highlighting delays and kitchen bottlenecks",
      "Flexible filtering by Dine-In, Takeaway, and Delivery",
    ],
  },

  {
    title: "Menu Management",
    subheading:
      "Control your culinary offerings with a visual, flexible digital menu builder.",
    icon: {
      inactive: MenuIconImg,
      active: MenuIconActiveImg,
    },
    images: [MM],
    points: [
      "Visual menu builder with images, descriptions, and pricing",
      "Smart categorization for faster navigation",
      "Live availability badges to prevent out-of-stock orders",
      "Detailed customization with tags and descriptions",
      "Rapid updates using Add Menu Item or Add Category",
    ],
  },

  {
    title: "Inventory Management",
    subheading: "Track raw materials, monitor usage, and automate reordering.",
    icon: {
      inactive: InventoryIconImg,
      active: InventoryIconActiveImg,
    },
    images: [IM],
    points: [
      "Real-time stock levels with reorder thresholds",
      "Color-coded stock health alerts (Good / Low)",
      "Usage analytics tracking total material usage and cost",
      "Supplier-linked raw materials for easy procurement",
      "Bulk inventory upload for fast updates",
    ],
  },

  {
    title: "Wastage Management",
    subheading:
      "Identify invisible losses and reduce food costs with precise tracking.",
    icon: {
      inactive: WastageIconImg,
      active: WastageIconActiveImg,
    },
    images: [WM],
    points: [
      "Instant visibility into total financial loss",
      "Granular tracking of raw material vs menu item waste",
      "Quick waste logging using the + Log Waste action",
      "Detailed insights with reason, quantity, and loss value",
      "Accountability with Recorded By tracking",
    ],
  },

  {
    title: "Purchase Orders",
    subheading:
      "Comprehensive tracking of procurement and operational expenses.",
    icon: {
      inactive: PurchaseOrdersIconImg,
      active: PurchaseOrdersIconActiveImg,
    },
    images: [ORDERS_PIC],
    points: [
      "Unified tracking of procurement, salaries, and expenses",
      "Smart search and filters by vendor, category, and status",
      "Clear lifecycle indicators for approvals and unpaid items",
      "Detailed logs with PO numbers and vendor details",
      "Quick actions to create, approve, or delete entries",
    ],
  },

  {
    title: "Vendors",
    subheading:
      "Manage supplier relationships and procurement sources efficiently.",
    icon: {
      inactive: VendorsIconImg,
      active: VendorsIconActiveImg,
    },
    images: [VENDORS_IMG],
    points: [
      "Centralized vendor directory with contact and address details",
      "Smart categorization by Raw Materials or Supplies",
      "Quick search and filtering by vendor status",
      "Live operational status with Active badges",
      "Easy onboarding using the + Add Vendor button",
    ],
  },

  {
    title: "Coupons Management",
    subheading:
      "Boost sales and customer retention with flexible discount campaigns.",
    icon: {
      inactive: CouponsIconImg,
      active: CouponsIconActiveImg,
    },
    images: [COUPONS_PIC],
    points: [
      "Campaign performance overview with coupon statistics",
      "Smart rules with minimum order values and discount percentages",
      "Controlled validity periods and max usage limits",
      "Quick promo launches using + Create New Coupon",
      "Live coupon status monitoring and management",
    ],
  },

  {
    title: "User Management",
    subheading: "Securely manage staff access, roles, and customer data.",
    icon: {
      inactive: UsersIconImg,
      active: UsersIconActiveImg,
    },
    images: [USERS_PIC],
    points: [
      "Role-based access for Admin, Cashier, Waiter, and Delivery",
      "Smart user organization by Management, Staff, or Customers",
      "Detailed profiles with permissions and contact details",
      "Access security with Active status toggles",
      "Quick onboarding using the + Add User button",
    ],
  },

  {
    title: "Staff Management",
    subheading: "Real-time shift monitoring, attendance, and payroll insights.",
    icon: {
      inactive: StaffIconImg,
      active: StaffIconActiveImg,
    },
    images: [STAFF_PIC],
    points: [
      "Operational dashboard for active staff and logged shifts",
      "Payroll control with cumulative hours and cost calculations",
      "Precision attendance using timestamps and geo-location",
      "Role-based workforce segmentation",
      "Financial reporting with exportable labor reports",
    ],
  },

  // {
  //     title: 'Subscription Plans',
  //     subheading: 'Choose the perfect plan for your restaurant.',
  //     icon: {
  //         inactive: SubscriptionIconImg,
  //         active: SubscriptionIconActiveImg,
  //     },
  //     images: [SUBSCRIPTION_PIC],
  //     points: [
  //         'Flexible Monthly and Quarterly billing plans',
  //         'User and table limits per location',
  //         'Order volume limits based on subscription tier',
  //         'Instant activation using Subscribe Now',
  //         'Centralized subscription and billing management',
  //     ],
  // },
];

const FeatureCard = ({ feature, color }: any) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: 3,
      border: "1px solid rgba(0,0,0,0.05)",
      transition: "all 0.3s ease",
      bgcolor: "white",
      "&:hover": {
        transform: "translateY(-5px)",
        boxShadow: `0 20px 40px -10px ${color}30`,
        borderColor: color,
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Avatar sx={{ bgcolor: `${color}15`, color: color }}>
          {feature.icon}
        </Avatar>
        <Typography variant="subtitle1" fontWeight="bold">
          {feature.title}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {feature.desc}
      </Typography>
      <Box sx={{ bgcolor: "#F5F5F7", p: 1.5, borderRadius: 2 }}>
        <Typography
          variant="caption"
          fontWeight="bold"
          color="text.primary"
          display="block"
        >
          Scenario:
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          "{feature.useCase}"
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featureSlide, setFeatureSlide] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  const ITEMS_PER_PAGE = 7;
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(featureData.length / ITEMS_PER_PAGE);

  const visibleItems = featureData.slice(
    page * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );

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

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      // Allow only digits and max 10 characters
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
        // Clear error when user types
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

    // Validation
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
      const apiUrl =
        (import.meta as any).env.VITE_API_URL || "http://localhost:5006";

      const payload = {
        businessName: formData.businessName,
        email: formData.email,
        phonePrefix: formData.phonePrefix,
        phoneNumber: formData.phoneNumber,
        preferredDateTime: easternWallClockToUtcIso(
          formData.preferredDate,
          formData.preferredTime
        )
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
        message:
          "Something went wrong. Please check your connection and try again, or contact us directly.",
        meetingLink: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToDemo = () => {
    document
      .getElementById("demo-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Set mounted to true on component mount for animations
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch pricing plans from public API
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  useEffect(() => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";
    fetch(`${apiUrl}/api/superadmin/plans/public`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPlans(data.filter((p: any) => p.isActive !== false)); })
      .catch(() => { })
      .finally(() => setPlansLoading(false));
  }, []);

  // Fetch available slots
  useEffect(() => {
    if (formData.preferredDate) {
      setFetchingSlots(true);
      setFormData(prev => ({ ...prev, preferredTime: "" }));
      const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";
      fetch(`${apiUrl}/api/email/demo-requests/slots?date=${formData.preferredDate}`)
        .then(res => res.json())
        .then(data => {
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

  // Auto-rotate slideshows
  // Auto-rotate slideshows
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % DEMO_SLIDES.length);
    }, 5000);

    const currentRoleImagesCount = ROLES_DATA[activeTab]?.images?.length || 4;
    const featureInterval = setInterval(() => {
      setFeatureSlide((prev) => (prev + 1) % currentRoleImagesCount);
    }, 3500);

    return () => {
      clearInterval(heroInterval);
      clearInterval(featureInterval);
    };
  }, [activeTab]);

  // Reset feature slide when changing tabs
  useEffect(() => {
    setFeatureSlide(0);
  }, [activeTab]);

  const currentRole = ROLES_DATA[activeTab];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff7f1", overflowX: "hidden" }}>
      {/* --- Transparent Navbar --- */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "#ffffff",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{ justifyContent: "space-between", height: 80 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ cursor: "pointer", mr: { md: 4 } }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="NexZen POS"
                sx={{ height: 45 }}
              />
              <Typography
                variant="h6"
                fontWeight="800"
                sx={{ letterSpacing: -0.5, color: "black" }}
              >
                NexZen
                <Box component="span" color="primary.light" sx={{ ml: 0.8 }}>
                  POS
                </Box>
              </Typography>
            </Stack>

            {/* Responsive Navigation */}
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  color="inherit"
                  sx={{ color: "black", fontWeight: "bold" }}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Home
                </Button>
                <Button
                  color="inherit"
                  sx={{ color: "black", fontWeight: "bold" }}
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Features
                </Button>
                <Button
                  color="inherit"
                  sx={{ color: "black", fontWeight: "bold" }}
                  onClick={() =>
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Pricing
                </Button>
                <Button
                  color="inherit"
                  sx={{ color: "black", fontWeight: "bold" }}
                  onClick={scrollToDemo}
                >
                  Try Free
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate("/login")}
                  sx={{ borderRadius: 50, px: 3, fontWeight: "bold" }}
                >
                  Login
                </Button>
              </Stack>
            </Box>
            {/* Mobile Drawer */}
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              PaperProps={{ sx: { width: 260 } }}
            >
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <Box
                    component="img"
                    src="/logo.png"
                    alt="NexZen POS"
                    sx={{ height: 32, filter: 'brightness(0)' }}
                  />
                  <Typography
                    variant="h6"
                    fontWeight="800"
                    sx={{ letterSpacing: -0.5, color: 'black', fontSize: 17 }}
                  >
                    NexZen
                    <Box component="span" color="primary.light" sx={{ ml: 0.8 }}>
                      POS
                    </Box>
                  </Typography>
                </Stack>
                <IconButton onClick={() => setMobileMenuOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Stack spacing={2} sx={{ px: 3, pb: 6 }}>
                <Button fullWidth size="large" color="inherit" sx={{ color: "black" }} onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Home</Button>
                <Button fullWidth size="large" color="inherit" sx={{ color: "black" }} onClick={() => { setMobileMenuOpen(false); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>Features</Button>
                <Button fullWidth size="large" color="inherit" sx={{ color: "black" }} onClick={() => { setMobileMenuOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>Pricing</Button>
                <Button fullWidth size="large" color="inherit" sx={{ color: "black" }} onClick={() => { setMobileMenuOpen(false); scrollToDemo(); }}>Try Free</Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                  sx={{ mt: 2 }}
                >
                  Login
                </Button>
              </Stack>
            </Drawer>

            {/* Hamburger Icon for Mobile - Moved back to the right */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                edge="end"
                color="default"
                sx={{ color: "black", ml: 1 }}
                aria-label="menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                {/* Custom 3-line Hamburger Icon */}
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    width: 22,
                    height: 22,
                  }}
                >
                  <Box
                    sx={{
                      width: 18,
                      height: 2,
                      bgcolor: "black",
                      borderRadius: 1,
                      mb: 0.4,
                    }}
                  />
                  <Box
                    sx={{
                      width: 18,
                      height: 2,
                      bgcolor: "black",
                      borderRadius: 1,
                      mb: 0.4,
                    }}
                  />
                  <Box
                    sx={{ width: 18, height: 2, bgcolor: "black", borderRadius: 1 }}
                  />
                </Box>
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* --- Cinematic Hero Section (Video Background) --- */}
      <Box
        sx={{
          height: "100vh",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          overflow: "hidden",
        }}
      >
        {/* Hero Background Image & Gradient */}
        {/* <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '80%',
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${HERO_IMAGE})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: 0
                    }}
                /> */}

        <Container
          maxWidth="lg"
          sx={{
            textAlign: "center",
            position: "relative",
            zIndex: 1,
            minHeight: { xs: 600, md: 600 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: {
              xs: "#fff7f1",
              md: 'url("/src/assets/images/vector.png") repeat',
            },
            backgroundColor: "#fff7f0",
            borderRadius: 6,
            // boxShadow: { md: '0 8px 32px rgba(0,0,0,0.04)' },
            // overflow: 'visible',
          }}
        >
          {/* Top Left Illustration */}
          <Box
            sx={{
              position: "absolute",
              top: { xs: 10, md: 30 },
              left: { xs: 10, md: 30 },
              width: { xs: 80, md: 120 },
              height: { xs: 120, md: 180 },
              zIndex: 2,
              background: "none",
              display: { xs: "none", sm: "block" },
            }}
          >
            <img
              src={mobile}
              alt="POS App Mockup"
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
          {/* Top Right Illustration */}
          <Box
            sx={{
              position: "absolute",
              top: { xs: 10, md: 30 },
              right: { xs: 10, md: 30 },
              width: { xs: 80, md: 120 },
              height: { xs: 120, md: 180 },
              zIndex: 2,
              background: "none",
              display: { xs: "none", sm: "block" },
            }}
          >
            <img
              src={chef}
              alt="Chef Illustration"
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
          {/* Main Content */}
          <Box
            sx={{ width: "100%", pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}
          >
            <Typography
              variant="h1"
              sx={{
                fontFamily: "Unbounded, sans-serif",
                fontWeight: 900,
                fontSize: { xs: "1.8rem", md: "3.2rem" },
                color: "#222",
                mb: 2,
                lineHeight: 1.1,
                letterSpacing: -1,
              }}
            >
              The All-in-One{" "}
              <Box
                component="span"
                sx={{ color: "#FF914D", display: "inline", fontWeight: 900 }}
              >
                POS
              </Box>{" "}
              System
              <br />
              Built for Busy Restaurants
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Poppins, sans-serif",
                color: "#444",
                fontWeight: 400,
                maxWidth: 800,
                mx: "auto",
                mb: 3,
                lineHeight: 1.6,
              }}
            >
              Streamline your front-of-house, manage inventory, and grow your
              sales with the easiest POS software on the market. Start your
              3-day free trial.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
              sx={{ mb: 4 }}
            >
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderRadius: 50,
                  px: 3,
                  py: 1.2,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: "#FF914D",
                  borderColor: "#FF914D",
                  bgcolor: "transparent",
                  fontFamily: "Poppins, sans-serif",
                  "transparent": {
                    bgcolor: "transparent",
                    color: "#fff",
                    borderColor: "#FF914D",
                  },
                }}
                onClick={scrollToDemo}
              >
                Request a free demo
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayIcon />}
                sx={{
                  borderRadius: 50,
                  px: 3,
                  py: 1.2,
                  fontSize: "1rem",
                  fontWeight: "bold",
                  bgcolor: "#FF914D",
                  color: "#fff",
                  fontFamily: "Poppins, sans-serif",
                  "&:hover": { bgcolor: "#FF914D" },
                }}
                onClick={() => setVideoOpen(true)}
              >
                Watch demo
              </Button>
            </Stack>
          </Box>
          {/* Bottom Left Illustration */}
          <Box
            sx={{
              position: "absolute",
              left: { xs: 10, md: 60 },
              bottom: { xs: 10, md: 30 },
              width: { xs: 120, md: 220 },
              zIndex: 1,
              display: { xs: "none", sm: "block" },
            }}
          >
            <img
              src={sitting}
              alt="Dining Illustration"
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
          {/* Bottom Right Illustration */}
          <Box
            sx={{
              position: "absolute",
              right: { xs: 10, md: 60 },
              bottom: { xs: 10, md: 30 },
              width: { xs: 120, md: 220 },
              zIndex: 1,
              display: { xs: "none", sm: "block" },
            }}
          >
            <img
              src={waiter}
              alt="Analytics Illustration"
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
        </Container>

        {/* Floating Mockup Preview - Automated Flow (removed invalid commented-out block) */}
      </Box>

      {/* --- Spacer for Mockup overlap --- */}
      {/* <Box sx={{ height: { xs: 50, md: 220 } }} /> */}

      {/* --- Trust Bar (Marquee) --- */}
      {/* <Box sx={{ py: 4, bgcolor: '#fcfcfc', borderY: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', width: '200%', animation: `${marquee} 30s linear infinite` }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={4} sx={{ mx: 8, opacity: 0.4 }}>
                            <FranchiseIcon fontSize="large" />
                            <Typography variant="h5" fontWeight="900" sx={{ whiteSpace: 'nowrap' }}>RESTO_LOGO_{i}</Typography>
                        </Stack>
                    ))}
                </Box>
            </Box> */}

      {/* --- Stats Counter Section --- */}
      {/* <Container maxWidth="lg" sx={{ py: 0 }}>
                <Grid container spacing={4}>
                    {[
                        { val: '500+', label: 'Active Tenants', icon: <GlobalIcon color="primary" /> },
                        { val: '$2M+', label: 'Processed Daily', icon: <PaymentIcon color="primary" /> },
                        { val: '99.9%', label: 'Cloud Uptime', icon: <CheckIcon color="primary" /> },
                        { val: '24/7', label: 'Support Available', icon: <SupportIcon color="primary" /> }
                    ].map((stat, i) => (
                        <Grid item xs={6} md={3} key={i}>
                            <Zoom in={mounted} timeout={500 + (i * 200)}>
                                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px solid #eee' }}>
                                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>{stat.icon}</Box>
                                    <Typography variant="h3" fontWeight="900" color="primary">{stat.val}</Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight="bold">{stat.label}</Typography>
                                </Paper>
                            </Zoom>
                        </Grid>
                    ))}
                </Grid>
            </Container> */}

      {/* --- Interactive Feature Showcase --- */}
      <Box sx={{ py: 1, bgcolor: "#fff" }}>
        <Container maxWidth="xl">
          <Grid container spacing={4} alignItems="center">
            {/* Left Side: Illustration */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  mt: { xs: -8, md: -11 },
                  mb: { xs: 0, md: 0 },
                  zIndex: 2,
                  position: "relative",
                }}
              >
                <img
                  src={womenserved1}
                  alt="Waiter serving customer"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 520,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  }}
                />
              </Box>
            </Grid>

            {/* Right Side: Text */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                fontWeight={900}
                sx={{
                  fontFamily: "Unbounded, sans-serif",
                  color: "#222",
                  mb: 2,
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                  textAlign: "left",
                  fontSize: { xs: "2.2rem", md: "3.2rem" },
                }}
              >
                Fueling Your
                <br />
                Business{" "}
                <Box
                  component="span"
                  sx={{ color: "#FF914D", fontWeight: 900, display: "inline" }}
                >
                  Growth
                </Box>
              </Typography>
              {[...Array(1)].map((_, i) => (
                <Typography
                  key={i}
                  variant="body1"
                  sx={{
                    color: "#444",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 400,
                    textAlign: "left",
                    mb: 2,
                    fontSize: { xs: "1rem", md: "1.1rem" },
                  }}
                >
                  Passion launches your restaurant, but our precision tools ensure it stays open and thrives.
                  Act as the ultimate financial guardian by integrating rapid billing with deep operational tracking.
                  Gain absolute profit clarity to identify exactly where you are making money and where invisible losses are occurring.
                  Maximize workforce productivity by aligning live shift data and payroll costs directly with customer demand.
                  Support your long-term vision with scalable infrastructure that grows effortlessly alongside your business.
                </Typography>
              ))}
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- Video Dialog --- */}
      <Dialog
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "black",
            borderRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        <DialogContent sx={{ p: 0, bgcolor: "black", position: "relative" }}>
          <IconButton
            onClick={() => setVideoOpen(false)}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              color: "white",
              bgcolor: "rgba(0,0,0,0.5)",
              zIndex: 10,
              "&:hover": { bgcolor: "rgba(255,0,0,0.7)" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            sx={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <video
              autoPlay
              controls
              style={{
                width: "100%",
                maxHeight: "80vh",
                outline: "none",
              }}
            >
              <source src="https://s3.amazonaws.com/stage-eventcrux-images.com/uploads/1776670857839_pos.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ---Built to Support Your Passion (Image + Stats)--- */}
      <Box sx={{ py: 10, bgcolor: "#fff7f1" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            {/* Left Side: Heading + Chef Image */}
            <Grid item xs={12} md={5}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h3"
                  fontWeight="600"
                  sx={{
                    fontFamily: "Unbounded, sans-serif",
                    mb: 1,
                    textAlign: { xs: "center", md: "left" },
                  }}
                >
                  Built to Support
                  <br />
                  Your{" "}
                  <Box
                    component="span"
                    sx={{
                      color: "#FF914D",
                      display: "inline",
                      fontWeight: 900,
                    }}
                  >
                    Passion
                  </Box>
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", md: "flex-start" },
                  alignItems: "flex-end",
                  minHeight: 280,
                }}
              >
                <img
                  src={chef2}
                  alt="Chef"
                  style={{ maxWidth: 270, width: "100%", objectFit: "contain" }}
                />
              </Box>
            </Grid>
            {/* Right Side: 2x2 Stat Cards */}
            <Grid item xs={12} md={7}>
              <Grid container spacing={4}>
                {/* Card 1 */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      bgcolor: "#fff",
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img
                        src={tickmark}
                        alt="Support Icon"
                        style={{ width: 50, height: 50, objectFit: "contain" }}
                      />
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="900"
                      sx={{ color: "#FF914D", mb: 1 }}
                    >
                      15+
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="600"
                      sx={{
                        color: "#222",
                        mb: 1,
                        fontFamily: "Unbounded, sans-serif",
                      }}
                    >
                      Happy Kitchens
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Empowering local owners to grow without the technical
                      headaches.
                    </Typography>
                  </Paper>
                </Grid>
                {/* Card 2 */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      bgcolor: "#fff",
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img
                        src={cup}
                        alt="Support Icon"
                        style={{ width: 50, height: 50, objectFit: "contain" }}
                      />
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="900"
                      sx={{ color: "#FF914D", mb: 1 }}
                    >
                      $2M+
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="600"
                      sx={{
                        color: "#222",
                        mb: 1,
                        fontFamily: "Unbounded, sans-serif",
                      }}
                    >
                      In Daily Success
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ensuring every transaction is secure, transparent, and
                      stress-free.
                    </Typography>
                  </Paper>
                </Grid>
                {/* Card 3 */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      bgcolor: "#fff",
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img
                        src={bulbimage}
                        alt="Support Icon"
                        style={{ width: 50, height: 50, objectFit: "contain" }}
                      />
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="900"
                      sx={{ color: "#FF914D", mb: 1 }}
                    >
                      99.9%
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="600"
                      sx={{
                        color: "#222",
                        mb: 1,
                        fontFamily: "Unbounded, sans-serif",
                      }}
                    >
                      Total Peace of Mind
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The rock-solid stability your business needs during every
                      rush.
                    </Typography>
                  </Paper>
                </Grid>
                {/* Card 4 */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      bgcolor: "#fff",
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      <img
                        src={speakinghead}
                        alt="Support Icon"
                        style={{ width: 50, height: 50, objectFit: "contain" }}
                      />
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="900"
                      sx={{ color: "#FF914D", mb: 1 }}
                    >
                      24/7
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="600"
                      sx={{
                        color: "#222",
                        mb: 1,
                        fontFamily: "Unbounded, sans-serif",
                      }}
                    >
                      Real People, Real Help
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expert human support standing by so you never work alone.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* built to support your passion (image left, text right) */}
      <Box
        sx={{
          py: 8,
          bgcolor: "#fff",
          position: "relative",
          overflow: "visible",
        }}
      >
        <Container maxWidth="lg">
          <Grid
            container
            spacing={4}
            alignItems="center"
            sx={{ position: "relative" }}
          >
            {/* Left Side: Text */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h3"
                fontWeight="900"
                sx={{ fontFamily: "Unbounded, sans-serif", mb: 2 }}
              >
                A Zero Friction
                <br />
                Your{" "}
                <Box
                  component="span"
                  sx={{ color: "#FF914D", display: "inline", fontWeight: 900 }}
                >
                  Workflow
                </Box>
              </Typography>
              {[...Array(1)].map((_, i) => (
                <Typography
                  key={i}
                  variant="body1"
                  sx={{
                    color: "#444",
                    fontFamily: "Poppins, sans-serif",
                    mb: 2,
                  }}
                >
                  Achieve instant mastery by onboarding staff in minutes, not days, with the world’s most intuitive interface.
                  Process orders with visual speed using a vibrant, photo-first menu that eliminates guesswork.
                  Bring service directly to the guest with a mobile-ready architecture that enables ordering right at the table.
                  Turn rush hour into choreographed operations by syncing floor plans and reservations into one fluid motion.
                  Eliminate service bottlenecks by firing tickets instantly to the kitchen display for immediate preparation.
                </Typography>
              ))}
            </Grid>
            {/* Right Side: Illustration (overlapping top) */}
            <Grid item xs={12} md={6} sx={{ position: "relative" }}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  position: "absolute",
                  top: { xs: -60, md: -80 },
                  left: 0,
                  right: 0,
                  zIndex: 2,
                }}
              >
                <img
                  src={womenserved1}
                  alt="Waiter serving customer"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 520,
                    borderRadius: 16,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  }}
                />
              </Box>
              {/* Spacer for layout */}
              <Box sx={{ height: { xs: 300, md: 420 } }} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="features" sx={{ py: { xs: 8, md: 12 }, bgcolor: "#fff7f2" }}>
        <Container maxWidth="xl">
          {/* SECTION HEADING */}
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{ fontFamily: "Unbounded, sans-serif", mb: 1 }}
            >
              One Platform. Every Ecosystem.
            </Typography>
            <Typography color="text.secondary">
              Streamline your front-of-house, manage inventory, and grow your
              sales with the easiest POS software on the market.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 6,
              border: "1px solid #eee",
              px: { xs: 3, md: 6 },
              py: { xs: 4, md: 6 },
              bgcolor: "#fff",
            }}
          >
            {/* MODULE ICON SWITCHER */}
            <Box sx={{ position: "relative", mb: 6 }}>
              {/* LEFT ARROW */}
              <IconButton
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                sx={{
                  display: { xs: "none", md: "flex" },
                  position: "absolute",
                  left: -32,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "#fff",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                }}
              >
                <ChevronLeftIcon />
              </IconButton>

              {/* ICON GRID - improved mobile responsiveness */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(4, 1fr)",
                    lg: "repeat(7, 1fr)",
                  },
                  gap: { xs: 1.5, sm: 2, md: 2.5 },
                  px: { xs: 1, sm: 2, md: 4 },
                  py: { xs: 2, md: 4 },
                  borderRadius: 4,
                  bgcolor: "#fff6ee",
                  border: "1px solid #ffe1c7",
                }}
              >
                {(window.innerWidth < 900
                  ? featureData
                  : visibleItems
                ).map((item: typeof featureData[number], index: number) => {
                  // For mobile, index is the real index; for web, index is relative to visibleItems
                  const realIndex = window.innerWidth < 900 ? index : page * ITEMS_PER_PAGE + index;
                  const active = realIndex === activeFeature;
                  return (
                    <Box
                      key={item.title}
                      onClick={() => setActiveFeature(realIndex)}
                      sx={{
                        cursor: "pointer",
                        textAlign: "center",
                        borderRadius: 3,
                        height: "100%",
                        minHeight: { xs: 90, sm: 110, md: 130 },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        px: { xs: 0.5, sm: 1.5, md: 2 },
                        py: { xs: 1, sm: 2, md: 2.5 },
                        bgcolor: active ? "#FF914D" : "#fff",
                        transition: "all 0.25s ease",
                        boxShadow: active
                          ? "0 12px 28px rgba(255,145,77,0.35)"
                          : "0 6px 14px rgba(0,0,0,0.08)",
                        "&:hover": {
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      {/* ICON */}
                      <Box
                        component="img"
                        src={active ? item.icon.active : item.icon.inactive}
                        alt={item.title}
                        sx={{
                          width: { xs: 26, sm: 30, md: 36 },
                          height: { xs: 26, sm: 30, md: 36 },
                          mb: 1.2,
                          opacity: active ? 1 : 0.65,
                        }}
                      />
                      {/* TITLE */}
                      <Typography
                        fontWeight={600}
                        fontSize={{ xs: 11, sm: 12 }}
                        sx={{
                          lineHeight: 1.3,
                          color: active ? "#fff" : "#333",
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

              {/* RIGHT ARROW */}
              <IconButton
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                sx={{
                  display: { xs: "none", md: "flex" },
                  position: "absolute",
                  right: -32,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "#fff",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>

            {/* CONTENT AREA */}
            <Grid container spacing={6} alignItems="center">
              {/* LEFT IMAGE */}
              <Grid
                item
                xs={12}
                md={6}
                order={{ xs: 1, md: 0 }}
                sx={{ mb: { xs: 3, md: 0 } }}
              >
                <Fade in key={activeFeature} timeout={400}>
                  <Box
                    component="img"
                    src={featureData[activeFeature].images[0]}
                    alt={featureData[activeFeature].title}
                    sx={{
                      width: "100%",
                      maxHeight: { xs: 240, sm: 320, md: "unset" },
                      objectFit: "contain",
                      borderRadius: 4,
                      boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
                    }}
                  />
                </Fade>
              </Grid>

              {/* RIGHT CONTENT */}
              <Grid
                item
                xs={12}
                md={6}
                order={{ xs: 2, md: 1 }}
                sx={{ px: { xs: 1, sm: 0 } }}
              >
                <Typography variant="h4" fontWeight={900} mb={1}>
                  {featureData[activeFeature].title}
                </Typography>

                {featureData[activeFeature].subheading && (
                  <Typography color="text.secondary" mb={3}>
                    {featureData[activeFeature].subheading}
                  </Typography>
                )}

                <Stack spacing={2}>
                  {featureData[activeFeature].points.map((point, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={2}
                      alignItems="flex-start"
                    >
                      <CheckIcon
                        sx={{ color: "#FF914D", mt: "2px" }}
                      />
                      <Typography color="text.secondary">{point}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* --- Pricing Section --- */}
      <Box id="pricing" sx={{ py: { xs: 8, md: 12 }, bgcolor: "#fff" }}>
        <Container maxWidth="lg">
          {/* SECTION TITLE */}
          <Box textAlign="center" mb={8}>
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{ fontFamily: '"Unbounded", sans-serif' }}
            >
              Best Pricing Plan
            </Typography>
          </Box>

          {plansLoading ? (
            <CardGridSkeleton count={3} cardHeight={420} />
          ) : plans.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="body1" color="text.secondary">
                No plans available at the moment. Please check back soon.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4} justifyContent="center">
              {plans.map((plan: any, i: number) => {
                const { basePlan, extra } = splitPlanFeatures(plan, plans);
                const limitItems = [
                  plan.maxUsers ? `Max Users: ${plan.maxUsers}` : null,
                  plan.maxTables ? `Max Tables: ${plan.maxTables}` : null,
                  plan.maxOrders ? `Max Orders/month: ${plan.maxOrders}` : null,
                  plan.maxSms !== undefined && plan.maxSms !== null ? (plan.maxSms === 0 || plan.maxSms === -1 ? `Max SMS/month: Unlimited` : `Max SMS/month: ${plan.maxSms}`) : null,
                  (plan.maxEmail ?? plan.maxEmails) !== undefined && (plan.maxEmail ?? plan.maxEmails) !== null
                    ? ((plan.maxEmail ?? plan.maxEmails) === 0 || (plan.maxEmail ?? plan.maxEmails) === -1 ? `Max Emails/month: Unlimited` : `Max Emails/month: ${plan.maxEmail ?? plan.maxEmails}`)
                    : null,
                ].filter(Boolean) as string[];
                const featureItems = extra.map(planFeatureLabel);
                const isPopular = i === Math.floor(plans.length / 2);
                return (
                  <Grid item xs={12} md={4} key={plan._id || i}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3.5,
                        height: "100%",
                        borderRadius: 3,
                        bgcolor: isPopular ? "#1a1a2e" : "#f7f6f4",
                        border: isPopular ? "2px solid #6366f1" : "1px solid #eee",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {isPopular && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            bgcolor: "#6366f1",
                            color: "#fff",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Most Popular
                        </Box>
                      )}

                      {/* PLAN NAME */}
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        gutterBottom
                        sx={{ color: isPopular ? "#fff" : "inherit" }}
                      >
                        {plan.name}
                      </Typography>

                      {/* PRICE */}
                      <Typography
                        variant="h3"
                        fontWeight={900}
                        mb={1}
                        sx={{ color: isPopular ? "#fff" : "inherit" }}
                      >
                        ${Number(plan.price || 0).toFixed(2)}
                        <Box component="span" sx={{ fontSize: "1.2rem", fontWeight: 500 }}>
                          /{plan.interval === "yearly" ? "yr" : "mo"}
                        </Box>
                      </Typography>

                      {/* DESCRIPTION */}
                      <Typography
                        variant="body2"
                        mb={2}
                        sx={{ color: isPopular ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                      >
                        {plan.description || `Everything you will get with the ${plan.name} plan.`}
                      </Typography>

                      {/* LIMITS */}
                      {limitItems.length > 0 && (
                        <Box mb={2}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            mb={0.5}
                            sx={{ color: isPopular ? "#fff" : "inherit" }}
                          >
                            Limits:
                          </Typography>
                          {limitItems.map((item: string, j: number) => (
                            <Typography
                              key={j}
                              variant="body2"
                              sx={{ color: isPopular ? "rgba(255,255,255,0.85)" : "text.secondary", lineHeight: 1.7 }}
                            >
                              • {item}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {/* FEATURES */}
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        mb={0.5}
                        sx={{ color: isPopular ? "#fff" : "inherit" }}
                      >
                        {basePlan ? `Everything in ${basePlan.name}, plus:` : "Features:"}
                      </Typography>
                      <Stack spacing={0.4} mb={4}>
                        {featureItems.map((item: string, j: number) => (
                          <Stack key={j} direction="row" spacing={1} alignItems="center">
                            <CheckIcon sx={{ fontSize: 15, color: isPopular ? "#6366f1" : "inherit" }} />
                            <Typography
                              variant="body2"
                              sx={{ color: isPopular ? "rgba(255,255,255,0.85)" : "inherit" }}
                            >
                              {item}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      {/* CTA */}
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          mt: "auto",
                          bgcolor: isPopular ? "#6366f1" : "#fff",
                          color: isPopular ? "#fff" : "#000",
                          border: isPopular ? "none" : "1px solid #ddd",
                          borderRadius: 2,
                          fontWeight: 700,
                          boxShadow: "none",
                          "&:hover": {
                            bgcolor: isPopular ? "#4f46e5" : "#f2f2f2",
                            boxShadow: "none",
                          },
                        }}
                        onClick={() => {
                          navigate(`/register?planId=${plan._id}`);
                        }}
                      >
                        CHOOSE THIS PLAN
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>

      {/* --- Demo Request & Testimonial Section --- */}
      <Box
        id="demo-form"
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: "#fff7f2",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            {/* LEFT IMAGE SIDE */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  scrollSnapType: "x mandatory",
                }}
              >
                <Box
                  component="img"
                  src={fqaimage}
                  alt="ERP Demo"
                  sx={{
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
              </Box>
            </Grid>

            {/* RIGHT FORM SIDE */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 6 },
                  borderRadius: 6,
                  bgcolor: "#ffffff",
                  // Keep every required-field asterisk red, including while focused
                  "& .MuiFormLabel-asterisk": { color: "#d32f2f" },
                  "& .MuiFormLabel-root.Mui-focused .MuiFormLabel-asterisk": {
                    color: "#d32f2f",
                  },
                }}
              >
                <Typography variant="h4" fontWeight={900} gutterBottom>
                  A comprehensive ERP system –{" "}
                  <Box component="span" color="primary.main">
                    Try Free
                  </Box>
                </Typography>

                <Typography variant="body1" color="text.secondary" mb={4}>
                  Fill out the form below and our team will be in touch to
                  schedule your personalized demo.
                </Typography>

                <Grid
                  container
                  spacing={2}
                  component="form"
                  onSubmit={handleDemoSubmit}
                >
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      name="businessName"
                      label="Business name"
                      placeholder="e.g. Tasty Kitchen"
                      value={formData.businessName}
                      onChange={handleFormChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon fontSize="small" />
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
                      label="Email address"
                      placeholder="name@business.com"
                      value={formData.email}
                      onChange={handleFormChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PeopleIcon fontSize="small" />
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
                      label="Phone number"
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
                      onDialCodeChange={(code) => setFormData(prev => ({ ...prev, phonePrefix: code }))}
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
                      inputProps={{ min: new Date().toISOString().split('T')[0] }}
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
                        availableSlots.map(slot => (
                          <MenuItem key={slot} value={slot}>{formatSlotLabel(slot, getEasternTzAbbreviation())}</MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>No slots available</MenuItem>
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
                            sx={{
                              color: "inherit",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            Terms & Conditions
                          </Box>{" "}
                          and{" "}
                          <Box
                            component={Link}
                            to="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: "inherit",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            Privacy Policy
                          </Box>
                        </Typography>
                      }
                    />
                  </Grid>

                  <Grid item xs={12} mt={2}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        boxShadow: "0 8px 18px rgba(255,138,61,0.35)",
                      }}
                    >
                      {loading ? "Sending..." : "Request a Free Demo"}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- Premium Footer --- */}
      <Box sx={{ bgcolor: "#0b0f19", color: "white", py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between">
            {/* Section 1: Logo & About */}
            <Grid item xs={12} md={4}>
              <Box sx={{ pr: { md: 5 } }}>
                <Stack direction="column" alignItems="center" spacing={1} sx={{ mb: 3, width: 'fit-content' }}>
                  <Box
                    component="img"
                    src="/logo.png"
                    alt="NexZen POS"
                    sx={{ height: 55 }}
                  />
                  <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: -0.5 }}>
                    NexZen
                    <Box component="span" color="primary.light" sx={{ ml: 1 }}>
                      POS
                    </Box>
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.6, lineHeight: 1.8 }}
                >
                  Empowering modern dining with intelligent automation,
                  real-time inventory, and seamless payment solutions. Built for
                  restaurants that scale.
                </Typography>
              </Box>
            </Grid>

            {/* Section 2: Product Links */}
            <Grid
              item
              xs={12}
              md={4}
              sx={{ textAlign: { xs: "left", md: "center" } }}
            >
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 3 }}>
                Quick Links
              </Typography>
              <Stack
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.6,
                    cursor: "pointer",
                    "&:hover": { opacity: 1, color: "primary.light" },
                  }}
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Features
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.6,
                    cursor: "pointer",
                    "&:hover": { opacity: 1, color: "primary.light" },
                  }}
                  onClick={() =>
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Pricing
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.6,
                    cursor: "pointer",
                    "&:hover": { opacity: 1, color: "primary.light" },
                  }}
                  onClick={() =>
                    document
                      .getElementById("demo-form")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Request Demo
                </Typography>
              </Stack>
            </Grid>

            {/* Section 3: Contact Info */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ mb: 3 }}
                >
                  Contact Us
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <MapIcon
                    sx={{ color: "primary.main", fontSize: 20, mt: 0.3 }}
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      component="a"
                      href="https://maps.google.com/?q=878+S+Branch+Rd+Building+1,+Unit+1,+Hillsborough+Township,+NJ+08844"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        opacity: 0.7,
                        lineHeight: 1.6,
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { opacity: 1, color: 'primary.light' }
                      }}
                    >
                      878 S Branch Rd Building 1, Unit 1,
                      <br />
                      Hillsborough Township, NJ 08844
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <SmartphoneIcon
                    sx={{ color: "primary.main", fontSize: 20 }}
                  />
                  <Typography
                    variant="body2"
                    component="a"
                    href="tel:+19083138909"
                    sx={{
                      opacity: 0.7,
                      fontWeight: "bold",
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { opacity: 1, color: 'primary.light' }
                    }}
                  >
                    +1 908-313-8909
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <EmailIcon
                    sx={{ color: "primary.main", fontSize: 20 }}
                  />
                  <Typography
                    variant="body2"
                    component="a"
                    href="mailto:contact@nexzenpos.com"
                    sx={{
                      opacity: 0.7,
                      fontWeight: "bold",
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { opacity: 1, color: 'primary.light' }
                    }}
                  >
                    contact@nexzenpos.com
                  </Typography>
                </Stack>
              </Box>
              {/* Social Icons Branded */}
              {/* <Stack direction="row" spacing={2} justifyContent="center">
                                <IconButton size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                                    <FacebookIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                                    <InstagramIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                                    <YelpIcon fontSize="small" />
                                </IconButton>
                            </Stack> */}
            </Grid>
          </Grid>
          <Box
            sx={{
              mt: 4,
              pt: 4,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: { xs: 2, md: 3 },
                textAlign: { xs: "center", md: "left" },
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.65, fontSize: { xs: "0.72rem", sm: "0.8rem" } }}>
                © {new Date().getFullYear()} NexZentek. All rights reserved.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                <Typography
                  variant="caption"
                  component={Link}
                  to="/privacy-policy"
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    opacity: 0.75,
                    fontWeight: 600,
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                    transition: "color 0.2s, opacity 0.2s",
                    "&:hover": {
                      opacity: 1,
                      color: "primary.light",
                    },
                  }}
                >
                  Privacy Policy
                </Typography>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ opacity: 0.35, userSelect: "none" }}
                >
                  |
                </Typography>
                <Typography
                  variant="caption"
                  component={Link}
                  to="/terms-and-conditions"
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    opacity: 0.75,
                    fontWeight: 600,
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                    transition: "color 0.2s, opacity 0.2s",
                    "&:hover": {
                      opacity: 1,
                      color: "primary.light",
                    },
                  }}
                >
                  Terms & Conditions
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8, color: "white", fontSize: { xs: "0.72rem", sm: "0.78rem" } }}>
                Developed by{" "}
                <Box
                  component="a"
                  href="https://nexzentek.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "#818cf8 !important",
                    fontWeight: 800,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline", color: "#a5b4fc !important" },
                  }}
                >
                  NexZenTek
                </Box>
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Global Styles for Animations */}
      <style>
        {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(1.05); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}
      </style>

      {/* --- Custom Success/Error Dialog --- */}
      <Dialog
        open={dialogState.open}
        onClose={() => setDialogState((prev) => ({ ...prev, open: false }))}
        PaperProps={{
          sx: {
            borderRadius: 5,
            p: 2,
            minWidth: { xs: 300, md: 400 },
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
          <Typography variant="h5" fontWeight="900" gutterBottom>
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
            sx={{ borderRadius: 50, fontWeight: "bold", py: 1.5 }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HomePage;
