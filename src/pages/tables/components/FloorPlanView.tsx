import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { floorElementsAPI } from '../../../services/api';
import {
    Box,
    Typography,
    Paper,
    Card,
    Chip,
    Button,
    IconButton,
    Tooltip,
    Stack,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    TextField,
    InputAdornment,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Avatar,
    List,
    ListItem,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TableRestaurant as TableIcon,
    EventSeat as BookIcon,
    CheckCircle as AvailableIcon,
    Block as OccupiedIcon,
    CleaningServices as CleaningIcon,
    ShoppingCart as OrderIcon,
    RestoreFromTrash as RestoreIcon,
    HelpOutline as HelpIcon,
    Tune as CustomizeIcon,
    Save as SaveIcon,
    AutoAwesome as AutoArrangeIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    RestartAlt as ResetZoomIcon,
    AccessTime as TimeIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    MeetingRoom as RoomIcon,
    OpenWith as MoveIcon,
    ViewInAr as ThreeDIcon,
    TableRows as TwoDIcon,
    MeetingRoomOutlined as DoorIcon,
    SoupKitchenOutlined as KitchenIcon,
    LocalBarOutlined as BarIcon,
    WindowOutlined as WindowIcon,
    WcOutlined as RestroomIcon,
    ParkOutlined as PlantIcon,
    Person as PersonIcon,
    ReceiptLong as OrderReceiptIcon,
    Info as InfoIcon,
    QrCode2 as QrCodeIcon,
    DragIndicator as DragHandleIcon,
    RotateRight as RotateRightIcon,
    RotateLeft as RotateLeftIcon,
    SwapHoriz as FlipIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import TableLegendDialog from './TableLegendDialog';

export interface TableItem {
    _id: string;
    tableNumber: string;
    tableName?: string;
    capacity: number;
    location: string;
    section?: string;
    shape?: 'square' | 'rectangle' | 'round';
    rotation?: number;
    status: string;
    coordinates?: { x?: number; y?: number };
    occupiedAt?: string | Date;
    isMerged?: boolean;
    isPrimary?: boolean;
    mergedWith?: string;
    assignedWaiter?: any;
    currentOrder?: any;
    isActive?: boolean;
    isDeleted?: boolean;
    deletedAt?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    seatingMode?: 'standard' | 'communal';
    seatTickets?: Array<{
        seatNumber: number;
        customerName?: string;
        currentOrder?: any;
        seatedAt?: string | Date;
        status?: string;
    }>;
}

export interface FloorElementItem {
    _id: string;
    type: 'door' | 'kitchen_door' | 'bar' | 'window' | 'restroom' | 'wall' | 'column' | 'plant' | 'host_stand';
    label: string;
    section: string;
    coordinates: { x: number; y: number };
    width?: number;
    height?: number;
    visibleToCustomer?: boolean;
}

interface FloorPlanViewProps {
    tables: TableItem[];
    tenantSlug?: string | null;
    customLocations?: string[];
    canDeleteTables?: boolean;
    isMobile?: boolean;
    hiddenSections?: string[];
    mode?: 'admin' | 'customer';
    selectedTableId?: string | null;
    floorElements?: FloorElementItem[];
    onSelectTableForCustomer?: (table: TableItem) => void;
    onOpenBooking?: (table: TableItem) => void;
    onOpenAddTable?: (defaultLocation?: string) => void;
    onOpenAddLocation?: () => void;
    onOpenEditTable?: (table: TableItem) => void;
    onOpenDeleteTable?: (table: TableItem) => void;
    onRestoreTable?: (table: TableItem) => void;
    onOpenDeletedTables?: () => void;
    onQuickStatusChange?: (tableId: string, status: string) => void;
    onOpenHistory?: (tableId: string, title: string) => void;
    onSaveTableCoordinates?: (updatedTables: { _id: string; coordinates: { x: number; y: number }; rotation?: number }[]) => Promise<void>;
    onAddFloorElement?: (element: Omit<FloorElementItem, '_id'>) => Promise<void>;
    highlightedTableId?: string | null;
    onOpenOverdueModal?: () => void;
}

const formatSectionName = (key: string): string => {
    if (!key || key === 'all') return 'All Rooms';
    return key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const getSeatingTimerInfo = (occupiedAt?: string | Date) => {
    if (!occupiedAt) return { text: '< 30m', color: '#EF4444', isAlert: false };
    const start = new Date(occupiedAt).getTime();
    if (isNaN(start)) return { text: '—', color: '#94A3B8', isAlert: false };
    const now = Date.now();
    const diffMins = Math.max(1, Math.floor((now - start) / (1000 * 60)));
    if (diffMins < 45) return { text: `${diffMins}m`, color: '#EF4444', isAlert: false };
    if (diffMins <= 90) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return { text: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, color: '#F59E0B', isAlert: false };
    }
    return { text: '>1h 30m', color: '#DC2626', isAlert: true };
};

// Default Architectural Landmarks (Disabled per preference to display tables only)
const DEFAULT_ARCHITECTURAL_ELEMENTS: FloorElementItem[] = [];

const renderArchitecturalElement = (
    item: FloorElementItem,
    is3D: boolean,
    opts?: {
        elementPositions?: { [id: string]: { x: number; y: number } };
        isCustomizeMode?: boolean;
        draggingElementId?: string | null;
        onDragStart?: (e: React.MouseEvent, id: string) => void;
        onTouchStart?: (e: React.TouchEvent, id: string) => void;
        onContextMenu?: (e: React.MouseEvent, item: FloorElementItem) => void;
        onDeleteElement?: (id: string, label: string) => void;
    }
) => {
    const w = item.width || 80;
    const h = item.height || 35;

    let icon: React.ReactNode = <DoorIcon sx={{ fontSize: 17 }} />;
    let bgColor = '#F1F5F9';
    let borderColor = '#64748B';
    let textColor = '#334155';

    switch (item.type) {
        case 'door':
            icon = <DoorIcon sx={{ fontSize: 17, color: '#3B82F6' }} />;
            bgColor = '#EFF6FF'; borderColor = '#3B82F6'; textColor = '#1D4ED8';
            break;
        case 'kitchen_door':
            icon = null;
            bgColor = '#FFF7ED'; borderColor = '#F97316'; textColor = '#C2410C';
            break;
        case 'bar':
            icon = <BarIcon sx={{ fontSize: 18, color: '#D97706' }} />;
            bgColor = '#FEF3C7'; borderColor = '#D97706'; textColor = '#92400E';
            break;
        case 'window':
            icon = <WindowIcon sx={{ fontSize: 17, color: '#06B6D4' }} />;
            bgColor = '#ECFEFF'; borderColor = '#06B6D4'; textColor = '#0891B2';
            break;
        case 'restroom':
            icon = <RestroomIcon sx={{ fontSize: 17, color: '#8B5CF6' }} />;
            bgColor = '#F5F3FF'; borderColor = '#8B5CF6'; textColor = '#6D28D9';
            break;
        case 'plant':
            icon = <PlantIcon sx={{ fontSize: 17, color: '#10B981' }} />;
            bgColor = '#ECFDF5'; borderColor = '#10B981'; textColor = '#047857';
            break;
        default:
            break;
    }

    const depth = is3D ? 4 : 0;
    const isCustomize = Boolean(opts?.isCustomizeMode);
    const currentCoords = (opts?.elementPositions && opts.elementPositions[item._id]) || item.coordinates;

    return (
        <Box
            key={item._id}
            onMouseDown={(e) => opts?.onDragStart && opts.onDragStart(e, item._id)}
            onTouchStart={(e) => opts?.onTouchStart && opts.onTouchStart(e, item._id)}
            onContextMenu={(e) => opts?.onContextMenu && opts.onContextMenu(e, item)}
            onClick={(e) => {
                if (isCustomize && opts?.onContextMenu) {
                    opts.onContextMenu(e, item);
                }
            }}
            sx={{
                position: 'absolute',
                left: currentCoords.x,
                top: currentCoords.y,
                width: w,
                height: h,
                zIndex: isCustomize ? 12 : 1,
                bgcolor: bgColor,
                border: `2px ${isCustomize ? 'solid' : 'dashed'} ${borderColor}`,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                px: 1,
                boxShadow: is3D
                    ? `${depth}px ${depth + 2}px 0 ${alpha(borderColor, 0.3)}, 0 4px 10px rgba(0,0,0,0.08)`
                    : (isCustomize ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'),
                pointerEvents: 'auto',
                cursor: isCustomize ? (opts?.draggingElementId === item._id ? 'grabbing' : 'grab') : 'pointer',
                userSelect: 'none',
                transition: opts?.draggingElementId === item._id ? 'none' : 'all 0.1s ease',
            }}
        >
            {icon}
            <Typography variant="caption" fontWeight={900} sx={{ fontSize: '0.7rem', color: textColor, whiteSpace: 'nowrap' }}>
                {item.type === 'kitchen_door' ? (item.label || '').replace(/[\u{1F300}-\u{1F9FF}]|🍳/gu, '').trim() || 'Kitchen Pickup' : item.label}
            </Typography>
        </Box>
    );
};

// ─────────────────────────────────────────────
// Dining Chair Component
// ─────────────────────────────────────────────
interface DiningChairProps {
    side: 'top' | 'bottom' | 'left' | 'right';
    positionPercent: number;
    accentColor: string;
    is3D: boolean;
}

const DiningChair: React.FC<DiningChairProps> = ({ side, positionPercent, accentColor, is3D }) => {
    const depth = is3D ? 3 : 0;

    if (side === 'top') return (
        <Box sx={{
            position: 'absolute',
            top: -12,
            left: `${positionPercent}%`,
            transform: 'translateX(-50%)',
            width: 22,
            height: 11,
            borderRadius: '5px 5px 2px 2px',
            bgcolor: '#FFFFFF',
            border: `1.5px solid ${accentColor}`,
            boxShadow: is3D ? `${depth}px ${depth + 2}px 0 ${alpha(accentColor, 0.4)}, 0 4px 8px rgba(0,0,0,0.12)` : '0 2px 4px rgba(0,0,0,0.08)',
            zIndex: 1,
            pointerEvents: 'none',
            '&::before': { content: '""', position: 'absolute', top: -3, left: '15%', right: '15%', height: 3, borderRadius: '3px 3px 0 0', bgcolor: accentColor },
        }} />
    );

    if (side === 'bottom') return (
        <Box sx={{
            position: 'absolute',
            bottom: -12,
            left: `${positionPercent}%`,
            transform: 'translateX(-50%)',
            width: 22,
            height: 11,
            borderRadius: '2px 2px 5px 5px',
            bgcolor: '#FFFFFF',
            border: `1.5px solid ${accentColor}`,
            boxShadow: is3D ? `${depth}px ${depth + 2}px 0 ${alpha(accentColor, 0.4)}, 0 4px 8px rgba(0,0,0,0.12)` : '0 2px 4px rgba(0,0,0,0.08)',
            zIndex: 1,
            pointerEvents: 'none',
            '&::after': { content: '""', position: 'absolute', bottom: -3, left: '15%', right: '15%', height: 3, borderRadius: '0 0 3px 3px', bgcolor: accentColor },
        }} />
    );

    if (side === 'left') return (
        <Box sx={{
            position: 'absolute',
            left: -12,
            top: `${positionPercent}%`,
            transform: 'translateY(-50%)',
            width: 11,
            height: 22,
            borderRadius: '5px 2px 2px 5px',
            bgcolor: '#FFFFFF',
            border: `1.5px solid ${accentColor}`,
            boxShadow: is3D ? `${depth}px ${depth + 2}px 0 ${alpha(accentColor, 0.4)}, 0 4px 8px rgba(0,0,0,0.12)` : '0 2px 4px rgba(0,0,0,0.08)',
            zIndex: 1,
            pointerEvents: 'none',
            '&::before': { content: '""', position: 'absolute', left: -3, top: '15%', bottom: '15%', width: 3, borderRadius: '3px 0 0 3px', bgcolor: accentColor },
        }} />
    );

    return (
        <Box sx={{
            position: 'absolute',
            right: -12,
            top: `${positionPercent}%`,
            transform: 'translateY(-50%)',
            width: 11,
            height: 22,
            borderRadius: '2px 5px 5px 2px',
            bgcolor: '#FFFFFF',
            border: `1.5px solid ${accentColor}`,
            boxShadow: is3D ? `${depth}px ${depth + 2}px 0 ${alpha(accentColor, 0.4)}, 0 4px 8px rgba(0,0,0,0.12)` : '0 2px 4px rgba(0,0,0,0.08)',
            zIndex: 1,
            pointerEvents: 'none',
            '&::after': { content: '""', position: 'absolute', right: -3, top: '15%', bottom: '15%', width: 3, borderRadius: '0 3px 3px 0', bgcolor: accentColor },
        }} />
    );
};

// ─────────────────────────────────────────────
// REALISTIC RESTAURANT DINING SEATING FORMULA
// • Max 1 chair at Left Head of Table
// • Max 1 chair at Right Foot of Table
// • All other chairs evenly spaced along Top & Bottom long edges!
// ─────────────────────────────────────────────
const renderDynamicChairs = (
    capacity: number,
    shape: string = 'rectangle',
    accentColor: string,
    is3D: boolean,
    guestCount: number = 0,
    isCommunalMode: boolean = false
) => {
    const cap = Math.max(2, capacity || 2);
    const chairs: React.ReactNode[] = [];

    let chairIdx = 0;
    const getChairColor = () => {
        if (isCommunalMode && guestCount > 0) {
            const color = chairIdx < guestCount ? '#EF4444' : '#10B981';
            chairIdx++;
            return color;
        }
        return accentColor;
    };

    if (shape === 'round') {
        const perSide = Math.floor(cap / 4);
        const remainder = cap % 4;
        const topCount = perSide + (remainder > 0 ? 1 : 0);
        const bottomCount = perSide + (remainder > 1 ? 1 : 0);
        const leftCount = perSide + (remainder > 2 ? 1 : 0);
        const rightCount = perSide;

        for (let i = 0; i < topCount; i++) {
            const pct = topCount === 1 ? 50 : 15 + (i / (topCount - 1)) * 70;
            chairs.push(<DiningChair key={`t${i}`} side="top" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />);
        }
        for (let i = 0; i < bottomCount; i++) {
            const pct = bottomCount === 1 ? 50 : 15 + (i / (bottomCount - 1)) * 70;
            chairs.push(<DiningChair key={`b${i}`} side="bottom" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />);
        }
        for (let i = 0; i < leftCount; i++) {
            const pct = leftCount === 1 ? 50 : 15 + (i / (leftCount - 1)) * 70;
            chairs.push(<DiningChair key={`l${i}`} side="left" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />);
        }
        for (let i = 0; i < rightCount; i++) {
            const pct = rightCount === 1 ? 50 : 15 + (i / (rightCount - 1)) * 70;
            chairs.push(<DiningChair key={`r${i}`} side="right" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />);
        }
        return chairs;
    }

    const hasHead = cap > 4 ? 1 : 0;
    const hasFoot = cap > 5 ? 1 : 0;
    const remaining = cap - (hasHead + hasFoot);

    const topCount = Math.ceil(remaining / 2);
    const bottomCount = Math.floor(remaining / 2);

    if (hasHead > 0) {
        chairs.push(<DiningChair key="head-left" side="left" positionPercent={50} accentColor={getChairColor()} is3D={is3D} />);
    }
    if (hasFoot > 0) {
        chairs.push(<DiningChair key="foot-right" side="right" positionPercent={50} accentColor={getChairColor()} is3D={is3D} />);
    }

    const getSpacing = (count: number) => {
        if (count === 1) return [50];
        if (count === 2) return [30, 70];
        if (count === 3) return [20, 50, 80];
        if (count === 4) return [16, 38, 62, 84];
        return Array.from({ length: count }, (_, i) => 12 + (i / (count - 1)) * 76);
    };

    getSpacing(topCount).forEach((pct, i) =>
        chairs.push(<DiningChair key={`top-${i}`} side="top" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />)
    );
    getSpacing(bottomCount).forEach((pct, i) =>
        chairs.push(<DiningChair key={`bot-${i}`} side="bottom" positionPercent={pct} accentColor={getChairColor()} is3D={is3D} />)
    );

    return chairs;
};

// Dynamic table dimension calculation (expands table width for larger capacities)
const getTableDimensions = (capacity: number, isRound: boolean) => {
    const cap = capacity || 4;
    if (isRound) {
        if (cap <= 4) return { w: 84, h: 84 };
        if (cap <= 8) return { w: 100, h: 100 };
        return { w: 120, h: 120 };
    }

    const hasHead = cap > 4 ? 1 : 0;
    const hasFoot = cap > 5 ? 1 : 0;
    const remaining = cap - (hasHead + hasFoot);
    const topCount = Math.ceil(remaining / 2);

    if (topCount <= 2) return { w: 112, h: 76 };
    if (topCount === 3) return { w: 154, h: 80 };
    if (topCount === 4) return { w: 196, h: 84 };
    if (topCount === 5) return { w: 238, h: 88 };
    return { w: 110 + (topCount * 30), h: 92 };
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const FloorPlanView: React.FC<FloorPlanViewProps> = ({
    tables,
    tenantSlug,
    customLocations = [],
    canDeleteTables = false,
    isMobile = false,
    hiddenSections = [],
    mode = 'admin',
    selectedTableId = null,
    floorElements = [],
    onSelectTableForCustomer,
    onOpenBooking,
    onOpenAddTable,
    onOpenAddLocation,
    onOpenEditTable,
    onOpenDeleteTable,
    onRestoreTable,
    onOpenDeletedTables,
    onQuickStatusChange,
    onOpenHistory,
    onSaveTableCoordinates,
    onAddFloorElement,
    highlightedTableId,
    onOpenOverdueModal,
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isCustomerMode = mode === 'customer';

    const [isCustomizeMode, setIsCustomizeMode] = useState<boolean>(false);
    const [deletedElementIds, setDeletedElementIds] = useState<string[]>([]);

    const activeFloorElements = useMemo<FloorElementItem[]>(() => {
        const dbElems = floorElements || [];
        return dbElems.filter((e: FloorElementItem) => !deletedElementIds.includes(e._id));
    }, [floorElements, deletedElementIds]);

    const isValidRoom = (s: string) => {
        if (!s || typeof s !== 'string') return false;
        const cleaned = s.trim().toLowerCase();
        if (cleaned.length < 2 || cleaned.length > 30) return false;
        return !/^(sdh|asdf|qwer|zxcv|junk)$/i.test(cleaned);
    };
    const canonicalizeRoomKey = (name: string): string => {
        if (!name || typeof name !== 'string') return '';
        return name.trim().toLowerCase().replace(/[\s_\-]+/g, '');
    };
    const getEffectiveRoom = (t: { section?: string; location?: string }) => {
        const raw = (t?.section || t?.location || 'indoor').toLowerCase();
        return isValidRoom(raw) ? raw : 'indoor';
    };

    const sections = useMemo(() => {
        const BASE_ROOMS = ['indoor', 'outdoor', 'private_room', 'bar'];
        const map = new Map<string, string>();
        BASE_ROOMS.forEach(r => map.set(canonicalizeRoomKey(r), r.toLowerCase().trim()));
        tables.forEach(t => {
            const eff = getEffectiveRoom(t);
            const canon = canonicalizeRoomKey(eff);
            if (isValidRoom(eff) && !map.has(canon)) {
                map.set(canon, eff);
            }
        });
        customLocations.forEach(loc => {
            const norm = loc.trim().toLowerCase();
            const canon = canonicalizeRoomKey(norm);
            if (norm && isValidRoom(norm) && !map.has(canon)) {
                map.set(canon, norm);
            }
        });
        const allSecs = Array.from(map.values()).filter(isValidRoom);
        if (allSecs.length === 0) allSecs.push('indoor');
        if (hiddenSections && hiddenSections.length > 0 && !isCustomizeMode) {
            return allSecs.filter(s => !hiddenSections.some(h => canonicalizeRoomKey(h) === canonicalizeRoomKey(s)));
        }
        return allSecs;
    }, [tables, customLocations, hiddenSections, isCustomizeMode]);

    const [activeSection, setActiveSection]       = useState<string>(() => sections.length > 0 ? sections[0] : 'indoor');

    useEffect(() => {
        if (highlightedTableId) {
            const target = tables.find(t => t._id === highlightedTableId);
            if (target) {
                const eff = getEffectiveRoom(target);
                if (eff) {
                    setActiveSection(eff);
                }
            }
        }
    }, [highlightedTableId, tables]);

    const [searchQuery, setSearchQuery]           = useState<string>('');
    const [tablePositions, setTablePositions]     = useState<{ [id: string]: { x: number; y: number } }>({});
    const [tableRotations, setTableRotations]     = useState<{ [id: string]: number }>({});
    const [elementPositions, setElementPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
    const [customRoomHeight, setCustomRoomHeight] = useState<number>(660);
    const [isSavingLayout, setIsSavingLayout]     = useState(false);
    const [, setHasUnsavedChanges]                = useState(false);
    const [canvasFilter, setCanvasFilter]         = useState<'all' | 'available' | 'occupied' | 'cleaning' | 'long_seating'>('all');
    const [legendOpen, setLegendOpen]             = useState<boolean>(false);
    const [zoomLevel, setZoomLevel]               = useState<number>(1);
    const [is3DMode, setIs3DMode]                 = useState<boolean>(true);
    const [roomSwitchToast, setRoomSwitchToast]   = useState<string | null>(null);
    const [elementMenuAnchorEl, setElementMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [contextMenu, setContextMenu]           = useState<{ mouseX: number; mouseY: number; table: TableItem | null } | null>(null);
    const [elementContextMenu, setElementContextMenu] = useState<{ mouseX: number; mouseY: number; element: FloorElementItem | null } | null>(null);
    const [deleteElementConfirm, setDeleteElementConfirm] = useState<{ id: string; label: string } | null>(null);
    const [selectedTableDetails, setSelectedTableDetails] = useState<TableItem | null>(null);
    const [qrCodeDialogTable, setQrCodeDialogTable] = useState<TableItem | null>(null);
    const [draggingTableId, setDraggingTableId]   = useState<string | null>(null);
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const canvasRef     = useRef<HTMLDivElement>(null);
    const [, setTick]   = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const currentSectionTables = useMemo(() => {
        let list = tables.filter(t => !t.isDeleted && t.isActive !== false);
        if (activeSection !== 'all') {
            list = list.filter(t => getEffectiveRoom(t) === activeSection.toLowerCase());
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(t =>
                (t.tableNumber && t.tableNumber.toLowerCase().includes(q)) ||
                (t.tableName   && t.tableName.toLowerCase().includes(q)) ||
                (t.section     && t.section.toLowerCase().includes(q)) ||
                (t.location    && t.location.toLowerCase().includes(q)) ||
                (t.status      && t.status.toLowerCase().includes(q))
            );
        }
        return list;
    }, [tables, activeSection, searchQuery]);

    const filterCounts = useMemo(() => {
        const all = currentSectionTables.length;
        const available = currentSectionTables.filter(t => (t.status || 'available').toLowerCase() === 'available' && !t.isDeleted && t.isActive !== false).length;
        const occupied = currentSectionTables.filter(t => (t.status || '').toLowerCase() === 'occupied' && !t.isDeleted && t.isActive !== false).length;
        const cleaning = currentSectionTables.filter(t => (t.status || '').toLowerCase() === 'cleaning' && !t.isDeleted && t.isActive !== false).length;
        const longSeating = currentSectionTables.filter(t => {
            if ((t.status || '').toLowerCase() !== 'occupied' || t.isDeleted || t.isActive === false) return false;
            const dt = t.occupiedAt || t.currentOrder?.createdAt || t.updatedAt;
            if (!dt) return false;
            const mins = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
            return mins >= 90;
        }).length;
        return { all, available, occupied, cleaning, longSeating };
    }, [currentSectionTables]);

    const isMatchingFilter = (table: TableItem) => {
        if (canvasFilter === 'all') return true;
        const st = (table.status || 'available').toLowerCase();
        if (canvasFilter === 'available') return st === 'available';
        if (canvasFilter === 'occupied') return st === 'occupied';
        if (canvasFilter === 'cleaning') return st === 'cleaning';
        if (canvasFilter === 'long_seating') {
            if (st !== 'occupied') return false;
            const dt = table.occupiedAt || table.currentOrder?.createdAt || table.updatedAt;
            if (!dt) return false;
            const mins = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
            return mins >= 90;
        }
        return true;
    };

    const handleRotateTable = (tableId: string, degreesDelta: number = 90, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setTableRotations(prev => {
            const current = prev[tableId] ?? (tables.find(t => t._id === tableId)?.rotation || 0);
            const next = ((current + degreesDelta) % 360 + 360) % 360;
            return { ...prev, [tableId]: next };
        });
        setHasUnsavedChanges(true);
        toast.success(`Rotated table ${degreesDelta > 0 ? '+' : ''}${degreesDelta}°`);
    };

    const handleSetTableRotation = (tableId: string, degrees: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const normalized = ((degrees % 360) + 360) % 360;
        setTableRotations(prev => ({ ...prev, [tableId]: normalized }));
        setHasUnsavedChanges(true);
        toast.success(`Table set to ${normalized}°${normalized === 180 ? ' (Completely Reversed)' : (normalized === 0 ? ' (Default)' : '')}`);
    };

    const dynamicCanvasWidth = useMemo(() => {
        let maxX = 1200;
        currentSectionTables.forEach(table => {
            const pos = tablePositions[table._id] || { x: 45, y: 75 };
            const isRound = table.shape === 'round';
            const rot = tableRotations[table._id] ?? table.rotation ?? 0;
            const isRotated90or270 = rot === 90 || rot === 270;
            const dims = getTableDimensions(table.capacity, isRound);
            const w = isRotated90or270 ? dims.h : dims.w;
            const rightEdge = pos.x + w + 140;
            if (rightEdge > maxX) {
                maxX = rightEdge;
            }
        });
        return Math.max(maxX, 1500);
    }, [currentSectionTables, tablePositions, tableRotations]);

    const dynamicCanvasHeight = useMemo(() => {
        let maxY = 540;
        currentSectionTables.forEach(table => {
            const pos = tablePositions[table._id] || { x: 45, y: 75 };
            const isRound = table.shape === 'round';
            const rot = tableRotations[table._id] ?? table.rotation ?? 0;
            const isRotated90or270 = rot === 90 || rot === 270;
            const dims = getTableDimensions(table.capacity, isRound);
            const h = isRotated90or270 ? dims.w : dims.h;
            const bottomEdge = pos.y + h + 110;
            if (bottomEdge > maxY) {
                maxY = bottomEdge;
            }
        });
        return Math.max(maxY, customRoomHeight);
    }, [currentSectionTables, tablePositions, tableRotations, customRoomHeight]);

    const handleAddLandmarkElement = (type: string, label: string) => {
        setElementMenuAnchorEl(null);
        let defaultCoords = { x: 740, y: 15 };
        if (type === 'window') defaultCoords = { x: 920, y: 120 };
        else if (type === 'bar') defaultCoords = { x: 45, y: 560 };
        else if (type === 'door') defaultCoords = { x: 45, y: 15 };
        else if (type === 'restroom') defaultCoords = { x: 740, y: 560 };

        const newElem: FloorElementItem = {
            _id: `elem-${Date.now()}`,
            type: type as any,
            label,
            section: activeSection === 'all' ? 'indoor' : activeSection,
            coordinates: defaultCoords,
            width: type === 'window' ? 18 : (type === 'bar' ? 180 : 100),
            height: type === 'window' ? 150 : 35,
        };
        if (onAddFloorElement) {
            onAddFloorElement({
                type: newElem.type,
                label: newElem.label,
                section: newElem.section,
                coordinates: newElem.coordinates,
                width: newElem.width,
                height: newElem.height,
            });
        }
        toast.success(`Added "${label}" to floor map`);
    };

    const handleDeleteLandmarkElement = async (elemId: string, label: string) => {
        try {
            if (!elemId.startsWith('elem-')) {
                await floorElementsAPI.remove(elemId).catch(() => null);
            }
            setDeletedElementIds(prev => [...prev, elemId]);
            toast.success(`Deleted "${label}" from floor map`);
            setElementPositions(prev => {
                const next = { ...prev };
                delete next[elemId];
                return next;
            });
        } catch (err) {
            setDeletedElementIds(prev => [...prev, elemId]);
            toast.success(`Removed "${label}"`);
        }
    };

    const currentSectionElements = useMemo<FloorElementItem[]>(() => [], []);

    useEffect(() => {
        setCustomRoomHeight(660);
    }, [activeSection]);

    useEffect(() => {
        if (activeSection !== 'all' && !sections.includes(activeSection.toLowerCase())) {
            setActiveSection(sections[0] || 'indoor');
        }
    }, [sections, activeSection]);

    // Grid calculations start cleanly at y = 90 to prevent overlap with top landmark banners
    useEffect(() => {
        const pos: { [id: string]: { x: number; y: number } } = {};
        const rots: { [id: string]: number } = {};
        const COLS = isMobile ? 2 : 4;
        currentSectionTables.forEach((table, index) => {
            rots[table._id] = table.rotation || 0;
            if (table.coordinates && typeof table.coordinates.x === 'number' && typeof table.coordinates.y === 'number') {
                pos[table._id] = { x: table.coordinates.x, y: table.coordinates.y };
            } else {
                const { w, h } = getTableDimensions(table.capacity, table.shape === 'round');
                const GAP_X = 65, GAP_Y = 65;
                const col = index % COLS;
                const row = Math.floor(index / COLS);
                pos[table._id] = { x: 50 + col * (w + GAP_X), y: 90 + row * (h + GAP_Y) };
            }
        });
        setTablePositions(pos);
        setTableRotations(rots);
    }, [currentSectionTables, isMobile]);

    const handleDragStart = (e: React.MouseEvent, tableId: string) => {
        if (!isCustomizeMode || isCustomerMode) return;
        e.preventDefault();
        const currentPos = tablePositions[tableId] || { x: 45, y: 75 };
        dragOffsetRef.current = { x: e.clientX - currentPos.x * zoomLevel, y: e.clientY - currentPos.y * zoomLevel };
        setDraggingTableId(tableId);
    };

    const handleTouchStart = (e: React.TouchEvent, tableId: string) => {
        if (!isCustomizeMode || isCustomerMode || e.touches.length === 0) return;
        const touch = e.touches[0];
        const currentPos = tablePositions[tableId] || { x: 45, y: 75 };
        dragOffsetRef.current = { x: touch.clientX - currentPos.x * zoomLevel, y: touch.clientY - currentPos.y * zoomLevel };
        setDraggingTableId(tableId);
    };

    const handleElementDragStart = (e: React.MouseEvent, elemId: string) => {
        if (!isCustomizeMode || isCustomerMode) return;
        e.preventDefault();
        e.stopPropagation();
        const elem = currentSectionElements.find((item: FloorElementItem) => item._id === elemId);
        const currentPos = elementPositions[elemId] || elem?.coordinates || { x: 50, y: 50 };
        dragOffsetRef.current = { x: e.clientX - currentPos.x * zoomLevel, y: e.clientY - currentPos.y * zoomLevel };
        setDraggingElementId(elemId);
    };

    const handleElementTouchStart = (e: React.TouchEvent, elemId: string) => {
        if (!isCustomizeMode || isCustomerMode || e.touches.length === 0) return;
        e.stopPropagation();
        const touch = e.touches[0];
        const elem = currentSectionElements.find((item: FloorElementItem) => item._id === elemId);
        const currentPos = elementPositions[elemId] || elem?.coordinates || { x: 50, y: 50 };
        dragOffsetRef.current = { x: touch.clientX - currentPos.x * zoomLevel, y: touch.clientY - currentPos.y * zoomLevel };
        setDraggingElementId(elemId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isCustomizeMode || isCustomerMode) return;
        const availableWidth = canvasRef.current ? (canvasRef.current.clientWidth / zoomLevel) : 1050;
        if (draggingTableId) {
            const rawX = Math.round((e.clientX - dragOffsetRef.current.x) / zoomLevel / 10) * 10;
            const rawY = Math.round((e.clientY - dragOffsetRef.current.y) / zoomLevel / 10) * 10;
            const draggingTable = currentSectionTables.find(t => t._id === draggingTableId);
            const isRound = draggingTable?.shape === 'round';
            const rot = tableRotations[draggingTableId] ?? draggingTable?.rotation ?? 0;
            const isRotated90or270 = rot === 90 || rot === 270;
            const dims = getTableDimensions(draggingTable?.capacity || 4, isRound);
            const tableWidth = isRotated90or270 ? dims.h : dims.w;
            const tableHeight = isRotated90or270 ? dims.w : dims.h;

            const minX = 35;
            const maxX = Math.max(minX, availableWidth - tableWidth - 45);
            const minY = 40;
            const maxY = Math.max(minY, dynamicCanvasHeight - tableHeight - 20);

            const clampedX = Math.min(Math.max(minX, rawX), maxX);
            const clampedY = Math.min(Math.max(minY, rawY), maxY);
            setTablePositions(prev => ({ ...prev, [draggingTableId]: { x: clampedX, y: clampedY } }));
            setHasUnsavedChanges(true);
        } else if (draggingElementId) {
            const rawX = Math.round((e.clientX - dragOffsetRef.current.x) / zoomLevel / 10) * 10;
            const rawY = Math.round((e.clientY - dragOffsetRef.current.y) / zoomLevel / 10) * 10;
            const clampedX = Math.min(Math.max(35, rawX), availableWidth - 100);
            const clampedY = Math.min(Math.max(40, rawY), Math.max(40, dynamicCanvasHeight - 50));
            setElementPositions(prev => ({ ...prev, [draggingElementId]: { x: clampedX, y: clampedY } }));
            setHasUnsavedChanges(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isCustomizeMode || isCustomerMode || e.touches.length === 0) return;
        const touch = e.touches[0];
        const availableWidth = canvasRef.current ? (canvasRef.current.clientWidth / zoomLevel) : 1050;
        if (draggingTableId) {
            const rawX = Math.round((touch.clientX - dragOffsetRef.current.x) / zoomLevel / 10) * 10;
            const rawY = Math.round((touch.clientY - dragOffsetRef.current.y) / zoomLevel / 10) * 10;
            const draggingTable = currentSectionTables.find(t => t._id === draggingTableId);
            const isRound = draggingTable?.shape === 'round';
            const rot = tableRotations[draggingTableId] ?? draggingTable?.rotation ?? 0;
            const isRotated90or270 = rot === 90 || rot === 270;
            const dims = getTableDimensions(draggingTable?.capacity || 4, isRound);
            const tableWidth = isRotated90or270 ? dims.h : dims.w;
            const tableHeight = isRotated90or270 ? dims.w : dims.h;

            const minX = 35;
            const maxX = Math.max(minX, availableWidth - tableWidth - 45);
            const minY = 40;
            const maxY = Math.max(minY, dynamicCanvasHeight - tableHeight - 20);

            const clampedX = Math.min(Math.max(minX, rawX), maxX);
            const clampedY = Math.min(Math.max(minY, rawY), maxY);
            setTablePositions(prev => ({ ...prev, [draggingTableId]: { x: clampedX, y: clampedY } }));
            setHasUnsavedChanges(true);
        } else if (draggingElementId) {
            const rawX = Math.round((touch.clientX - dragOffsetRef.current.x) / zoomLevel / 10) * 10;
            const rawY = Math.round((touch.clientY - dragOffsetRef.current.y) / zoomLevel / 10) * 10;
            const clampedX = Math.min(Math.max(35, rawX), availableWidth - 100);
            const clampedY = Math.min(Math.max(40, rawY), Math.max(40, dynamicCanvasHeight - 50));
            setElementPositions(prev => ({ ...prev, [draggingElementId]: { x: clampedX, y: clampedY } }));
            setHasUnsavedChanges(true);
        }
    };

    const handleDragEnd = () => {
        if (draggingTableId) setDraggingTableId(null);
        if (draggingElementId) setDraggingElementId(null);
    };

    const handleAutoArrange = () => {
        const pos: { [id: string]: { x: number; y: number } } = {};
        const sorted = [...currentSectionTables].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
        let currentX = 45;
        let currentY = 85;
        let rowMaxHeight = 0;
        const availableWidth = canvasRef.current ? (canvasRef.current.clientWidth / zoomLevel) : 1050;
        const MAX_CANVAS_WIDTH = Math.max(700, availableWidth - 80);
        const GAP_X = 65;
        const GAP_Y = 65;

        sorted.forEach((table) => {
            const { w, h } = getTableDimensions(table.capacity, table.shape === 'round');
            if (currentX > 45 && (currentX + w > MAX_CANVAS_WIDTH)) {
                currentX = 45;
                currentY += rowMaxHeight + GAP_Y;
                rowMaxHeight = 0;
            }
            pos[table._id] = { x: currentX, y: currentY };
            currentX += w + GAP_X;
            if (h > rowMaxHeight) rowMaxHeight = h;
        });
        setTablePositions(pos);
        const requiredHeight = currentY + rowMaxHeight + 130;
        setCustomRoomHeight(Math.max(660, requiredHeight));
        setHasUnsavedChanges(true);
    };

    const handleSaveLayout = async () => {
        if (!onSaveTableCoordinates) { setIsCustomizeMode(false); setHasUnsavedChanges(false); return; }
        try {
            setIsSavingLayout(true);
            const validTableIds = new Set(tables.filter(t => t.isActive !== false).map(t => t._id));
            const updates = Object.entries(tablePositions)
                .filter(([id]) => validTableIds.has(id))
                .map(([id, coords]) => ({
                    _id: id,
                    coordinates: coords,
                    rotation: tableRotations[id] ?? tables.find(t => t._id === id)?.rotation ?? 0,
                }));
            await onSaveTableCoordinates(updates);

            // Save moved doors, windows, bar counters, restrooms coordinates to MongoDB
            const elemEntries = Object.entries(elementPositions);
            if (elemEntries.length > 0) {
                await Promise.all(
                    elemEntries.map(async ([id, coords]) => {
                        if (id.startsWith('elem-')) {
                            const elem = activeFloorElements.find((e: FloorElementItem) => e._id === id);
                            if (elem) {
                                await floorElementsAPI.create({
                                    type: elem.type,
                                    label: elem.label,
                                    section: elem.section || activeSection,
                                    coordinates: coords,
                                    width: elem.width,
                                    height: elem.height,
                                }).catch(() => null);
                            }
                        } else {
                            await floorElementsAPI.update(id, { coordinates: coords }).catch(() => null);
                        }
                    })
                );
            }

            setHasUnsavedChanges(false);
            setIsCustomizeMode(false);
        } catch (error) {
            console.error('Error saving floor layout:', error);
            toast.error('Failed to save floor layout');
        } finally {
            setIsSavingLayout(false);
        }
    };

    const handleTableClick = (table: TableItem) => {
        if (isCustomizeMode) return;
        if (isCustomerMode) {
            if (table.status === 'occupied' || table.status === 'cleaning' || table.isActive === false) return;
            if (onSelectTableForCustomer) onSelectTableForCustomer(table);
            return;
        }
        if (table.isActive === false) { if (onRestoreTable) onRestoreTable(table); return; }
        setSelectedTableDetails(table);
    };

    const handleContextMenu = (e: React.MouseEvent, table: TableItem) => {
        if (isCustomerMode) return;
        e.preventDefault(); e.stopPropagation();
        setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 6, table });
    };

    const handleCloseContextMenu = () => setContextMenu(null);

    const handleSectionSwitch = (section: string) => {
        if (isCustomizeMode && activeSection !== section) {
            setRoomSwitchToast(`Move Mode: Now editing "${formatSectionName(section)}" - Save layout when done.`);
        }
        setActiveSection(section);
    };

    return (
        <Box sx={{ width: '100%', pb: 3 }}>
            {/* ── ROW 1: ROOM SELECTION TABS & ADD TABLE ── */}
            <Box sx={{ mb: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                {/* LEFT: ROOM SELECTION TABS */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', flex: 1, minWidth: 0, pb: 0.5, '::-webkit-scrollbar': { height: 4 } }}>
                    {sections.map(section => {
                        const isActive = activeSection === section;
                        const count = tables.filter(t => !t.isDeleted && t.isActive !== false && canonicalizeRoomKey(getEffectiveRoom(t)) === canonicalizeRoomKey(section)).length;
                        return (
                            <Box key={section} onClick={() => handleSectionSwitch(section)} sx={{
                                px: 1.8, py: 0.6, borderRadius: 2.5, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                                bgcolor: isActive ? 'primary.main' : '#FFFFFF', color: isActive ? '#FFFFFF' : 'text.primary',
                                border: '1.5px solid', borderColor: isActive ? 'primary.main' : 'divider',
                                boxShadow: isActive ? '0 3px 10px rgba(99, 102, 241, 0.25)' : 'none',
                                transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 0.6, flexShrink: 0,
                                '&:hover': { borderColor: 'primary.main' },
                            }}>
                                <span>{formatSectionName(section)}</span>
                                <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)', color: isActive ? '#FFFFFF' : 'text.secondary' }} />
                            </Box>
                        );
                    })}
                </Box>
                {onOpenAddTable && !isCustomerMode && (
                    <Box onClick={() => onOpenAddTable && onOpenAddTable(activeSection)} sx={{
                        px: 1.5, py: 0.6, borderRadius: 2.5, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                        bgcolor: 'primary.main', color: '#FFFFFF',
                        border: '1.5px solid', borderColor: 'primary.main',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
                        '&:hover': { bgcolor: 'primary.dark' },
                    }}>
                        <AddIcon sx={{ fontSize: 16 }} />
                        <span>Add Table</span>
                    </Box>
                )}
            </Box>

            {/* ── ROW 2: STATUS FILTER PILLS (LEFT) & ACTION TOOLS (RIGHT) ── */}
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                {/* LEFT: STATUS FILTER PILLS */}
                {!isCustomerMode && currentSectionTables.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, overflowX: 'auto', pb: 0.25 }}>
                        <Chip
                            label={`All (${filterCounts.all})`}
                            size="small"
                            color={canvasFilter === 'all' ? 'primary' : 'default'}
                            variant={canvasFilter === 'all' ? 'filled' : 'outlined'}
                            onClick={() => setCanvasFilter('all')}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 26, cursor: 'pointer' }}
                        />
                        <Chip
                            label={`🟢 Available (${filterCounts.available})`}
                            size="small"
                            color={canvasFilter === 'available' ? 'success' : 'default'}
                            variant={canvasFilter === 'available' ? 'filled' : 'outlined'}
                            onClick={() => setCanvasFilter('available')}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 26, cursor: 'pointer' }}
                        />
                        <Chip
                            label={`🟣 Occupied (${filterCounts.occupied})`}
                            size="small"
                            color={canvasFilter === 'occupied' ? 'primary' : 'default'}
                            variant={canvasFilter === 'occupied' ? 'filled' : 'outlined'}
                            onClick={() => setCanvasFilter('occupied')}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 26, cursor: 'pointer' }}
                        />
                        <Chip
                            label={`🔵 Cleaning (${filterCounts.cleaning})`}
                            size="small"
                            color={canvasFilter === 'cleaning' ? 'info' : 'default'}
                            variant={canvasFilter === 'cleaning' ? 'filled' : 'outlined'}
                            onClick={() => setCanvasFilter('cleaning')}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 26, cursor: 'pointer' }}
                        />
                        {filterCounts.longSeating > 0 && (
                            <Chip
                                label={`⚡ Long Seating >90m (${filterCounts.longSeating})`}
                                size="small"
                                color={canvasFilter === 'long_seating' ? 'error' : 'default'}
                                variant={canvasFilter === 'long_seating' ? 'filled' : 'outlined'}
                                onClick={() => setCanvasFilter('long_seating')}
                                sx={{ fontWeight: 800, fontSize: '0.7rem', height: 26, cursor: 'pointer' }}
                            />
                        )}
                    </Box>
                ) : <Box />}

                {/* RIGHT: VIEW TOGGLE, SEARCH & MOVE CONTROLS */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={is3DMode ? 'Switch to 2D View' : 'Switch to 3D View'}>
                        <Button
                            size="small"
                            variant={is3DMode ? 'contained' : 'outlined'}
                            startIcon={is3DMode ? <ThreeDIcon /> : <TwoDIcon />}
                            onClick={() => setIs3DMode(v => !v)}
                            sx={{
                                borderRadius: 2, textTransform: 'none', fontWeight: 800, height: 32,
                                bgcolor: is3DMode ? 'primary.main' : 'transparent',
                                borderColor: 'primary.main', color: is3DMode ? '#FFFFFF' : 'primary.main',
                            }}
                        >
                            {is3DMode ? '3D' : '2D'}
                        </Button>
                    </Tooltip>

                    {!isCustomerMode && (
                        <>
                            <TextField
                                size="small"
                                placeholder="Search Table #..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 16 }} /></InputAdornment>,
                                    endAdornment: searchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.2 }}><ClearIcon fontSize="small" /></IconButton>
                                        </InputAdornment>
                                    ) : null,
                                    sx: { borderRadius: 2, fontSize: '0.8rem', height: 32, bgcolor: '#FFFFFF' },
                                }}
                                sx={{ width: { xs: 110, sm: 140 } }}
                            />

                            {isCustomizeMode ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button size="small" variant="contained" color="success" startIcon={<SaveIcon />}
                                        onClick={handleSaveLayout} disabled={isSavingLayout}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 900, height: 32 }}>
                                        {isSavingLayout ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button size="small" variant="text" onClick={() => setIsCustomizeMode(false)}
                                        sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary', fontWeight: 700 }}>
                                        Cancel
                                    </Button>
                                </Stack>
                            ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button size="small" variant="outlined" color="primary" startIcon={<CustomizeIcon />} onClick={() => setIsCustomizeMode(true)}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, height: 32, px: 1.5, bgcolor: '#FFFFFF' }}>
                                        Move Mode
                                    </Button>

                                    {onOpenDeletedTables && (
                                        <Button size="small" variant="outlined" color="error" startIcon={<RestoreIcon />} onClick={onOpenDeletedTables}
                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, height: 32, px: 1.5, bgcolor: '#FFFFFF', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#DC2626' }}>
                                            Audit Logs
                                        </Button>
                                    )}
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            </Box>

            {/* ── 3D FLOOR CANVAS ── */}
            <Paper
                ref={canvasRef}
                elevation={0}
                onMouseMove={handleMouseMove}
                onMouseUp={handleDragEnd}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleDragEnd}
                sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: dynamicCanvasHeight + 40,
                    overflow: 'hidden',
                    overflowX: 'auto',
                    borderRadius: 3.5,
                    border: '2px solid',
                    borderColor: isCustomizeMode ? 'primary.main' : (is3DMode ? '#7C3AED' : 'divider'),
                    bgcolor: is3DMode ? '#EDE9DF' : '#F8FAFC',
                    backgroundImage: is3DMode
                        ? `
                          linear-gradient(rgba(139,90,43,0.07) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(139,90,43,0.07) 1px, transparent 1px),
                          linear-gradient(135deg, #EDE9DF 25%, #E8E3D8 25%, #E8E3D8 50%, #EDE9DF 50%, #EDE9DF 75%, #E8E3D8 75%)
                        `
                        : 'radial-gradient(circle, #E2E8F0 1.2px, transparent 1.2px)',
                    backgroundSize: is3DMode
                        ? '60px 60px, 60px 60px, 30px 30px'
                        : `${24 * zoomLevel}px ${24 * zoomLevel}px`,
                    p: 3,
                    userSelect: isCustomizeMode ? 'none' : 'auto',
                    cursor: isCustomizeMode ? (draggingTableId ? 'grabbing' : 'grab') : 'default',
                    transition: 'border-color 0.2s ease, background-color 0.3s ease',
                }}
            >
                {/* Architectural Room Perimeter Wall Border */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        right: 12,
                        height: dynamicCanvasHeight + 20,
                        border: '3px double #475569',
                        borderRadius: 3,
                        pointerEvents: 'none',
                        zIndex: 0,
                        transition: 'height 0.2s ease',
                        '&::before': {
                            content: `"${formatSectionName(activeSection).toUpperCase()} PERIMETER WALL • ${Math.round(dynamicCanvasHeight)}PX"`,
                            position: 'absolute',
                            top: -12,
                            left: 24,
                            bgcolor: '#334155',
                            color: '#FFFFFF',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            letterSpacing: 0.8,
                            px: 1.2,
                            py: 0.2,
                            borderRadius: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }
                    }}
                />

                {/* Move Mode Banner */}
                {isCustomizeMode && !isCustomerMode && (
                    <Paper elevation={2} sx={{
                        position: 'sticky', top: 8, zIndex: 20,
                        display: 'inline-flex', alignItems: 'center', gap: 1,
                        px: 2, py: 0.8, borderRadius: 3, bgcolor: '#0F172A', color: '#FFFFFF',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.2)', mb: 2,
                    }}>
                        <MoveIcon sx={{ fontSize: 18, color: '#38BDF8' }} />
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                            Move Mode Active: Drag tables & room boundary resizers to adjust layout, then click Save Layout.
                        </Typography>
                    </Paper>
                )}

                {/* Zoom Controls */}
                <Paper elevation={1} sx={{
                    position: 'sticky', top: 8, float: 'right', zIndex: 10,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    p: 0.4, borderRadius: 2.5, bgcolor: '#FFFFFF', border: '1px solid', borderColor: 'divider',
                }}>
                    <Tooltip title="Zoom Out"><IconButton size="small" onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
                    <Typography variant="caption" fontWeight={800} sx={{ minWidth: 36, textAlign: 'center', fontSize: '0.72rem' }}>{Math.round(zoomLevel * 100)}%</Typography>
                    <Tooltip title="Zoom In"><IconButton size="small" onClick={() => setZoomLevel(z => Math.min(1.4, z + 0.1))}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Reset Zoom"><IconButton size="small" onClick={() => setZoomLevel(1)}><ResetZoomIcon fontSize="small" /></IconButton></Tooltip>
                </Paper>

                {/* Empty State */}
                {currentSectionTables.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 380, gap: 2 }}>
                        <TableIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" fontWeight={800}>
                            {searchQuery ? `No tables matching "${searchQuery}"` : `No tables in ${formatSectionName(activeSection)}`}
                        </Typography>
                        {!searchQuery && onOpenAddTable && !isCustomerMode && (
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => onOpenAddTable && onOpenAddTable(activeSection)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 800 }}>
                                Add First Table
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Box sx={{
                        position: 'relative',
                        width: '100%',
                        minHeight: dynamicCanvasHeight + 40,
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top left',
                        transition: draggingTableId ? 'none' : 'transform 0.15s ease',
                    }}>
                        {/* ── REALISTIC DINING TABLES ONLY ── */}
                        {currentSectionTables.map(table => {
                            const pos = tablePositions[table._id] || { x: 45, y: 75 };
                            const isOccupied  = table.status === 'occupied' || table.status === 'partially_occupied';
                            const isReserved  = table.status === 'reserved';
                            const isCleaning  = table.status === 'cleaning';
                            const isDeleted   = table.isActive === false;
                            const isRound     = table.shape === 'round';
                            const isDragging  = draggingTableId === table._id;
                            const isSelectedByCustomer = selectedTableId === table._id;

                            const timerInfo = isOccupied ? getSeatingTimerInfo(table.occupiedAt) : null;

                            // Status Colors
                            let statusColor = '#10B981';
                            let statusBg    = '#ECFDF5';
                            let statusLabel = 'Available';

                            if      (isDeleted)  { statusColor = '#94A3B8'; statusBg = '#F1F5F9'; statusLabel = 'Deleted'; }
                            else if (isOccupied) { statusColor = '#EF4444'; statusBg = '#FEF2F2'; statusLabel = `Occupied • ${timerInfo?.text || 'Active'}`; }
                            else if (isReserved) { statusColor = '#F59E0B'; statusBg = '#FFFBEB'; statusLabel = 'Reserved'; }
                            else if (isCleaning) { statusColor = '#06B6D4'; statusBg = '#ECFEFF'; statusLabel = 'Cleaning'; }

                            if (isSelectedByCustomer) {
                                statusColor = '#7C3AED';
                                statusBg = '#F3E8FF';
                                statusLabel = 'Selected Table ✨';
                            }

                            const rot = tableRotations[table._id] ?? table.rotation ?? 0;
                            const isRotated90or270 = rot === 90 || rot === 270;
                            const { w: baseW, h: baseH } = getTableDimensions(table.capacity, isRound);
                            const w = isRotated90or270 ? baseH : baseW;
                            const h = isRotated90or270 ? baseW : baseH;

                            const tooltipText = isCustomerMode
                                ? `${table.tableNumber ? `Table ${table.tableNumber}` : (table.tableName || 'Table')} • ${table.capacity} Guests • ${isOccupied || isCleaning ? 'Taken 🔒' : 'Available to Book ✅'}`
                                : `${table.tableNumber ? `T-${table.tableNumber}` : (table.tableName || 'Table')} • ${table.capacity} seats • ${statusLabel}`;

                            const depth3D = 7;
                            const boxShadow3D = is3DMode
                                ? `${depth3D}px ${depth3D + 2}px 0 ${alpha(statusColor, 0.35)}, ${depth3D + 4}px ${depth3D + 8}px 18px rgba(0,0,0,0.18)`
                                : `0 3px 10px rgba(0,0,0,0.06)`;

                            // Industry-standard: pulsing red border for overdue (>90min) tables
                            const isOverdue = !isCustomerMode && isOccupied && timerInfo?.isAlert === true;
                            const isHighlighted = highlightedTableId === table._id;
                            const guestCount = table.currentOrder?.guestCount || (table as any).currentBooking?.guests || (table as any).currentBooking?.guestCount || (table as any).guestCount || (isOccupied ? 1 : 0);
                            const isCommunalRoom = ['bar', 'poolside', 'counter', 'communal'].includes(canonicalizeRoomKey(activeSection));
                            const isCommunalTable = table.seatingMode === 'communal' || isCommunalRoom;

                            return (
                                <Box
                                    key={table._id}
                                    onMouseDown={e => handleDragStart(e, table._id)}
                                    onTouchStart={e => handleTouchStart(e, table._id)}
                                    onContextMenu={e => handleContextMenu(e, table)}
                                    sx={{
                                        position: 'absolute',
                                        left: pos.x,
                                        top: pos.y,
                                        width: w,
                                        height: h,
                                        zIndex: isHighlighted ? 150 : (isDragging || isSelectedByCustomer ? 100 : 2),
                                        willChange: 'transform',
                                        transition: isDragging ? 'none' : 'transform 0.15s ease',
                                        opacity: !isMatchingFilter(table) ? 0.25 : (isCustomerMode && (isOccupied || isCleaning || isDeleted) ? 0.45 : 1),
                                        cursor: isCustomerMode
                                            ? (isOccupied || isCleaning || isDeleted ? 'not-allowed' : 'pointer')
                                            : (isCustomizeMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer'),
                                        '&:hover': {
                                            transform: isCustomizeMode ? 'none' : (is3DMode ? 'translateY(-3px) scale(1.02)' : 'translateY(-2px)'),
                                        },
                                        // Highlight spotlight animation
                                        ...(isHighlighted && {
                                            borderRadius: isRound ? '50%' : 2,
                                            animation: 'highlightSpotlight 1.5s ease-in-out infinite',
                                            '@keyframes highlightSpotlight': {
                                                '0%':   { boxShadow: '0 0 0 0 rgba(245,158,11,0.0)' },
                                                '50%':  { boxShadow: '0 0 0 8px rgba(245,158,11,0.5), 0 0 25px rgba(245,158,11,0.8)' },
                                                '100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0.0)' },
                                            },
                                        }),
                                        // Industry-standard overdue pulse (like Toast POS)
                                        ...(isOverdue && !isHighlighted && {
                                            borderRadius: isRound ? '50%' : 2,
                                            animation: 'overdueTablePulse 2s ease-in-out infinite',
                                            '@keyframes overdueTablePulse': {
                                                '0%':   { boxShadow: '0 0 0 0 rgba(220,38,38,0.0)' },
                                                '40%':  { boxShadow: '0 0 0 6px rgba(220,38,38,0.35)' },
                                                '70%':  { boxShadow: '0 0 0 10px rgba(220,38,38,0.12)' },
                                                '100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.0)' },
                                            },
                                        }),
                                    }}
                                >
                                    {/* 1-Click Rotate & Flip Buttons in Move Mode */}
                                    {isCustomizeMode && !isCustomerMode && (
                                        <Box sx={{ position: 'absolute', top: -11, right: -11, display: 'flex', gap: 0.5, zIndex: 30 }}>
                                            <Tooltip title={`Rotate 90° Clockwise (Current: ${rot}°)`}>
                                                <Box
                                                    onClick={(e) => handleRotateTable(table._id, 90, e)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                    sx={{
                                                        bgcolor: '#2563EB',
                                                        color: '#FFFFFF',
                                                        borderRadius: '50%',
                                                        width: 22,
                                                        height: 22,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 6px rgba(37,99,235,0.6)',
                                                        transition: 'all 0.15s ease',
                                                        '&:hover': { transform: 'scale(1.2)', bgcolor: '#1D4ED8' }
                                                    }}
                                                >
                                                    <RotateRightIcon sx={{ fontSize: 13 }} />
                                                </Box>
                                            </Tooltip>
                                            <Tooltip title={`Flip 180° / Completely Reverse (Current: ${rot}°)`}>
                                                <Box
                                                    onClick={(e) => handleRotateTable(table._id, 180, e)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                    sx={{
                                                        bgcolor: '#7C3AED',
                                                        color: '#FFFFFF',
                                                        borderRadius: '50%',
                                                        width: 22,
                                                        height: 22,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 6px rgba(124,58,237,0.6)',
                                                        transition: 'all 0.15s ease',
                                                        '&:hover': { transform: 'scale(1.2)', bgcolor: '#6D28D9' }
                                                    }}
                                                >
                                                    <FlipIcon sx={{ fontSize: 13 }} />
                                                </Box>
                                            </Tooltip>
                                        </Box>
                                    )}

                                    {/* REALISTIC SEATING FORMULA CHAIRS */}
                                    {renderDynamicChairs(table.capacity, table.shape, statusColor, is3DMode, guestCount, isCommunalTable)}

                                    {/* 3D Table Surface */}
                                    <Paper
                                        elevation={0}
                                        onClick={() => {
                                            if (isCustomizeMode) return;
                                            if (isCustomerMode) {
                                                if (!isOccupied && !isCleaning && !isDeleted && onSelectTableForCustomer) {
                                                    onSelectTableForCustomer(table);
                                                }
                                            } else {
                                                setSelectedTableDetails(table);
                                            }
                                        }}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: isRound ? '50%' : 2.5,
                                            // Overdue / Highlight border
                                            border: isHighlighted
                                                ? `3px solid #F59E0B`
                                                : isOverdue
                                                    ? `2.5px solid #DC2626`
                                                    : `2px solid ${statusColor}`,
                                            background: is3DMode
                                                ? `linear-gradient(145deg, #FFFFFF 30%, ${alpha(isHighlighted ? '#F59E0B' : (isOverdue ? '#DC2626' : statusColor), 0.06)} 100%)`
                                                : (isHighlighted ? '#FFFBEB' : (isOverdue ? '#FFF5F5' : '#FFFFFF')),
                                            boxShadow: isDragging
                                                ? `${depth3D + 4}px ${depth3D + 8}px 28px rgba(0,0,0,0.28)`
                                                : (isOverdue ? `${depth3D}px ${depth3D + 2}px 0 rgba(220,38,38,0.3), ${depth3D + 4}px ${depth3D + 8}px 18px rgba(220,38,38,0.15)` : boxShadow3D),
                                            position: 'relative',
                                            zIndex: 3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 0.6,
                                            overflow: 'hidden',
                                            transition: 'all 0.18s ease',
                                            '&:hover': {
                                                boxShadow: is3DMode
                                                    ? `${depth3D + 2}px ${depth3D + 5}px 0 ${alpha(statusColor, 0.5)}, ${depth3D + 6}px ${depth3D + 10}px 22px rgba(0,0,0,0.22)`
                                                    : '0 6px 18px rgba(0,0,0,0.12)',
                                                background: is3DMode
                                                    ? `linear-gradient(145deg, #FFFFFF 20%, ${alpha(statusColor, 0.1)} 100%)`
                                                    : statusBg,
                                            },
                                        }}
                                    >
                                        {/* Visual 6-dot drag handle in Move Mode */}
                                        {isCustomizeMode && !isCustomerMode && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 3,
                                                left: 3,
                                                bgcolor: '#0F172A',
                                                color: '#38BDF8',
                                                borderRadius: '50%',
                                                width: 16,
                                                height: 16,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                                            }}>
                                                <DragHandleIcon sx={{ fontSize: 11 }} />
                                            </Box>
                                        )}

                                        {/* Status dot + Table number */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                            <Box sx={{
                                                width: 7, height: 7, borderRadius: '50%',
                                                bgcolor: isOverdue ? '#DC2626' : statusColor,
                                                    boxShadow: isOverdue
                                                        ? `0 0 0 1.5px #FFFFFF, 0 0 8px #DC2626`
                                                        : `0 0 0 1.5px #FFFFFF, 0 0 6px ${statusColor}`,
                                                    flexShrink: 0,
                                                }} />
                                                <Typography sx={{ fontWeight: 900, fontSize: '0.88rem', color: '#0F172A', letterSpacing: -0.3, lineHeight: 1.1, textAlign: 'center' }}>
                                                    {table.tableNumber ? `T-${table.tableNumber}` : (table.tableName || 'Table')}
                                                </Typography>
                                            </Box>

                                            <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: 'text.secondary', mt: 0.3 }}>
                                                {table.capacity} seats
                                            </Typography>

                                            {/* Overdue timer badge — prominent like Toast POS */}
                                            {timerInfo && !isCustomerMode && (
                                                <Chip
                                                    label={timerInfo.text}
                                                    size="small"
                                                    sx={{
                                                        height: 16,
                                                        fontSize: '0.58rem',
                                                        fontWeight: 900,
                                                        mt: 0.3,
                                                        bgcolor: timerInfo.color,
                                                        color: '#FFFFFF',
                                                        letterSpacing: 0,
                                                        border: isOverdue ? '1px solid #B91C1C' : 'none',
                                                    }}
                                                />
                                            )}

                                            {/* Guest count & seating ratio badge — e.g. 👥 1 / 2 Seats */}
                                            {isOccupied && !isCustomerMode && (
                                                <Chip
                                                    label={`👥 ${guestCount} / ${table.capacity} Seats`}
                                                    size="small"
                                                    sx={{
                                                        height: 15,
                                                        fontSize: '0.56rem',
                                                        fontWeight: 900,
                                                        mt: 0.25,
                                                        bgcolor: alpha(statusColor, 0.12),
                                                        color: statusColor,
                                                        border: `1px solid ${alpha(statusColor, 0.3)}`,
                                                        letterSpacing: 0,
                                                    }}
                                                />
                                            )}

                                            {isSelectedByCustomer && (
                                                <Chip label="Selected" size="small" color="secondary" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, mt: 0.2 }} />
                                            )}
                                        </Paper>
                                </Box>
                            );
                        })}

                        {/* Interactive Room Boundary Bottom Resizer Bar (Customize Mode) */}
                        {isCustomizeMode && !isCustomerMode && (
                            <Box sx={{
                                position: 'absolute',
                                top: dynamicCanvasHeight + 2,
                                left: 20,
                                width: 'calc(100% - 40px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                py: 0.8,
                                px: 2,
                                borderRadius: 2.5,
                                bgcolor: alpha('#1E293B', 0.92),
                                color: '#FFFFFF',
                                zIndex: 25,
                                boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                                border: '1.5px dashed #38BDF8',
                                transition: 'top 0.2s ease',
                            }}>
                                <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.76rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    🧱 <strong>{formatSectionName(activeSection).toUpperCase()} ROOM WALL BOUNDARY</strong> ({Math.round(dynamicCanvasHeight)}px Height)
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button size="small" variant="contained" onClick={() => setCustomRoomHeight(h => h + 100)}
                                        sx={{ height: 26, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#38BDF8', color: '#0F172A', '&:hover': { bgcolor: '#0284C7', color: '#FFF' }, textTransform: 'none', borderRadius: 2 }}>
                                        + Extend Wall (+100px)
                                    </Button>
                                    <Button size="small" variant="outlined" onClick={() => setCustomRoomHeight(h => Math.max(450, h - 100))}
                                        sx={{ height: 26, fontSize: '0.7rem', fontWeight: 800, color: '#F1F5F9', borderColor: '#64748B', '&:hover': { borderColor: '#94A3B8' }, textTransform: 'none', borderRadius: 2 }}>
                                        - Shrink Wall (-100px)
                                    </Button>
                                    <Button size="small" variant="outlined" onClick={() => setCustomRoomHeight(660)}
                                        sx={{ height: 26, fontSize: '0.7rem', fontWeight: 800, color: '#34D399', borderColor: '#059669', '&:hover': { bgcolor: alpha('#10B981', 0.2) }, textTransform: 'none', borderRadius: 2 }}>
                                        ⚡ Auto-Fit
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* ── FOOTER LEGEND ── */}
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {[['#10B981', 'Available'], ['#EF4444', 'Occupied'], ['#F59E0B', 'Reserved'], ['#06B6D4', 'Cleaning']].map(([color, label]) => (
                        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                            <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
                        </Box>
                    ))}
                </Box>
                {!isCustomerMode && (
                    <Button size="small" variant="text" startIcon={<HelpIcon sx={{ fontSize: 14 }} />} onClick={() => setLegendOpen(true)}
                        sx={{ color: 'text.secondary', fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}>
                        View Legend
                    </Button>
                )}
            </Box>

            {/* ── RIGHT-CLICK CONTEXT MENU (Admin Only) ── */}
            {!isCustomerMode && (
                <Menu
                    open={contextMenu !== null}
                    onClose={handleCloseContextMenu}
                    anchorReference="anchorPosition"
                    anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
                    PaperProps={{ sx: { borderRadius: 2.5, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid', borderColor: 'divider' } }}
                >
                    {contextMenu?.table?.isActive === false ? (
                        <MenuItem onClick={() => { if (contextMenu?.table && onRestoreTable) onRestoreTable(contextMenu.table); handleCloseContextMenu(); }} disabled={!canDeleteTables}>
                            <ListItemIcon><RestoreIcon fontSize="small" color="success" /></ListItemIcon>
                            <ListItemText primary="Restore Table" primaryTypographyProps={{ fontWeight: 700 }} />
                        </MenuItem>
                    ) : [
                        <MenuItem key="live-intel" onClick={() => { if (contextMenu?.table) setSelectedTableDetails(contextMenu.table); handleCloseContextMenu(); }}>
                            <ListItemIcon><InfoIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText primary="View Live Table Intel" primaryTypographyProps={{ fontWeight: 800 }} />
                        </MenuItem>,
                        <MenuItem key="show-qr" onClick={() => { if (contextMenu?.table) setQrCodeDialogTable(contextMenu.table); handleCloseContextMenu(); }}>
                            <ListItemIcon><QrCodeIcon fontSize="small" color="secondary" /></ListItemIcon>
                            <ListItemText primary="Show Table QR Code" primaryTypographyProps={{ fontWeight: 800 }} />
                        </MenuItem>,
                        <MenuItem key="take-order" onClick={() => { if (contextMenu?.table) { if (tenantSlug) navigate(`/${tenantSlug}/pos?tableId=${contextMenu.table._id}`); } handleCloseContextMenu(); }}>
                            <ListItemIcon><OrderIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText primary={contextMenu?.table?.status === 'occupied' ? 'View Order / Pay Check' : 'Take Order (POS)'} primaryTypographyProps={{ fontWeight: 700 }} />
                        </MenuItem>,
                        <MenuItem key="book-table" onClick={() => { if (contextMenu?.table && onOpenBooking) onOpenBooking(contextMenu.table); handleCloseContextMenu(); }}>
                            <ListItemIcon><BookIcon fontSize="small" color="info" /></ListItemIcon>
                            <ListItemText primary="Book Table" primaryTypographyProps={{ fontWeight: 700 }} />
                        </MenuItem>,
                        <Divider key="div-1" sx={{ my: 0.5 }} />,
                        contextMenu?.table?.status !== 'available' && (
                            <MenuItem key="mark-available" onClick={() => { if (contextMenu?.table && onQuickStatusChange) onQuickStatusChange(contextMenu.table._id, 'available'); handleCloseContextMenu(); }}>
                                <ListItemIcon><AvailableIcon fontSize="small" color="success" /></ListItemIcon>
                                <ListItemText primary="Mark Available" />
                            </MenuItem>
                        ),
                        contextMenu?.table?.status !== 'occupied' && (
                            <MenuItem key="mark-occupied" onClick={() => { if (contextMenu?.table && onQuickStatusChange) onQuickStatusChange(contextMenu.table._id, 'occupied'); handleCloseContextMenu(); }}>
                                <ListItemIcon><OccupiedIcon fontSize="small" color="error" /></ListItemIcon>
                                <ListItemText primary="Mark Occupied" />
                            </MenuItem>
                        ),
                        contextMenu?.table?.status !== 'cleaning' && (
                            <MenuItem key="mark-cleaning" onClick={() => { if (contextMenu?.table && onQuickStatusChange) onQuickStatusChange(contextMenu.table._id, 'cleaning'); handleCloseContextMenu(); }}>
                                <ListItemIcon><CleaningIcon fontSize="small" color="info" /></ListItemIcon>
                                <ListItemText primary="Mark Needs Cleaning" />
                            </MenuItem>
                        ),
                        <Divider key="div-2" sx={{ my: 0.5 }} />,
                        <MenuItem key="rotate-90" onClick={() => { if (contextMenu?.table) handleRotateTable(contextMenu.table._id, 90); handleCloseContextMenu(); }}>
                            <ListItemIcon><RotateRightIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText primary="Rotate 90° Clockwise" primaryTypographyProps={{ fontWeight: 700 }} />
                        </MenuItem>,
                        <MenuItem key="flip-180" onClick={() => { if (contextMenu?.table) handleRotateTable(contextMenu.table._id, 180); handleCloseContextMenu(); }}>
                            <ListItemIcon><FlipIcon fontSize="small" sx={{ color: '#7C3AED' }} /></ListItemIcon>
                            <ListItemText primary="Flip 180° (Complete Reverse)" primaryTypographyProps={{ fontWeight: 700 }} />
                        </MenuItem>,
                        <MenuItem key="rotate-270" onClick={() => { if (contextMenu?.table) handleRotateTable(contextMenu.table._id, 270); handleCloseContextMenu(); }}>
                            <ListItemIcon><RotateLeftIcon fontSize="small" color="secondary" /></ListItemIcon>
                            <ListItemText primary="Rotate 270° (90° Counter-Clockwise)" />
                        </MenuItem>,
                        <MenuItem key="reset-rot" onClick={() => { if (contextMenu?.table) handleSetTableRotation(contextMenu.table._id, 0); handleCloseContextMenu(); }}>
                            <ListItemIcon><ResetZoomIcon fontSize="small" color="action" /></ListItemIcon>
                            <ListItemText primary="Reset to Normal (0°)" />
                        </MenuItem>,
                        <Divider key="div-3" sx={{ my: 0.5 }} />,
                        onOpenEditTable && (
                            <MenuItem key="edit-details" onClick={() => { if (contextMenu?.table) onOpenEditTable(contextMenu.table); handleCloseContextMenu(); }}>
                                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Edit Details" />
                            </MenuItem>
                        ),
                        onOpenHistory && (
                            <MenuItem key="audit-history" onClick={() => { if (contextMenu?.table) onOpenHistory(contextMenu.table._id, `Table ${contextMenu.table.tableNumber}`); handleCloseContextMenu(); }}>
                                <ListItemIcon><TimeIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Audit History" />
                            </MenuItem>
                        ),
                        onOpenDeleteTable && (
                            <MenuItem key="delete-table" onClick={() => { if (contextMenu?.table) onOpenDeleteTable(contextMenu.table); handleCloseContextMenu(); }} disabled={!canDeleteTables} sx={{ color: 'error.main' }}>
                                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                                <ListItemText primary="Delete Table" />
                            </MenuItem>
                        )
                    ].filter(Boolean)}
                </Menu>
            )}

            {/* ── ARCHITECTURAL LANDMARK CONTEXT MENU ── */}
            <Menu
                open={elementContextMenu !== null}
                onClose={() => setElementContextMenu(null)}
                anchorReference="anchorPosition"
                anchorPosition={elementContextMenu ? { top: elementContextMenu.mouseY, left: elementContextMenu.mouseX } : undefined}
            >
                <MenuItem onClick={() => {
                    if (elementContextMenu?.element) {
                        setDeleteElementConfirm({ id: elementContextMenu.element._id, label: elementContextMenu.element.label });
                    }
                    setElementContextMenu(null);
                }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText primary="Delete Landmark" primaryTypographyProps={{ color: 'error.main', fontWeight: 'bold' }} />
                </MenuItem>
            </Menu>

            {/* ── LANDMARK DELETE CONFIRMATION DIALOG ── */}
            <Dialog
                open={Boolean(deleteElementConfirm)}
                onClose={() => setDeleteElementConfirm(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative', fontWeight: 900 }}>
                    Delete Floor Element
                    <IconButton
                        onClick={() => setDeleteElementConfirm(null)}
                        size="small"
                        sx={{ position: 'absolute', right: 16, top: 16 }}
                    >
                        <ClearIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete <strong>{deleteElementConfirm?.label}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This element will be permanently removed from the floor layout.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2, px: 3 }}>
                    <Button
                        onClick={() => setDeleteElementConfirm(null)}
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            if (deleteElementConfirm) {
                                await handleDeleteLandmarkElement(deleteElementConfirm.id, deleteElementConfirm.label);
                                setDeleteElementConfirm(null);
                            }
                        }}
                        variant="contained"
                        color="error"
                        fullWidth
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── LIVE OCCUPIED & COMMUNAL TABLE DETAILS MODAL ── */}
            <Dialog
                open={selectedTableDetails !== null}
                onClose={() => setSelectedTableDetails(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3.5, p: 0.5, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }
                }}
            >
                {selectedTableDetails && (() => {
                    const t = selectedTableDetails;
                    const order = t.currentOrder;
                    const customerName = order?.customer?.name || (t as any).customerName || 'Dine-In Guest';
                    const waiterName = t.assignedWaiter?.firstName ? `${t.assignedWaiter.firstName} ${t.assignedWaiter.lastName || ''}` : (typeof t.assignedWaiter === 'string' ? t.assignedWaiter : 'Unassigned');
                    
                    const seatedTimeMin = t.occupiedAt ? Math.max(0, Math.floor((Date.now() - new Date(t.occupiedAt).getTime()) / 60000)) : 0;
                    const isCommunal = t.seatingMode === 'communal' || Boolean(t.seatTickets && t.seatTickets.length > 0);

                    const isOverdue = t.status === 'occupied' && seatedTimeMin >= 240;
                    const isForgotten = t.status === 'occupied' && seatedTimeMin >= 720;

                    const formatSeatedDuration = (mins: number) => {
                        if (mins <= 0) return 'Just seated';
                        if (mins < 60) return `${mins} mins seated`;
                        if (mins < 1440) {
                            const hrs = (mins / 60).toFixed(1);
                            return `${hrs} hrs seated`;
                        }
                        const days = (mins / 1440).toFixed(1);
                        return `${days} days seated (${mins} mins)`;
                    };

                    return (
                        <>
                            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <Box sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TableIcon />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={900}>
                                            Table {t.tableNumber} {t.tableName ? `(${t.tableName})` : ''}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                            {t.capacity} Seats • {(t.section || t.location || 'Indoor').toUpperCase()}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Chip
                                    label={isCommunal ? 'Communal Shared' : t.status.toUpperCase()}
                                    size="small"
                                    color={t.status === 'occupied' ? 'error' : t.status === 'cleaning' ? 'info' : 'success'}
                                    sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}
                                />
                            </DialogTitle>

                            <DialogContent dividers sx={{ py: 2 }}>
                                {/* OVERDUE / FORGOTTEN TABLE WARNING BANNER */}
                                {isOverdue && (
                                    <Alert
                                        severity={isForgotten ? 'error' : 'warning'}
                                        variant="filled"
                                        sx={{ mb: 2, borderRadius: 2.5, fontWeight: 700 }}
                                        action={
                                            <Button
                                                color="inherit"
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    if (onQuickStatusChange) onQuickStatusChange(t._id, 'available');
                                                    setSelectedTableDetails(null);
                                                }}
                                                sx={{ textTransform: 'none', fontWeight: 800, borderColor: '#FFFFFF', whiteSpace: 'nowrap' }}
                                            >
                                                Clear Table
                                            </Button>
                                        }
                                    >
                                        {isForgotten
                                            ? `⚠️ Forgotten Table Warning: Table occupied for ${formatSeatedDuration(seatedTimeMin)}. Did staff forget to reset this table?`
                                            : `⚠️ Overdue Occupancy: Table occupied for ${formatSeatedDuration(seatedTimeMin)}.`}
                                    </Alert>
                                )}

                                {/* CUSTOMER & SEATED DURATION */}
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2, bgcolor: '#F8FAFC' }}>
                                    <Stack spacing={1.2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                                <Typography variant="subtitle2" fontWeight={800}>
                                                    {customerName}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {(() => {
                                                    const guestCount = order?.guestCount || (t as any).currentBooking?.guests || (t as any).currentBooking?.guestCount || (t as any).guestCount || (t.status === 'occupied' ? 1 : 0);
                                                    return guestCount > 0 ? (
                                                        <Chip
                                                            label={`👥 ${guestCount} ${guestCount === 1 ? 'Guest' : 'Guests'}`}
                                                            size="small"
                                                            sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: alpha('#6366F1', 0.12), color: '#4338CA', border: '1px solid rgba(99,102,241,0.3)' }}
                                                        />
                                                    ) : null;
                                                })()}
                                                <Chip
                                                    icon={<TimeIcon sx={{ fontSize: 14 }} />}
                                                    label={formatSeatedDuration(seatedTimeMin)}
                                                    size="small"
                                                    variant="outlined"
                                                    color={isOverdue ? 'error' : seatedTimeMin > 60 ? 'warning' : 'default'}
                                                    sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                                                />
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                Assigned Server: <b>{waiterName}</b>
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                Status: <b>{t.status}</b>
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>

                                {/* INDIVIDUAL SEAT TICKETS (IF COMMUNAL OR MULTI-GUEST) */}
                                {t.seatTickets && t.seatTickets.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                            Per-Seat Guest Sub-Tickets
                                        </Typography>
                                        <Stack spacing={1}>
                                            {t.seatTickets.map((st, idx) => (
                                                <Paper key={idx} variant="outlined" sx={{ p: 1.2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip label={`Seat ${st.seatNumber}`} size="small" color="primary" sx={{ fontWeight: 800, height: 22 }} />
                                                        <Typography variant="body2" fontWeight={800}>
                                                            {st.customerName || `Guest ${st.seatNumber}`}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={st.status || 'occupied'}
                                                        size="small"
                                                        color={st.status === 'paid' ? 'success' : 'error'}
                                                        sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                                                    />
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* CURRENT ORDER SUMMARY */}
                                {order ? (
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                                Active Order ({order.orderNumber || order._id || 'POS Order'})
                                            </Typography>
                                            <Chip
                                                label={order.paymentStatus || 'UNPAID'}
                                                size="small"
                                                color={order.paymentStatus === 'paid' ? 'success' : 'warning'}
                                                sx={{ fontWeight: 800, height: 20, fontSize: '0.68rem' }}
                                            />
                                        </Box>

                                        {order.items && order.items.length > 0 && (
                                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1.5 }}>
                                                <List disablePadding>
                                                    {order.items.slice(0, 5).map((item: any, idx: number) => (
                                                        <ListItem key={idx} disableGutters sx={{ py: 0.3, display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2" fontWeight={700}>
                                                                {item.quantity}x {item.name || item.menuItem?.name}
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={800} color="text.secondary">
                                                                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                                            </Typography>
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Paper>
                                        )}

                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800}>
                                                Total Amount:
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} color="primary.main">
                                                ${(order.totalAmount || order.total || 0).toFixed(2)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                        No active order linked to this table yet.
                                    </Typography>
                                )}
                            </DialogContent>

                            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
                                {t.status === 'occupied' && onQuickStatusChange && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="success"
                                        startIcon={<AvailableIcon />}
                                        onClick={() => {
                                            onQuickStatusChange(t._id, 'available');
                                            setSelectedTableDetails(null);
                                        }}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                                    >
                                        Mark Available
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setSelectedTableDetails(null)}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                                >
                                    Close
                                </Button>
                                {tenantSlug && (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        startIcon={<OrderReceiptIcon />}
                                        onClick={() => {
                                            const tableId = t._id;
                                            setSelectedTableDetails(null);
                                            navigate(`/${tenantSlug}/pos?tableId=${tableId}`);
                                        }}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, px: 2 }}
                                    >
                                        {t.status === 'occupied' ? 'Checkout / Pay Order' : 'Open POS Order'}
                                    </Button>
                                )}
                            </DialogActions>
                        </>
                    );
                })()}
            </Dialog>

            {/* ── LEGEND DIALOG ── */}
            <TableLegendDialog open={legendOpen} onClose={() => setLegendOpen(false)} />

            {/* ── SINGLE TABLE QR CODE MODAL ── */}
            <Dialog
                open={qrCodeDialogTable !== null}
                onClose={() => setQrCodeDialogTable(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, p: 1, textAlign: 'center' } }}
            >
                {qrCodeDialogTable && (() => {
                    const t = qrCodeDialogTable;
                    const slug = tenantSlug || 'mythri';
                    const domain = window.location.origin;
                    const qrUrl = `${domain}/${slug}?tableId=${t._id}&tableNo=${encodeURIComponent(t.tableNumber)}`;

                    return (
                        <>
                            <DialogTitle sx={{ pb: 1, fontWeight: 900 }}>
                                Table {t.tableNumber} QR Code
                            </DialogTitle>
                            <DialogContent sx={{ py: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 2 }}>
                                    {(t.section || t.location || 'Indoor').toUpperCase()} • {t.capacity} Seats
                                </Typography>
                                <Box sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 3, display: 'inline-block', border: '1.5px solid', borderColor: 'divider', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                                    <QRCodeSVG value={qrUrl} size={180} level="M" />
                                </Box>
                                <Typography variant="body2" fontWeight={700} sx={{ mt: 2, color: 'text.primary' }}>
                                    Scan to View Menu, Order & Pay
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', wordBreak: 'break-all', display: 'block', mt: 1 }}>
                                    {qrUrl}
                                </Typography>
                            </DialogContent>
                            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                                <Button variant="contained" onClick={() => setQrCodeDialogTable(null)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, px: 3 }}>
                                    Close
                                </Button>
                            </DialogActions>
                        </>
                    );
                })()}
            </Dialog>

            {/* ── ROOM-SWITCH TOAST ── */}
            <Snackbar
                open={roomSwitchToast !== null}
                autoHideDuration={3500}
                onClose={() => setRoomSwitchToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setRoomSwitchToast(null)} severity="warning" variant="filled"
                    sx={{ borderRadius: 2.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                    {roomSwitchToast}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default FloorPlanView;
