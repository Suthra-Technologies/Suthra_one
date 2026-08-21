import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    CardActionArea,
    Chip,
    CircularProgress,
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    FormControl,
    FormHelperText,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Menu,
    ListItemIcon,
    ListItemText,
    Divider,
    Badge,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    InputAdornment,
    TablePagination,
    Checkbox,
    OutlinedInput,
    useTheme,
    useMediaQuery,
    alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TableRestaurant as TableIcon,
    EventSeat as BookIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as AvailableIcon,
    Block as OccupiedIcon,
    EventAvailable as ReservedIcon,
    CleaningServices as CleaningIcon,
    DoNotDisturb as OutOfOrderIcon,
    Lock as PartialIcon,
    Search as SearchIcon,
    Today as TodayIcon,
    CalendarMonth as CalendarIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    Clear as ClearIcon,
    ShoppingCart as OrderIcon,
    ViewList as ListIcon,
    Timeline as TimelineIcon,
    Link as LinkIcon,
    LinkOff as LinkOffIcon,
    PlaylistAddCheck as SelectionIcon,
    AccessTime as TimeIcon,
    RestoreFromTrash as RestoreIcon,
    PersonAdd as AssignWaiterIcon,
    Map as FloorPlanIcon,
    GridView as GridIcon,
    QrCode2 as QrCodeIcon,
    MergeType as MergeTypeIcon,
    MeetingRoom as RoomIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    CallSplit as CallSplitIcon,
    CheckCircleOutline as CheckIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { validatePhone, validateEmail } from '../../utils/validation';
import { useSettings } from '../../context/SettingsContext';
import PhoneInput from '../../components/PhoneInput';
import { tablesAPI, bookingsAPI, usersAPI, floorElementsAPI, settingsAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

// Extracted Dialog Components
import AddTableDialog from './components/AddTableDialog';
import EditTableDialog from './components/EditTableDialog';
import BookingDialog from './components/BookingDialog';
import ViewBookingDialog from './components/ViewBookingDialog';
import HistoryDialog from '../../components/common/HistoryDialog';
import FloorPlanView from './components/FloorPlanView';
import ContactlessDiningModal from './components/ContactlessDiningModal';

// Import Table Images
import Table2Img from '../../assets/images/table-2.jpeg';
import Table4Img from '../../assets/images/table-4.jpeg';
import Table6Img from '../../assets/images/table-6.jpeg';
import Table8Img from '../../assets/images/table-8.jpeg';
import Table10Img from '../../assets/images/table-10.jpeg';
import Table12Img from '../../assets/images/table-12.jpeg';
import Table14Img from '../../assets/images/table-14.jpeg';
import Table16Img from '../../assets/images/table-16.jpeg';
import Table18Img from '../../assets/images/table-18.jpeg';
import Table20Img from '../../assets/images/table-20.jpeg';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: { xs: 1, sm: 2 } }}>{children}</Box>}
        </div>
    );
}

/* ── DELETED TABLES & AUDIT LOGS DIALOG (EMBEDDED TO AVOID NEW FILES) ── */
interface DeletedTablesDialogProps {
    open: boolean;
    onClose: () => void;
    onRestoreSuccess: () => void;
    tables: any[];
}

const DeletedTablesDialog: React.FC<DeletedTablesDialogProps> = ({
    open,
    onClose,
    onRestoreSuccess,
    tables = []
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    const deletedTables = tables.filter(
        t => t && (t.isActive === false || t.isDeleted === true || (t.status === 'out_of_order' && t.deletedAt))
    );

    const handleRestore = async (tableId: string, tableNumber: string | number) => {
        try {
            setRestoringId(tableId);
            await tablesAPI.restore(tableId);
            toast.success(`Table #${tableNumber} restored to floor plan!`, {
                icon: '♻️',
                duration: 4000
            });
            onRestoreSuccess();
        } catch (error: any) {
            console.error('Error restoring table:', error);
            toast.error(error.response?.data?.message || 'Failed to restore table');
        } finally {
            setRestoringId(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Recently';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3.5, p: 0.5, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }
            }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        bgcolor: 'error.50',
                        color: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <DeleteIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800}>
                            Deleted Tables & Audit History
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            View deleted tables and restore them back onto the floor plan in 1-click
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: 3, pt: 1 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    sx={{
                        minHeight: 40,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            minHeight: 40,
                            py: 0.5
                        }
                    }}
                >
                    <Tab label={`🗑️ Deleted Tables (${deletedTables.length})`} />
                    <Tab label="📜 Audit Logs & Protection" />
                </Tabs>
            </Box>

            <DialogContent dividers sx={{ minHeight: 320, maxHeight: 480, py: 2 }}>
                {activeTab === 0 && (
                    <Box>
                        {deletedTables.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6, opacity: 0.75 }}>
                                <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                                <Typography variant="subtitle1" fontWeight={800}>
                                    No Deleted Tables Found
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    All your dining tables are currently active on the floor plan.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={1.5}>
                                {deletedTables.map((t) => (
                                    <Paper
                                        key={t._id}
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            bgcolor: '#FAFBFD',
                                            '&:hover': { bgcolor: '#F1F5F9', borderColor: 'primary.main' },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 2,
                                                bgcolor: 'action.hover',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800
                                            }}>
                                                <TableIcon color="action" />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800}>
                                                    Table #{t.tableNumber} {t.tableName ? `(${t.tableName})` : ''}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                                                    {t.capacity} Seats • Room: <b>{(t.section || t.location || 'Indoor').toUpperCase()}</b>
                                                </Typography>
                                                {t.deletedAt && (
                                                    <Typography variant="caption" color="error.main" fontWeight={700}>
                                                        Deleted on {formatDate(t.deletedAt)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            startIcon={restoringId === t._id ? <CircularProgress size={16} color="inherit" /> : <RestoreIcon />}
                                            disabled={restoringId === t._id}
                                            onClick={() => handleRestore(t._id, t.tableNumber)}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 800,
                                                borderRadius: 2,
                                                px: 2,
                                                boxShadow: 'none'
                                            }}
                                        >
                                            Restore Table
                                        </Button>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box sx={{ py: 1 }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <HistoryIcon color="primary" />
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Table Soft-Deletion Policy & History Tracking
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                                When a table is deleted from the floor plan, it is preserved safely via <b>Soft Deletion</b> in the database.
                                Tables with active unpaid guest checks cannot be deleted until checked out. You can restore deleted tables at any time without losing room sections or seating capacities.
                            </Typography>
                        </Paper>

                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                            Recent Floor Activity Audit Log
                        </Typography>

                        <Stack spacing={1}>
                            {tables.slice(0, 8).map((t, idx) => (
                                <Box key={idx} sx={{ p: 1.2, borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={t.isActive === false ? 'DELETED' : t.status.toUpperCase()}
                                            size="small"
                                            color={t.isActive === false ? 'error' : t.status === 'occupied' ? 'error' : 'success'}
                                            sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                                        />
                                        <Typography variant="body2" fontWeight={800}>
                                            Table #{t.tableNumber} ({(t.section || t.location || 'Indoor').toUpperCase()})
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                        {t.isActive === false ? `Deleted: ${formatDate(t.deletedAt)}` : `Active (${t.capacity} seats)`}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Helper to get table image based on capacity
const getTableImage = (capacity: number) => {
    if (capacity <= 2) return Table2Img;
    if (capacity <= 4) return Table4Img;
    if (capacity <= 6) return Table6Img;
    if (capacity <= 8) return Table8Img;
    if (capacity <= 10) return Table10Img;
    if (capacity <= 12) return Table12Img;
    if (capacity <= 14) return Table14Img;
    if (capacity <= 16) return Table16Img;
    if (capacity <= 18) return Table18Img;
    return Table20Img;
};

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const calculateEndTime = (startTimeStr: string | undefined, durationMin: number) => {
    if (!startTimeStr) return '';
    const [h, m] = startTimeStr.split(':').map(Number);
    const totalMinutes = (h * 60) + m + (durationMin || 120);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
};

const TablesPage: React.FC = () => {
    const { tenantSlug, hasPermission } = useAuth();

    // Mirrors @RequireTenantPermissions('tables.delete') on the backend, so the menu
    // doesn't offer an action the server would reject with a 403.
    const canDeleteTables = hasPermission('tables', 'delete');
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [tables, setTables] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [bookingViewMode, setBookingViewMode] = useState(0);
    const [tableViewMode, setTableViewMode] = useState<'floor' | 'grid'>('floor');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Bookings Filter State
    const [bookingDateFilter, setBookingDateFilter] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
    const [bookingSearchQuery, setBookingSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Add Table Dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deletedDialogOpen, setDeletedDialogOpen] = useState(false);
    const [selectedRoomForAddTable, setSelectedRoomForAddTable] = useState<string>('indoor');

    const isValidRoomName = (r: string) => {
        if (!r || typeof r !== 'string') return false;
        const cleaned = r.trim().toLowerCase();
        if (cleaned.length < 2 || cleaned.length > 30) return false;
        return !/^(sdh|asdf|qwer|zxcv|junk)$/i.test(cleaned);
    };

    const canonicalizeRoomKey = (name: string): string => {
        if (!name || typeof name !== 'string') return '';
        return name.trim().toLowerCase().replace(/[\s_\-]+/g, '');
    };

    const getStoredCustomRooms = (slug?: string): string[] => {
        try {
            const key = `pos_custom_rooms_${slug || tenantSlug || 'default'}`;
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter(isValidRoomName) : [];
        } catch {
            return [];
        }
    };

    const saveStoredCustomRooms = (rooms: string[], slug?: string) => {
        try {
            const key = `pos_custom_rooms_${slug || tenantSlug || 'default'}`;
            const unique = [...new Set(
                rooms
                    .filter(r => r != null && typeof r === 'string')
                    .map(r => r.toLowerCase().trim())
            )].filter(isValidRoomName);
            localStorage.setItem(key, JSON.stringify(unique));
            settingsAPI.update('dining_rooms', { customRooms: unique }).catch(() => null);
        } catch (e) {
            console.error('Failed to save custom rooms', e);
        }
    };

    // Custom Location State
    const [customLocations, setCustomLocations] = useState<string[]>(() => getStoredCustomRooms(tenantSlug || undefined));
    const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    // Edit Table Dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<any>(null);

    // History Dialog
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyTargetId, setHistoryTargetId] = useState('');
    const [historyTitle, setHistoryTitle] = useState('');

    // Booking Dialog State
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [viewBookingDialogOpen, setViewBookingDialogOpen] = useState(false);
    const [selectedBookingForView, setSelectedBookingForView] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<any>(null);

    // Quick Actions Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTable, setMenuTable] = useState<any>(null);

    // Assign Waiter
    const [waiters, setWaiters] = useState<any[]>([]);
    const [assignWaiterDialogOpen, setAssignWaiterDialogOpen] = useState(false);
    const [assignWaiterTable, setAssignWaiterTable] = useState<any>(null);
    const [selectedWaiterId, setSelectedWaiterId] = useState('');
    const [assigningWaiter, setAssigningWaiter] = useState(false);

    // Table Merging State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [primaryTableId, setPrimaryTableId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [floorElements, setFloorElements] = useState<any[]>([]);
    const [contactlessModalOpen, setContactlessModalOpen] = useState(false);

    // Unified Hub Tab States
    const [mergeHubTab, setMergeHubTab] = useState(0);
    const [manageHubTab, setManageHubTab] = useState(0);
    const [masterTableSearchQuery, setMasterTableSearchQuery] = useState('');
    const [primaryMergeTableId, setPrimaryMergeTableId] = useState('');
    const [secondaryMergeTableIds, setSecondaryMergeTableIds] = useState<string[]>([]);

    // Room / Section Management State
    const [manageRoomsDialogOpen, setManageRoomsDialogOpen] = useState(false);

    useEffect(() => {
        if (manageRoomsDialogOpen) {
            fetchTables();
        }
    }, [manageRoomsDialogOpen]);
    const [mergeSectionsDialogOpen, setMergeSectionsDialogOpen] = useState(false);
    const [sourceSection, setSourceSection] = useState('');
    const [targetSection, setTargetSection] = useState('');
    const [deleteRoomSection, setDeleteRoomSection] = useState<string | null>(null);
    const [deleteRoomTargetSection, setDeleteRoomTargetSection] = useState<string>('');
    const [renameRoomSection, setRenameRoomSection] = useState<string | null>(null);
    const [newRoomSectionName, setNewRoomSectionName] = useState<string>('');
    const [inlineAddRoomName, setInlineAddRoomName] = useState<string>('');
    const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');

    const handleRenameRoomConfirm = async () => {
        if (!renameRoomSection || !newRoomSectionName.trim() || isProcessing) return;
        const oldNorm = renameRoomSection.toLowerCase().trim();
        const newNorm = newRoomSectionName.toLowerCase().trim();

        if (oldNorm === newNorm) {
            setRenameRoomSection(null);
            return;
        }
        if (!isValidRoomName(newNorm)) {
            toast.error('Invalid room name. Must be 2-30 characters.');
            return;
        }
        if (allAvailableSections.some(sec => canonicalizeRoomKey(sec) === canonicalizeRoomKey(newNorm))) {
            toast.error(`A room named "${newNorm.toUpperCase()}" already exists!`);
            return;
        }

        try {
            setIsProcessing(true);
            const tablesInSec = tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === oldNorm);
            if (tablesInSec.length > 0) {
                await tablesAPI.mergeSections(oldNorm, newNorm);
            }
            setCustomLocations(prev => {
                const updated = [...new Set([...prev.filter(r => r.toLowerCase() !== oldNorm), newNorm])];
                saveStoredCustomRooms(updated, tenantSlug || undefined);
                return updated;
            });
            setHiddenSections(prev => {
                const updated = prev.filter(s => s.toLowerCase() !== newNorm && s.toLowerCase() !== oldNorm);
                try {
                    localStorage.setItem('pos_hidden_sections', JSON.stringify(updated));
                } catch (e) {}
                return updated;
            });
            toast.success(`Room renamed to "${newNorm.toUpperCase()}"`);
            setRenameRoomSection(null);
            setNewRoomSectionName('');
            fetchTables();
        } catch (error: any) {
            console.error('Error renaming room:', error);
            toast.error(error.response?.data?.message || 'Failed to rename room');
        } finally {
            setIsProcessing(false);
        }
    };

    const [hiddenSections, setHiddenSections] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('pos_hidden_sections');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const handleToggleSectionVisibility = (secName: string) => {
        const norm = secName.toLowerCase();
        let updated: string[];
        if (hiddenSections.includes(norm)) {
            updated = hiddenSections.filter(s => s !== norm);
            toast.success(`Room "${secName.toUpperCase()}" is now visible`);
        } else {
            updated = [...hiddenSections, norm];
            toast.success(`Room "${secName.toUpperCase()}" is now hidden for off-season`);
        }
        setHiddenSections(updated);
        try {
            localStorage.setItem('pos_hidden_sections', JSON.stringify(updated));
            settingsAPI.update('dining_rooms', { customRooms: customLocations, hiddenSections: updated }).catch(() => null);
        } catch (e) {
            console.error('Failed to save hidden sections', e);
        }
    };

    const handleDeleteRoomConfirm = async () => {
        if (!deleteRoomSection || isProcessing) return;
        const delNorm = deleteRoomSection.toLowerCase().trim();
        const tablesInSec = tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === delNorm);
        
        if (tablesInSec.length > 0 && !deleteRoomTargetSection) {
            toast.error('Please select a target room to transfer existing tables');
            return;
        }

        try {
            setIsProcessing(true);
            if (tablesInSec.length > 0) {
                await tablesAPI.deleteSection(deleteRoomSection, deleteRoomTargetSection || undefined);
            }
            const updatedCustom = customLocations.filter(r => r.toLowerCase() !== delNorm);
            setCustomLocations(updatedCustom);
            
            let updatedHidden = hiddenSections;
            if (!hiddenSections.includes(delNorm)) {
                updatedHidden = [...hiddenSections, delNorm];
                setHiddenSections(updatedHidden);
            }

            try {
                localStorage.setItem('pos_custom_rooms_' + (tenantSlug || 'default'), JSON.stringify(updatedCustom));
                localStorage.setItem('pos_hidden_sections', JSON.stringify(updatedHidden));
                settingsAPI.update('dining_rooms', { customRooms: updatedCustom, hiddenSections: updatedHidden }).catch(() => null);
            } catch (e) {
                console.error('Failed to save room deletion settings', e);
            }

            toast.success(`Room "${deleteRoomSection.toUpperCase()}" deleted successfully`);
            setDeleteRoomSection(null);
            setDeleteRoomTargetSection('');
            fetchTables();
        } catch (error: any) {
            console.error('Error deleting room:', error);
            toast.error(error.response?.data?.message || 'Failed to delete room');
        } finally {
            setIsProcessing(false);
        }
    };

    const allAvailableSections = useMemo(() => {
        const BASE_ROOMS = ['indoor', 'outdoor', 'private_room', 'bar'];
        const map = new Map<string, string>();
        BASE_ROOMS.forEach(r => map.set(canonicalizeRoomKey(r), r.toLowerCase().trim()));
        tables.filter((t: any) => t.isActive !== false).forEach((t: any) => {
            const sec = (t.section || t.location || '').trim();
            const canon = canonicalizeRoomKey(sec);
            if (sec && isValidRoomName(sec) && !map.has(canon)) {
                map.set(canon, sec.toLowerCase());
            }
        });
        customLocations.forEach(loc => {
            const canon = canonicalizeRoomKey(loc);
            if (loc && isValidRoomName(loc) && !map.has(canon)) {
                map.set(canon, loc.toLowerCase());
            }
        });
        return Array.from(map.values());
    }, [tables, customLocations]);

    const filteredSections = useMemo(() => {
        if (!roomSearchQuery.trim()) return allAvailableSections;
        const q = roomSearchQuery.toLowerCase().trim();
        return allAvailableSections.filter(sec => sec.toLowerCase().includes(q) || sec.replace(/_/g, ' ').toLowerCase().includes(q));
    }, [allAvailableSections, roomSearchQuery]);

    const handleMergeSections = async () => {
        if (isProcessing) return;
        if (!sourceSection || !targetSection) {
            toast.error('Please select both source and target rooms/sections');
            return;
        }
        if (sourceSection.toLowerCase() === targetSection.toLowerCase()) {
            toast.error('Source and target rooms must be different');
            return;
        }

        try {
            setIsProcessing(true);
            await tablesAPI.mergeSections(sourceSection, targetSection);
            toast.success(`Merged room "${sourceSection.toUpperCase()}" into "${targetSection.toUpperCase()}" successfully`);
            setMergeSectionsDialogOpen(false);
            setSourceSection('');
            setTargetSection('');
            fetchTables();
        } catch (error: any) {
            console.error('Error merging rooms:', error);
            toast.error(error.response?.data?.message || 'Failed to merge rooms');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMergeTablesConfirm = async () => {
        if (!primaryMergeTableId || secondaryMergeTableIds.length === 0 || isProcessing) return;
        try {
            setIsProcessing(true);
            await tablesAPI.merge(primaryMergeTableId, secondaryMergeTableIds);
            toast.success('Tables merged successfully!');
            setPrimaryMergeTableId('');
            setSecondaryMergeTableIds([]);
            fetchTables();
        } catch (error: any) {
            console.error('Error merging tables:', error);
            toast.error(error.response?.data?.message || 'Failed to merge tables');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnmergeTablesConfirm = async (primaryTableId: string) => {
        try {
            setIsProcessing(true);
            await tablesAPI.unmerge(primaryTableId);
            toast.success('Tables unmerged successfully!');
            fetchTables();
        } catch (error: any) {
            console.error('Error unmerging tables:', error);
            toast.error(error.response?.data?.message || 'Failed to unmerge tables');
        } finally {
            setIsProcessing(false);
        }
    };

    const fetchTables = async () => {
        try {
            setLoading(true);
            const [response, bookingsRes, elementsRes, settingsRes] = await Promise.all([
                tablesAPI.getAll({ includeDeleted: true }),
                bookingsAPI.getAll({ limit: 1000 }).catch(() => ({ data: { data: [] } })),
                floorElementsAPI.getAll().catch(() => ({ data: [] })),
                settingsAPI.get('dining_rooms').catch(() => ({ data: null }))
            ]);
            let tablesData = Array.isArray(response.data) ? response.data : [];
            const activeBookings = Array.isArray(bookingsRes?.data?.data) ? bookingsRes.data.data : (Array.isArray(bookingsRes?.data) ? bookingsRes.data : []);

            tablesData = tablesData.map((t: any) => {
                const linkedBooking = activeBookings.find((b: any) =>
                    !['cancelled', 'no_show'].includes(b.status) &&
                    (b.table?._id === t._id || b.table === t._id || String(b.table?.tableNumber || b.tableNumber) === String(t.tableNumber))
                );
                if (linkedBooking) {
                    return {
                        ...t,
                        currentBooking: linkedBooking,
                        guestCount: linkedBooking.guests || linkedBooking.guestCount || t.guestCount
                    };
                }
                return t;
            });
            setTables(tablesData);
            setFloorElements(Array.isArray(elementsRes.data) ? elementsRes.data : []);

            const storedCustom = getStoredCustomRooms(tenantSlug || undefined);
            const dbCustomRooms = settingsRes?.data?.customRooms || settingsRes?.data?.settings?.customRooms || [];
            const dbHiddenSections = settingsRes?.data?.hiddenSections || settingsRes?.data?.settings?.hiddenSections || [];

            const hiddenMap = new Map<string, string>();
            if (Array.isArray(dbHiddenSections)) {
                dbHiddenSections.forEach((h: string) => {
                    if (h && typeof h === 'string') {
                        const canon = canonicalizeRoomKey(h);
                        if (!hiddenMap.has(canon)) hiddenMap.set(canon, h.trim().toLowerCase());
                    }
                });
            }
            const cleanedHidden = Array.from(hiddenMap.values());
            setHiddenSections(cleanedHidden);

            const locations = tablesData.filter((t: any) => t.isActive !== false).map((t: any) => (t.section || t.location || '').toLowerCase()).filter(Boolean);
            const roomMap = new Map<string, string>();
            [...storedCustom, ...dbCustomRooms, ...locations].forEach((loc: string) => {
                if (loc && typeof loc === 'string' && isValidRoomName(loc)) {
                    const canon = canonicalizeRoomKey(loc);
                    if (!roomMap.has(canon)) {
                        roomMap.set(canon, loc.trim().toLowerCase());
                    }
                }
            });
            const combinedCustom = Array.from(roomMap.values());
            setCustomLocations(combinedCustom);
            saveStoredCustomRooms(combinedCustom, tenantSlug || undefined);
            settingsAPI.update('dining_rooms', { customRooms: combinedCustom, hiddenSections: cleanedHidden }).catch(() => null);
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Failed to load tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setBookingsLoading(true);
            const response = await bookingsAPI.getAll({ limit: 1000 });
            setBookings(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleSaveTableCoordinates = async (updatedTables: { _id: string; coordinates: { x: number; y: number } }[]) => {
        try {
            await Promise.all(
                updatedTables.map(item =>
                    tablesAPI.update(item._id, { coordinates: item.coordinates })
                )
            );
            toast.success('Floor layout saved successfully');
            fetchTables();
        } catch (error) {
            console.error('Error saving floor layout:', error);
            toast.error('Failed to save floor layout');
        }
    };

    const handleEditTable = (table: any) => {
        setSelectedTable(table);
        setEditDialogOpen(true);
        handleCloseMenu();
    };
    const handleDeleteTable = (table: any) => {
        setTableToDelete(table);
        setDeleteDialogOpen(true);
        handleCloseMenu();
    };

    const confirmDeleteTable = async () => {
        if (!tableToDelete || isProcessing) return;
        try {
            setIsProcessing(true);
            await tablesAPI.delete(tableToDelete._id);
            toast.success('Table moved to deleted items');
            setDeleteDialogOpen(false);
            setTableToDelete(null);
            fetchTables();
        } catch (error: any) {
            console.error('Error deleting table:', error);
            // 401/403 are already surfaced by the api interceptor; re-toasting here
            // would stack a second message for the same failure.
            if (error.response?.status !== 403 && error.response?.status !== 401) {
                toast.error(error.response?.data?.message || 'Failed to delete table');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreTable = async (table: any) => {
        if (!table || isProcessing) return;
        try {
            setIsProcessing(true);
            await tablesAPI.restore(table._id);
            toast.success('Table restored successfully');
            handleCloseMenu();
            fetchTables();
        } catch (error: any) {
            console.error('Error restoring table:', error);
            if (error.response?.status !== 403 && error.response?.status !== 401) {
                toast.error(error.response?.data?.message || 'Failed to restore table');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenBooking = (table: any) => {
        setSelectedTable(table);
        setBookingDialogOpen(true);
        handleCloseMenu();
    };

    const handleViewBooking = (booking: any) => {
        setSelectedBookingForView(booking);
        setViewBookingDialogOpen(true);
    };

    // Quick Status Update
    const handleQuickStatusChange = async (tableId: string, newStatus: string) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await tablesAPI.updateStatus(tableId, newStatus);
            toast.success(`Table status updated to ${newStatus}`);
            fetchTables();
        } catch (error) {
            console.error('Error updating table status:', error);
            toast.error('Failed to update table status');
        } finally {
            setIsProcessing(false);
        }
        handleCloseMenu();
    };

    const handleOpenHistory = (tableId: string, title: string) => {
        setHistoryTargetId(tableId);
        setHistoryTitle(title);
        setHistoryDialogOpen(true);
        handleCloseMenu();
    };

    const handleToggleSelection = (id: string) => {
        setSelectedTableIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleMerge = async () => {
        if (isProcessing) return;
        if (!primaryTableId || selectedTableIds.length < 2) {
            toast.error('Please select a primary table and at least one secondary table');
            return;
        }

        const secondaryIds = selectedTableIds.filter(id => id !== primaryTableId);

        try {
            setIsProcessing(true);
            await tablesAPI.merge(primaryTableId, secondaryIds);
            toast.success('Tables merged successfully');
            setMergeDialogOpen(false);
            setSelectionMode(false);
            setSelectedTableIds([]);
            fetchTables();
        } catch (error: any) {
            console.error('Error merging tables:', error);
            const msg = error.response?.data?.message || 'Failed to merge tables';
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnmerge = async (table: any) => {
        if (isProcessing) return;
        const primaryId = table.isPrimary ? table._id : table.mergedWith;
        if (!primaryId) return;

        try {
            setIsProcessing(true);
            await tablesAPI.unmerge(primaryId);
            toast.success('Tables unmerged successfully');
            fetchTables();
            handleCloseMenu();
        } catch (error) {
            console.error('Error unmerging tables:', error);
            toast.error('Failed to unmerge tables');
        } finally {
            setIsProcessing(false);
        }
    };

    // Booking Status Update
    const handleBookingStatusChange = async (bookingId: string, newStatus: string) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await bookingsAPI.updateStatus(bookingId, newStatus);
            toast.success(`Booking ${newStatus}`);
            fetchBookings();
            fetchTables();
        } catch (error) {
            console.error('Error updating booking status:', error);
            toast.error('Failed to update booking');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckIn = async (bookingId: string) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            // Find the booking in local state to check if already checked in
            const existingBooking = bookings.find(b => b._id === bookingId);
            let booking = existingBooking;

            // Only call API if not already checked in
            if (!existingBooking?.checkedIn) {
                const response = await bookingsAPI.checkIn(bookingId);
                toast.success('Guest checked in successfully');
                fetchBookings();
                fetchTables();
                booking = response.data;
            } else {
                // If already checked in, just proceed to navigation logic
                // We might want to refresh tables to ensure we have latest order info though
                fetchTables();
            }

            if (!booking) return;

            // Navigate to POS for this table immediately
            // booking.table might be populated object or ID string depending on backend
            // Our backend bookings.service checkIn returns the booking doc. 
            // If it's populated on backend, good. If not, we might need to rely on the local list or just ID
            const tableId = (booking.table && booking.table._id) ? booking.table._id : booking.table;

            if (tableId) {
                const queryParams = new URLSearchParams({
                    tableId: tableId.toString(),
                    guestCount: booking.guests?.toString() || '1'
                });

                // Get customer info prioritizing populated customer object, then fall back to guestInfo
                const name = booking.customer?.name ||
                    (booking.guestInfo ? `${booking.guestInfo.firstName || ''} ${booking.guestInfo.lastName || ''}`.trim() : '');
                const phone = booking.customer?.phone || booking.guestInfo?.phone || '';
                const email = booking.customer?.email || booking.guestInfo?.email || '';

                if (name) queryParams.append('customerName', name);
                if (phone) queryParams.append('customerPhone', phone);
                if (email) queryParams.append('customerEmail', email);

                navigate(`/${tenantSlug}/pos?${queryParams.toString()}`);
            }

        } catch (error: any) {
            console.error('Error checking in:', error);
            const msg = error.response?.data?.message || 'Failed to check in guest';
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    // Menu handlers
    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, table: any) => {
        setAnchorEl(event.currentTarget);
        setMenuTable(table);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuTable(null);
    };

    useEffect(() => {
        fetchTables();
        fetchBookings();
        usersAPI.getUsers({ role: 'waiter', isActive: true })
            .then(res => {
                const payload = res.data;
                let raw: any[] = [];
                if (Array.isArray(payload)) {
                    raw = payload;
                } else if (payload && typeof payload === 'object') {
                    if (Array.isArray((payload as any).data)) {
                        raw = (payload as any).data;
                    } else if (Array.isArray((payload as any).users)) {
                        raw = (payload as any).users;
                    } else if (Array.isArray((payload as any).data?.users)) {
                        raw = (payload as any).data.users;
                    }
                }
                setWaiters(Array.isArray(raw) ? raw : []);
            })
            .catch(err => console.error('Failed to load waiters', err));
    }, []);

    const handleOpenAssignWaiter = (table: any) => {
        setAssignWaiterTable(table);
        setSelectedWaiterId(table?.assignedWaiter?._id || '');
        setAssignWaiterDialogOpen(true);
        handleCloseMenu();
    };

    const handleCloseAssignWaiter = () => {
        setAssignWaiterDialogOpen(false);
        setAssignWaiterTable(null);
        setSelectedWaiterId('');
    };

    const handleConfirmAssignWaiter = async () => {
        if (!assignWaiterTable) return;
        try {
            setAssigningWaiter(true);
            await tablesAPI.update(assignWaiterTable._id, { assignedWaiter: selectedWaiterId || null });
            toast.success(selectedWaiterId ? 'Waiter assigned' : 'Waiter unassigned');
            handleCloseAssignWaiter();
            fetchTables();
        } catch (error) {
            console.error('Error assigning waiter:', error);
            toast.error('Failed to assign waiter');
        } finally {
            setAssigningWaiter(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'success';
            case 'occupied':
                return 'error';
            case 'partially_occupied':
                return 'error'; // Also red, but maybe distinct? Let's treat like occupied error for now
            case 'reserved':
                return 'warning';
            case 'cleaning':
                return 'info';
            case 'out_of_order':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'available':
                return <AvailableIcon fontSize="small" />;
            case 'occupied':
                return <OccupiedIcon fontSize="small" />;
            case 'partially_occupied':
                return <PartialIcon fontSize="small" />;
            // case 'reserved':
            //     return <ReservedIcon fontSize="small" />;
            // case 'cleaning':
            //     return <CleaningIcon fontSize="small" />;
            case 'out_of_order':
                return <OutOfOrderIcon fontSize="small" />;
            default:
                return undefined;
        }
    };

    const getBookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'error';
            case 'completed':
                return 'info';
            case 'no_show':
                return 'default';
            default:
                return 'default';
        }
    };

    const activeTables = React.useMemo(() => tables.filter(t => t.isActive !== false), [tables]);
    const deletedTables = React.useMemo(() => tables.filter(t => t.isActive === false), [tables]);

    // Count tables by status
    const statusCounts = React.useMemo(() => ({
        all: activeTables.length,
        available: activeTables.filter(t => t.status === 'available').length,
        occupied: activeTables.filter(t => t.status === 'occupied').length,
        partially_occupied: activeTables.filter(t => t.status === 'partially_occupied').length,
        reserved: activeTables.filter(t => t.status === 'reserved').length,
        cleaning: activeTables.filter(t => t.status === 'cleaning').length,
        deleted: deletedTables.length,
    }), [activeTables, deletedTables]);

    // Filter tables based on status
    const filteredTables = React.useMemo(() => {
        if (statusFilter === 'deleted') return deletedTables;
        return statusFilter === 'all'
            ? activeTables
            : activeTables.filter(t => t.status === statusFilter);
    }, [activeTables, deletedTables, statusFilter]);

    // Filter bookings based on date, status, and search
    const filteredBookings = React.useMemo(() => bookings.filter(booking => {
        // Date filter
        if (bookingDateFilter) {
            const bookingDateStr = new Date(booking.date).toISOString().split('T')[0];
            if (bookingDateStr !== bookingDateFilter) return false;
        }

        // Status filter
        if (bookingStatusFilter !== 'all' && booking.status !== bookingStatusFilter) {
            return false;
        }

        // Search filter
        if (bookingSearchQuery) {
            const query = bookingSearchQuery?.toLowerCase();
            const customerName = `${booking.guestInfo?.firstName || ''} ${booking.guestInfo?.lastName || ''}`?.toLowerCase();
            const phone = (booking.guestInfo?.phone || '')?.toLowerCase();
            const email = (booking.guestInfo?.email || '')?.toLowerCase();
            const bookingId = (booking.bookingId || '')?.toLowerCase();
            const tableName = (booking.table?.tableName || booking.table?.tableNumber || '').toString()?.toLowerCase();

            if (!customerName.includes(query) &&
                !phone.includes(query) &&
                !email.includes(query) &&
                !bookingId.includes(query) &&
                !tableName.includes(query)) {
                return false;
            }
        }

        return true;
    }), [bookings, bookingDateFilter, bookingStatusFilter, bookingSearchQuery]);

    // Pagination
    const paginatedBookings = React.useMemo(() => filteredBookings.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    ), [filteredBookings, page, rowsPerPage]);

    // Count bookings by status for the selected date
    const bookingStatusCounts = React.useMemo(() => ({
        all: filteredBookings.length,
        pending: bookings.filter(b => {
            if (!b.date) return false;
            const bDate = new Date(b.date);
            const dUTC = bDate.toISOString().split('T')[0];
            const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
            return (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) && b.status === 'pending';
        }).length,
        confirmed: bookings.filter(b => {
            if (!b.date) return false;
            const bDate = new Date(b.date);
            const dUTC = bDate.toISOString().split('T')[0];
            const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
            return (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) && b.status === 'confirmed';
        }).length,
        completed: bookings.filter(b => {
            if (!b.date) return false;
            const bDate = new Date(b.date);
            const dUTC = bDate.toISOString().split('T')[0];
            const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
            return (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) && b.status === 'completed';
        }).length,
        cancelled: bookings.filter(b => {
            if (!b.date) return false;
            const bDate = new Date(b.date);
            const dUTC = bDate.toISOString().split('T')[0];
            const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
            return (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) && b.status === 'cancelled';
        }).length,
    }), [bookings, filteredBookings.length, bookingDateFilter]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    // Check if selected date is today
    const isToday = bookingDateFilter === (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Timeline Helpers
    const timelineStartHour = 11;
    const timelineEndHour = 23;
    const totalHours = timelineEndHour - timelineStartHour;

    const getBookingPosition = (booking: any) => {
        let startHour = 0;

        if (booking.timeSlot?.requested) {
            const [h, m] = booking.timeSlot.requested.split(':').map(Number);
            startHour = (h || 0) + ((m || 0) / 60);
        } else {
            const date = new Date(booking.date);
            const start = new Date(booking.timeSlot?.start || date);
            if (isNaN(start.getTime())) return { left: '0%', width: '0%' };
            startHour = start.getHours() + (start.getMinutes() / 60);
        }

        let relativeStart = startHour - timelineStartHour;

        const durationHours = (booking.duration || 120) / 60;

        // Since we render 'totalHours + 1' columns, the total visual width is 'totalHours + 1' hours.
        const visualTotalHours = totalHours + 1;

        let leftPercent = (relativeStart / visualTotalHours) * 100;
        let widthPercent = (durationHours / visualTotalHours) * 100;

        if (leftPercent < 0) {
            widthPercent += leftPercent;
            leftPercent = 0;
        }
        if (leftPercent + widthPercent > 100) {
            widthPercent = 100 - leftPercent;
        }
        if (widthPercent < 0) widthPercent = 0;

        return { left: `${leftPercent}%`, width: `${widthPercent}%` };
    };

    return (
        <Box>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' }, 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: { xs: 2, sm: 3 }, 
                gap: 2,
                mt: { xs: 1.5, sm: 0 }
            }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 800,
                        width: { xs: '100%', sm: 'auto' },
                        textAlign: { xs: 'center', sm: 'left' },
                        fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.125rem' }
                    }}
                >
                    Table Management
                </Typography>
                <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'center', sm: 'flex-end' }, alignItems: 'center' }}>
                    {selectionMode && selectedTableIds.length >= 2 && (
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<LinkIcon sx={{ fontSize: { xs: '1rem !important', sm: 'inherit' } }} />}
                            onClick={() => {
                                setPrimaryTableId(selectedTableIds[0]);
                                setMergeDialogOpen(true);
                            }}
                            size={isMobile ? "small" : "medium"}
                            sx={{ 
                                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                px: { xs: 1.5, sm: 2 },
                                height: 38,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Merge ({selectedTableIds.length})
                        </Button>
                    )}
                    {/* View Mode Switcher (Floor Plan vs Grid Cards) */}
                    <Stack direction="row" spacing={0.5} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), p: 0.5, borderRadius: 2.5, height: 38, alignItems: 'center' }}>
                        <Button
                            size={isMobile ? "small" : "medium"}
                            variant={tableViewMode === 'floor' ? "contained" : "text"}
                            color={tableViewMode === 'floor' ? "primary" : "inherit"}
                            startIcon={<FloorPlanIcon sx={{ fontSize: { xs: '1rem !important', sm: 'inherit' } }} />}
                            onClick={() => setTableViewMode('floor')}
                            sx={{
                                fontSize: { xs: '0.75rem', sm: '0.825rem' },
                                px: { xs: 1.25, sm: 1.75 },
                                height: 30,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 800,
                                boxShadow: tableViewMode === 'floor' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                            }}
                        >
                            Floor Plan
                        </Button>
                        <Button
                            size={isMobile ? "small" : "medium"}
                            variant={tableViewMode === 'grid' ? "contained" : "text"}
                            color={tableViewMode === 'grid' ? "primary" : "inherit"}
                            startIcon={<GridIcon sx={{ fontSize: { xs: '1rem !important', sm: 'inherit' } }} />}
                            onClick={() => setTableViewMode('grid')}
                            sx={{
                                fontSize: { xs: '0.75rem', sm: '0.825rem' },
                                px: { xs: 1.25, sm: 1.75 },
                                height: 30,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 800,
                                boxShadow: tableViewMode === 'grid' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                            }}
                        >
                            Grid
                        </Button>
                    </Stack>

                    {/* Contactless QR Dining Action */}
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<QrCodeIcon sx={{ fontSize: { xs: '1rem !important', sm: '1.1rem' } }} />}
                        onClick={() => setContactlessModalOpen(true)}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            fontSize: { xs: '0.75rem', sm: '0.825rem' },
                            px: { xs: 1.25, sm: 1.75 },
                            height: 38,
                            borderRadius: 2.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderColor: alpha(theme.palette.divider, 0.8),
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                        }}
                    >
                        Contactless QR Dining
                    </Button>

                    {/* Merge Tables Action */}
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<LinkIcon sx={{ fontSize: { xs: '1rem !important', sm: '1.1rem' } }} />}
                        onClick={() => {
                            if (selectedTableIds.length < 2 && tables.length >= 2) {
                                const activeTables = tables.filter(t => t.isActive !== false);
                                if (activeTables.length >= 2) {
                                    setSelectedTableIds([activeTables[0]._id, activeTables[1]._id]);
                                    setPrimaryTableId(activeTables[0]._id);
                                }
                            } else if (selectedTableIds.length >= 1 && !primaryTableId) {
                                setPrimaryTableId(selectedTableIds[0]);
                            }
                            setMergeDialogOpen(true);
                        }}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            fontSize: { xs: '0.75rem', sm: '0.825rem' },
                            px: { xs: 1.25, sm: 1.75 },
                            height: 38,
                            borderRadius: 2.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderColor: alpha(theme.palette.divider, 0.8),
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                        }}
                    >
                        Merge Tables
                    </Button>

                    {/* Merge Hub Action */}
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<CallSplitIcon sx={{ fontSize: { xs: '1rem !important', sm: '1.1rem' } }} />}
                        onClick={() => setMergeSectionsDialogOpen(true)}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            fontSize: { xs: '0.75rem', sm: '0.825rem' },
                            px: { xs: 1.25, sm: 1.75 },
                            height: 38,
                            borderRadius: 2.5,
                            textTransform: 'none',
                            fontWeight: 800,
                            borderColor: alpha(theme.palette.divider, 0.8),
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                        }}
                    >
                        🔀 Merge Hub
                    </Button>

                    {/* Manage Hub Action */}
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<RoomIcon sx={{ fontSize: { xs: '1rem !important', sm: '1.1rem' } }} />}
                        onClick={() => setManageRoomsDialogOpen(true)}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            fontSize: { xs: '0.75rem', sm: '0.825rem' },
                            px: { xs: 1.25, sm: 1.75 },
                            height: 38,
                            borderRadius: 2.5,
                            textTransform: 'none',
                            fontWeight: 800,
                            borderColor: alpha(theme.palette.divider, 0.8),
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                        }}
                    >
                        ⚙️ Manage Hub
                    </Button>
                </Stack>
            </Box>

            {/* Tabs */}
            {(() => {
                const overdueCount = tables.filter(t => {
                    if ((t.status !== 'occupied' && t.status !== 'partially_occupied') || !t.occupiedAt) return false;
                    const diffMins = Math.floor((Date.now() - new Date(t.occupiedAt).getTime()) / (1000 * 60));
                    return diffMins > 90;
                }).length;
                return (
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: { xs: 1, sm: 2 } }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 1.5 }}>
                                        <Badge badgeContent={statusCounts.all} color="primary" max={99}>
                                            <Typography component="span" sx={{ pr: 1.5, fontWeight: 'bold' }}>Tables</Typography>
                                        </Badge>
                                    </Box>
                                    {overdueCount > 0 && (
                                        <Chip
                                            label={`⚠️ ${overdueCount} overdue`}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.65rem',
                                                fontWeight: 900,
                                                bgcolor: '#DC2626',
                                                color: '#FFFFFF',
                                                borderRadius: 1.5,
                                                ml: 1,
                                                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                                                animation: 'overdueTabPulse 2s ease-in-out infinite',
                                                '@keyframes overdueTabPulse': {
                                                    '0%, 100%': { opacity: 1 },
                                                    '50%': { opacity: 0.65 },
                                                },
                                            }}
                                        />
                                    )}
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Badge badgeContent={filteredBookings.length} color="warning" max={99}>
                                    <Box sx={{ pr: { xs: 1, sm: 2 } }}>Bookings</Box>
                                </Badge>
                            }
                        />
                    </Tabs>
                );
            })()}

            {/* Tab Panel: Tables */}
            <TabPanel value={tabValue} index={0}>
                {loading ? (
                    <CardGridSkeleton count={8} cardHeight={220} />
                ) : tableViewMode === 'floor' ? (
                    /* Interactive 2D Floor Plan Canvas */
                    <FloorPlanView
                        tables={tables}
                        floorElements={floorElements}
                        tenantSlug={tenantSlug || ''}
                        customLocations={customLocations}
                        canDeleteTables={canDeleteTables}
                        isMobile={isMobile}
                        hiddenSections={hiddenSections}
                        onOpenBooking={handleOpenBooking}
                        onOpenAddTable={(room) => {
                            setSelectedRoomForAddTable(room || 'indoor');
                            setAddDialogOpen(true);
                        }}
                        onOpenAddLocation={() => setAddLocationDialogOpen(true)}
                        onOpenEditTable={handleEditTable}
                        onOpenDeleteTable={handleDeleteTable}
                        onRestoreTable={handleRestoreTable}
                        onOpenDeletedTables={() => setDeletedDialogOpen(true)}
                        onQuickStatusChange={handleQuickStatusChange}
                        onOpenHistory={handleOpenHistory}
                        onSaveTableCoordinates={handleSaveTableCoordinates}
                        onAddFloorElement={async (element) => {
                            try {
                                const res = await floorElementsAPI.create(element);
                                if (res.data) {
                                    setFloorElements(prev => [...prev, res.data]);
                                }
                            } catch (err) {
                                console.error('Failed to add floor element:', err);
                            }
                        }}
                    />
                ) : (
                    <>
                        {/* Status Filter Chips for Grid View */}
                        <Box sx={{ 
                            display: 'flex', 
                            overflowX: 'auto', 
                            flexWrap: { xs: 'nowrap', sm: 'wrap' }, 
                            gap: 1, 
                            mb: { xs: 1.5, sm: 3 },
                            pb: { xs: 1, sm: 0 },
                            '&::-webkit-scrollbar': { display: 'none' }
                        }}>
                            <Chip
                                label={`All (${statusCounts.all})`}
                                color={statusFilter === 'all' ? 'primary' : 'default'}
                                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                                onClick={() => setStatusFilter('all')}
                                size={isMobile ? "small" : "medium"}
                            />
                            <Chip
                                label={`Available (${statusCounts.available})`}
                                color={statusFilter === 'available' ? 'primary' : 'default'}
                                variant={statusFilter === 'available' ? 'filled' : 'outlined'}
                                onClick={() => setStatusFilter('available')}
                                size={isMobile ? "small" : "medium"}
                            />
                            <Chip
                                label={`Occupied (${statusCounts.occupied})`}
                                color={statusFilter === 'occupied' ? 'primary' : 'default'}
                                variant={statusFilter === 'occupied' ? 'filled' : 'outlined'}
                                onClick={() => setStatusFilter('occupied')}
                                size={isMobile ? "small" : "medium"}
                            />
                            <Chip
                                label={`Reserved (${statusCounts.reserved})`}
                                color={statusFilter === 'reserved' ? 'primary' : 'default'}
                                variant={statusFilter === 'reserved' ? 'filled' : 'outlined'}
                                onClick={() => setStatusFilter('reserved')}
                                size={isMobile ? "small" : "medium"}
                            />
                            <Chip
                                icon={<RestoreIcon />}
                                label={`Deleted (${statusCounts.deleted})`}
                                color={statusFilter === 'deleted' ? 'warning' : 'default'}
                                variant={statusFilter === 'deleted' ? 'filled' : 'outlined'}
                                onClick={() => setStatusFilter('deleted')}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Box>

                        {filteredTables.length === 0 ? (
                            <Paper sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body1" color="text.secondary">
                                    No tables found.
                                </Typography>
                            </Paper>
                        ) : (
                    <Grid container spacing={{ xs: 1, sm: 3 }}>
                        {filteredTables.map((table) => (
                            <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={table._id}>
                                <Card sx={{
                                    position: 'relative',
                                    borderRadius: { xs: 2.5, sm: 4 },
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 15px rgba(0,0,0,0.06)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    outline: selectionMode && selectedTableIds.includes(table._id) ? `3px solid ${theme.palette.secondary.main}` : 'none',
                                    opacity: selectionMode && !selectedTableIds.includes(table._id) && selectedTableIds.length > 0 ? 0.8 : 1,
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
                                    },
                                    ...(table.isMerged && {
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: 0,
                                            height: 0,
                                            borderStyle: 'solid',
                                            borderWidth: '0 30px 30px 0',
                                            borderColor: `transparent ${theme.palette.warning.main} transparent transparent`,
                                            zIndex: 2,
                                        }
                                    })
                                }}>
                                    <Box 
                                        sx={{ 
                                            position: 'absolute', 
                                            top: 0, 
                                            left: 0, 
                                            bottom: 0, 
                                            width: 3, 
                                            bgcolor: table.isActive === false ? 'warning.main' : `${getStatusColor(table.status)}.main` 
                                        }} 
                                    />
                                    <CardActionArea onClick={() => table.isActive === false ? undefined : (selectionMode ? handleToggleSelection(table._id) : handleOpenBooking(table))}>
                                        <CardContent sx={{ textAlign: 'center', p: 0, pb: { xs: 0.75, sm: 1.5 } }}>
                                            <Box sx={{ mb: { xs: 0.75, sm: 2 }, position: 'relative', width: '100%', mx: 0 }}>
                                                <Box
                                                    component="img"
                                                    src={getTableImage(table.capacity)}
                                                    alt={`Table for ${table.capacity}`}
                                                    sx={{
                                                        width: '100%',
                                                        height: { xs: 90, sm: 180 },
                                                        objectFit: 'cover',
                                                        opacity: table.isActive === false ? 0.45 : (table.status === 'occupied' ? 0.7 : 1),
                                                        filter: table.isActive === false ? 'grayscale(100%)' : (table.status === 'occupied' ? 'grayscale(50%)' : 'none'),
                                                        transition: 'all 0.3s ease',
                                                    }}
                                                />
                                                <Chip
                                                    icon={table.isActive === false ? <RestoreIcon /> : getStatusIcon(table.status)}
                                                    label={table.isActive === false ? 'DELETED' : table.status?.toUpperCase()}
                                                    color={(table.isActive === false ? 'warning' : getStatusColor(table.status)) as any}
                                                    size="small"
                                                    sx={{ 
                                                        position: 'absolute', 
                                                        top: { xs: 6, sm: 10 }, 
                                                        right: { xs: 6, sm: 10 }, 
                                                        zIndex: 1, 
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', 
                                                        bgcolor: 'rgba(255,255,255,0.92)',
                                                        backdropFilter: 'blur(4px)',
                                                        fontSize: { xs: '0.55rem', sm: '0.75rem' },
                                                        height: { xs: 18, sm: 24 },
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </Box>
                                            <Typography 
                                                variant="h5" 
                                                sx={{ 
                                                    fontSize: { xs: '0.85rem', sm: '1.5rem' }, 
                                                    fontWeight: 800,
                                                    px: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }} 
                                                gutterBottom
                                            >
                                                {table.tableName || `Table ${table.tableNumber}`}
                                            </Typography>
                                            <Typography 
                                                variant="body2" 
                                                color="text.secondary" 
                                                sx={{ 
                                                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                                    px: 1
                                                }}
                                            >
                                                Cap: {table.capacity} | {table.location}
                                            </Typography>
                                            {table.isActive === false && (
                                                <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                    Deleted {table.deletedAt ? new Date(table.deletedAt).toLocaleDateString() : ''}
                                                </Typography>
                                            )}
                                            {(table.isMerged || table.isPrimary) && (
                                                <Box sx={{ mt: 0.5, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                                    <LinkIcon sx={{ fontSize: { xs: 12, sm: 16 } }} color="warning" />
                                                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                        {table.isPrimary ? 'PRIMARY' : 'MERGED'}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </CardActionArea>

                                    {/* Quick Actions */}
                                    <Box sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Stack direction="row" spacing={0.5}>
                                            {table.isActive === false ? (
                                                <Tooltip title={canDeleteTables ? 'Restore Table' : "You don't have permission to restore tables"}>
                                                    <span>
                                                        <IconButton size="small" color="success" onClick={() => handleRestoreTable(table)} disabled={isProcessing || !canDeleteTables}>
                                                            <RestoreIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title={table.status === 'occupied' || table.status === 'partially_occupied' || table.status === 'served' ? "View Order / Checkout" : "Take Order"}>
                                                    <IconButton size="small" color={table.status === 'occupied' || table.status === 'partially_occupied' || table.status === 'served' ? "warning" : "primary"} onClick={() => navigate(`/${tenantSlug}/pos?tableId=${table._id}`)}>
                                                        <OrderIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {/* {table.status !== 'available' && (
                                                <Tooltip title="Set Available">
                                                    <IconButton size="small" color="success" onClick={() => handleQuickStatusChange(table._id, 'available')}>
                                                        <AvailableIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                            {/* {table.status !== 'occupied' && table.status !== 'partially_occupied' && (
                                                <Tooltip title="Set Occupied">
                                                    <IconButton size="small" color="error" onClick={() => handleQuickStatusChange(table._id, 'occupied')}>
                                                        <OccupiedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                            {/* {table.status !== 'cleaning' && (
                                                <Tooltip title="Set Cleaning">
                                                    <IconButton size="small" color="info" onClick={() => handleQuickStatusChange(table._id, 'cleaning')}>
                                                        <CleaningIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                        </Stack>

                                        <IconButton size="small" onClick={(e) => handleOpenMenu(e, table)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                        )}
                    </>
                )}
            </TabPanel>

            {/* Tab Panel: All Bookings */}
            <TabPanel value={tabValue} index={1}>
                {/* View Switcher */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs value={bookingViewMode} onChange={(_, v) => setBookingViewMode(v)} variant={isMobile ? "fullWidth" : "standard"}>
                        <Tab icon={<ListIcon />} iconPosition="start" label="List View" />
                        <Tab icon={<TimelineIcon />} iconPosition="start" label="Timeline View" />
                    </Tabs>
                </Paper>

                {/* Filters - Shared for both views */}
                <Paper sx={{ p: 2, mb: 2.5 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        alignItems: { xs: 'stretch', md: 'center' },
                        justifyContent: 'space-between',
                        width: '100%'
                    }}>
                        {/* Date Filter */}
                        <TextField
                            label="Date"
                            type="date"
                            value={bookingDateFilter}
                            onChange={(e) => {
                                setBookingDateFilter(e.target.value);
                                setPage(0);
                            }}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{ minWidth: { xs: '100%', md: 180 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <CalendarIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Grouped Right Side: Buttons + Search */}
                        <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2,
                            alignItems: 'center',
                            width: { xs: '100%', md: 'auto' }
                        }}>
                            {/* Quick Date Buttons */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant={isToday ? 'contained' : 'outlined'}
                                    onClick={() => {
                                        setBookingDateFilter(new Date().toISOString().split('T')[0]);
                                        setPage(0);
                                    }}
                                    startIcon={<TodayIcon />}
                                    sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    Today
                                </Button>
                                <Button
                                    size="small"
                                    variant={!bookingDateFilter ? 'contained' : 'outlined'}
                                    onClick={() => {
                                        setBookingDateFilter('');
                                        setPage(0);
                                        if (bookingViewMode === 1) setBookingViewMode(0); // Switch to list if viewing all
                                    }}
                                    sx={{ whiteSpace: 'nowrap', borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    All Dates
                                </Button>
                            </Box>

                            {/* Search */}
                            <Box sx={{ display: 'flex', width: { xs: '100%', md: '300px' }, gap: 1, alignItems: 'center' }}>
                                <TextField
                                    placeholder="Search..."
                                    value={bookingSearchQuery}
                                    onChange={(e) => {
                                        setBookingSearchQuery(e.target.value);
                                        setPage(0);
                                    }}
                                    size="small"
                                    sx={{ flexGrow: 1 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                {/* Refresh Button (Commented) */}
                                {/* <Tooltip title="Refresh Bookings">
                                    <IconButton onClick={fetchBookings} disabled={bookingsLoading} size="small">
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip> */}
                            </Box>
                        </Box>
                    </Box>

                    {/* Status Filter Chips */}
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                            label={`All (${bookingStatusCounts.all})`}
                            color={bookingStatusFilter === 'all' ? 'primary' : 'default'}
                            onClick={() => { setBookingStatusFilter('all'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Pending (${bookingStatusCounts.pending})`}
                            color={bookingStatusFilter === 'pending' ? 'warning' : 'default'}
                            onClick={() => { setBookingStatusFilter('pending'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Confirmed (${bookingStatusCounts.confirmed})`}
                            color={bookingStatusFilter === 'confirmed' ? 'success' : 'default'}
                            onClick={() => { setBookingStatusFilter('confirmed'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Completed (${bookingStatusCounts.completed})`}
                            color={bookingStatusFilter === 'completed' ? 'info' : 'default'}
                            onClick={() => { setBookingStatusFilter('completed'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Cancelled (${bookingStatusCounts.cancelled})`}
                            color={bookingStatusFilter === 'cancelled' ? 'error' : 'default'}
                            onClick={() => { setBookingStatusFilter('cancelled'); setPage(0); }}
                            size="small"
                        />
                    </Stack>
                </Paper>

                {/* Date Header */}
                {bookingDateFilter && (
                    <Alert
                        severity="info"
                        icon={<CalendarIcon />}
                        sx={{ mb: 2 }}
                    >
                        Showing bookings for: <strong>{formatDate(bookingDateFilter)}</strong>
                        {isToday && <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />}
                    </Alert>
                )}

                {bookingViewMode === 0 ? (
                    <>

                        {bookingsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                                <CircularProgress />
                            </Box>
                        ) : filteredBookings.length === 0 ? (
                            <Alert severity="info" icon={<TodayIcon />}>
                                No bookings found{bookingDateFilter ? ` for ${formatDate(bookingDateFilter)}` : ''}.
                            </Alert>
                        ) : (
                            <>
                                {isMobile ? (
                                    // Premium Mobile Card View for Bookings
                                    <Stack spacing={1.5} mb={2}>
                                        {paginatedBookings.map((booking) => {
                                            const statusColor = getBookingStatusColor(booking.status);
                                            const mainColor = theme.palette[statusColor as 'primary' | 'success' | 'warning' | 'error' | 'info']?.main || theme.palette.grey[500];
                                            
                                            return (
                                                <Card 
                                                    key={booking._id}
                                                    sx={{ 
                                                        borderRadius: 2,
                                                        overflow: 'hidden',
                                                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                                        borderLeft: `4px solid ${mainColor}`,
                                                        position: 'relative',
                                                        '&:hover': { boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                                                                    ID: {booking.bookingId}
                                                                </Typography>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: -0.5, fontSize: '0.95rem' }}>
                                                                    {booking.guestInfo?.firstName} {booking.guestInfo?.lastName}
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label={booking.status?.toUpperCase()}
                                                                size="small"
                                                                sx={{ 
                                                                    fontWeight: 'bold', 
                                                                    fontSize: '0.6rem',
                                                                    height: 20,
                                                                    bgcolor: alpha(mainColor, 0.1),
                                                                    color: mainColor,
                                                                    border: `1px solid ${alpha(mainColor, 0.2)}`
                                                                }}
                                                            />
                                                        </Box>

                                                        <Grid container spacing={1} sx={{ mb: 1.5 }}>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                    <TableIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Table</Typography>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{booking.table?.tableName || `Table ${booking.table?.tableNumber}` || 'N/A'}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                    <TimeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Date & Time</Typography>
                                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}>{booking.timeSlot?.requested}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                    <SelectionIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Guests</Typography>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{booking.guests} People</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                    <SearchIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Contact</Typography>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                                            {(() => {
                                                                                const phone = booking.guestInfo?.phone || '';
                                                                                const cleaned = phone.replace(/\D/g, '');
                                                                                if (cleaned.length === 10) {
                                                                                    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
                                                                                } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
                                                                                    return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
                                                                                }
                                                                                return phone;
                                                                            })()}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                        </Grid>

                                                        <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />

                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            {booking.status === 'pending' && (
                                                                <Button 
                                                                    size="small" 
                                                                    variant="contained" 
                                                                    color="success" 
                                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'confirmed'); }}
                                                                >
                                                                    Confirm
                                                                </Button>
                                                            )}
                                                            {(() => {
                                                                const tableId = booking.table?._id || (typeof booking.table === 'string' ? booking.table : null);
                                                                const realTable = tables.find(t => t._id === tableId);
                                                                const hasActiveOrder = !!realTable?.currentOrder;

                                                                return (
                                                                    <>
                                                                        {(booking.status === 'confirmed') && (!booking.checkedIn || !hasActiveOrder) && (
                                                                            <Button 
                                                                                size="small" 
                                                                                variant="contained" 
                                                                                color="primary" 
                                                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                                                                onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                            >
                                                                                Check In
                                                                            </Button>
                                                                        )}
                                                                        {booking.checkedIn && booking.status !== 'completed' && hasActiveOrder && (
                                                                            <Button 
                                                                                size="small" 
                                                                                variant="contained" 
                                                                                color="warning" 
                                                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                                                                onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                            >
                                                                                Checkout
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                                <Button 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    color="error" 
                                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'cancelled'); }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            )}
                                                            {booking.status === 'completed' && (
                                                                <Chip label="Completed" size="small" color="info" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                    <TableCell><strong>Booking ID</strong></TableCell>
                                                    <TableCell><strong>Table</strong></TableCell>
                                                    <TableCell><strong>Date</strong></TableCell>
                                                    <TableCell><strong>Time</strong></TableCell>
                                                    <TableCell><strong>Guests</strong></TableCell>
                                                    <TableCell><strong>Customer</strong></TableCell>
                                                    <TableCell><strong>Status</strong></TableCell>
                                                    <TableCell><strong>Actions</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {paginatedBookings.map((booking) => (
                                                    <TableRow
                                                        key={booking._id}
                                                        hover
                                                        onClick={() => handleViewBooking(booking)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {booking.bookingId}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                icon={<TableIcon />}
                                                                label={booking.table?.tableName || `Table ${booking.table?.tableNumber}` || 'N/A'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatDate(booking.date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {booking.timeSlot?.requested || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={`${booking.guests} guests`}
                                                                size="small"
                                                                color="default"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {booking.guestInfo?.firstName} {booking.guestInfo?.lastName}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {(() => {
                                                                        const phone = booking.guestInfo?.phone || '';
                                                                        const cleaned = phone.replace(/\D/g, '');
                                                                        if (cleaned.length === 10) {
                                                                            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
                                                                        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
                                                                            return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
                                                                        }
                                                                        return phone;
                                                                    })()}
                                                                </Typography>
                                                                {booking.guestInfo?.email && (
                                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                                        {booking.guestInfo?.email}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={booking.status?.toUpperCase()}
                                                                color={getBookingStatusColor(booking.status) as any}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1}>
                                                                {booking.status === 'pending' && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        color="success"
                                                                        onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'confirmed'); }}
                                                                    >
                                                                        Confirm
                                                                    </Button>
                                                                )}
                                                                {(() => {
                                                                    // Find real table to check order status accurately
                                                                    const tableId = booking.table?._id || (typeof booking.table === 'string' ? booking.table : null);
                                                                    const realTable = tables.find(t => t._id === tableId);
                                                                    const hasActiveOrder = !!realTable?.currentOrder;

                                                                    // Logic:
                                                                    // Check In: (Confirmed/Pending) AND (Not Checked In OR No Active Order)
                                                                    // Checkout: Checked In AND Active Order

                                                                    return (
                                                                        <>
                                                                            {(booking.status === 'confirmed') && (!booking.checkedIn || !hasActiveOrder) && (
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="contained"
                                                                                    color="primary"
                                                                                    onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                                >
                                                                                    Check In
                                                                                </Button>
                                                                            )}
                                                                            {booking.checkedIn && booking.status !== 'completed' && hasActiveOrder && (
                                                                                <Tooltip title={hasActiveOrder ? "Go to POS to checkout" : "Finalize booking"}>
                                                                                    <span onClick={(e) => e.stopPropagation()}>
                                                                                        <Button
                                                                                            size="small"
                                                                                            variant="contained"
                                                                                            color="warning"
                                                                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                                            disabled={false}
                                                                                        >
                                                                                            Checkout
                                                                                        </Button>
                                                                                    </span>
                                                                                </Tooltip>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="error"
                                                                        onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'cancelled'); }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                )}
                                                                {booking.status === 'completed' && (
                                                                    <Chip label="Completed" size="small" color="info" variant="outlined" />
                                                                )}
                                                                {booking.status === 'cancelled' && (
                                                                    <Chip label="Cancelled" size="small" color="error" variant="outlined" />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                <TablePagination
                                    component="div"
                                    count={filteredBookings.length}
                                    page={page}
                                    onPageChange={(_, newPage) => setPage(newPage)}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={(e) => {
                                        setRowsPerPage(parseInt(e.target.value, 10));
                                        setPage(0);
                                    }}
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                />
                            </>
                        )}
                    </>
                ) : (
                    // TIMELINE VIEW CONTENT
                    <>
                        {isMobile ? (
                            <Stack spacing={2}>
                                {activeTables.map(table => {
                                    const tableBookings = bookings.filter(b => {
                                        if (!b.date) return false;
                                        const bDate = new Date(b.date);
                                        const dUTC = bDate.toISOString().split('T')[0];
                                        const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
                                        return (b.table?._id === table._id || b.table === table._id) &&
                                            (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) &&
                                            b.status !== 'cancelled';
                                    });
                                    
                                    return (
                                        <Paper key={table._id} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {table.tableName || `Table ${table.tableNumber}`}
                                                </Typography>
                                                <Chip label={`Cap: ${table.capacity}`} size="small" variant="outlined" sx={{ fontWeight: 600, height: 20, fontSize: '0.65rem' }} />
                                            </Box>
                                            
                                            {tableBookings.length > 0 ? (
                                                <Stack spacing={1}>
                                                    {tableBookings.sort((a,b) => (a.timeSlot?.requested || '').localeCompare(b.timeSlot?.requested || '')).map(booking => {
                                                        const statusColor = getBookingStatusColor(booking.status);
                                                        const mainColor = theme.palette[statusColor as 'primary' | 'success' | 'warning' | 'error' | 'info']?.main || theme.palette.grey[500];
                                                        const endTime = calculateEndTime(booking.timeSlot?.requested, booking.duration);
                                                        
                                                        return (
                                                            <Card 
                                                                key={booking._id} 
                                                                variant="outlined" 
                                                                sx={{ 
                                                                    borderRadius: 2, 
                                                                    bgcolor: alpha(mainColor, 0.04),
                                                                    borderColor: alpha(mainColor, 0.2),
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    '&:active': { transform: 'scale(0.98)' }
                                                                }}
                                                                onClick={() => handleViewBooking(booking)}
                                                            >
                                                                <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                                {booking.timeSlot?.requested} - {endTime}
                                                                            </Typography>
                                                                        </Box>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                            {booking.guestInfo?.firstName} {booking.guestInfo?.lastName?.charAt(0)}.
                                                                        </Typography>
                                                                    </Box>
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    })}
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', py: 1, bgcolor: alpha(theme.palette.grey[500], 0.05), borderRadius: 1 }}>
                                                    No bookings scheduled
                                                </Typography>
                                            )}
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <Paper sx={{ p: 2, overflowX: 'auto', maxWidth: '100%' }}>
                                <Box sx={{ minWidth: 800 }}>
                                    {/* Time Header */}
                                    <Box sx={{ display: 'flex', ml: '150px', borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                                        {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                            <Box key={i} sx={{ flex: 1, position: 'relative', borderLeft: 1, borderColor: 'divider', minHeight: '20px' }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: 0, left: 0, transform: i === 0 ? 'translateX(4px)' : 'translateX(-50%)', bgcolor: 'background.paper', px: 0.5 }}>
                                                    {timelineStartHour + i}:00
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>

                                    {/* Tables Timeline Rows */}
                                    {activeTables.map(table => (
                                        <Box key={table._id} sx={{ display: 'flex', mb: 2, alignItems: 'center', height: 50 }}>
                                            {/* Table Label */}
                                            <Box sx={{ width: '150px', pr: 2, borderRight: 1, borderColor: 'divider' }}>
                                                <Typography variant="subtitle2" noWrap>
                                                    {table.tableName || `Table ${table.tableNumber}`}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Cap: {table.capacity}
                                                </Typography>
                                            </Box>

                                            {/* Timeline Track */}
                                            <Box sx={{ flex: 1, position: 'relative', height: '100%', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                                {/* Grid Lines */}
                                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                                                    {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                                        <Box key={i} sx={{ flex: 1, borderLeft: '1px dashed #e0e0e0' }} />
                                                    ))}
                                                </Box>

                                                {/* Bookings for this table */}
                                                {bookings
                                                    .filter(b => {
                                                        if (!b.date) return false;
                                                        const bDate = new Date(b.date);
                                                        const dUTC = bDate.toISOString().split('T')[0];
                                                        const dLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
                                                        return (b.table?._id === table._id || b.table === table._id) &&
                                                            (!bookingDateFilter || dUTC === bookingDateFilter || dLocal === bookingDateFilter) &&
                                                            b.status !== 'cancelled';
                                                    })
                                                    .map(booking => {
                                                        const pos = getBookingPosition(booking);
                                                        const endTime = calculateEndTime(booking.timeSlot?.requested, booking.duration);
                                                        return (
                                                            <Tooltip
                                                                key={booking._id}
                                                                title={`${booking.guestInfo?.firstName} - ${booking.timeSlot?.requested || '?'} to ${endTime || '?'}`}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        left: pos.left,
                                                                        width: pos.width,
                                                                        top: 4,
                                                                        bottom: 4,
                                                                        bgcolor: booking.status === 'confirmed' ? 'success.light' : 'warning.light',
                                                                        border: 1,
                                                                        borderColor: booking.status === 'confirmed' ? 'success.main' : 'warning.main',
                                                                        borderRadius: 1,
                                                                        zIndex: 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        overflow: 'hidden',
                                                                        px: 0.5,
                                                                        opacity: 0.9,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => handleViewBooking(booking)}
                                                                >
                                                                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', color: '#000' }}>
                                                                        {booking.guestInfo?.firstName} ({booking.timeSlot?.requested} - {endTime})
                                                                    </Typography>
                                                                </Box>
                                                            </Tooltip>
                                                        );
                                                    })}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        )}
                    </>
                )}
            </TabPanel>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: { xs: 160, sm: 200 },
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                    }
                }}
            >
                {menuTable?.isActive === false ? (
                    <Tooltip title={canDeleteTables ? '' : "You don't have permission to restore tables"}>
                        <span>
                            <MenuItem
                                onClick={() => menuTable && handleRestoreTable(menuTable)}
                                disabled={!canDeleteTables}
                                sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 }, color: 'success.main' }}
                            >
                                <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                                    <RestoreIcon sx={{ fontSize: { xs: 16, sm: 20 } }} color="success" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Restore Table"
                                    primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, color: 'success.main', my: 0 } }}
                                />
                            </MenuItem>
                        </span>
                    </Tooltip>
                ) : [
                    <MenuItem 
                        key="book"
                        onClick={() => menuTable && handleOpenBooking(menuTable)}
                        sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 } }}
                    >
                        <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                            <BookIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Book Table" 
                            primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, my: 0 } }} 
                        />
                    </MenuItem>,
                    <MenuItem
                        key="edit"
                        onClick={() => menuTable && handleEditTable(menuTable)}
                        sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 } }}
                    >
                        <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                            <EditIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Edit Table"
                            primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, my: 0 } }}
                        />
                    </MenuItem>,
                    <MenuItem
                        key="assign-waiter"
                        onClick={() => menuTable && handleOpenAssignWaiter(menuTable)}
                        sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 } }}
                    >
                        <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                            <AssignWaiterIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Assign Waiter"
                            primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, my: 0 } }}
                        />
                    </MenuItem>,
                    <MenuItem 
                        key="history"
                        onClick={() => {
                            if (menuTable) {
                                setHistoryTargetId(menuTable._id);
                                setHistoryTitle(`Table ${menuTable.tableNumber || menuTable.tableName} History`);
                                setHistoryDialogOpen(true);
                            }
                            handleCloseMenu();
                        }}
                        sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 } }}
                    >
                        <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                            <TimelineIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </ListItemIcon>
                        <ListItemText 
                            primary="View History" 
                            primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, my: 0 } }} 
                        />
                    </MenuItem>,
                    (menuTable?.isMerged || menuTable?.isPrimary) && (
                        <MenuItem 
                            key="unmerge"
                            onClick={() => menuTable && handleUnmerge(menuTable)}
                            sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 } }}
                        >
                            <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                                <LinkOffIcon sx={{ fontSize: { xs: 16, sm: 20 } }} color="error" />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Unmerge Table(s)" 
                                primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, color: 'error.main', my: 0 } }} 
                            />
                        </MenuItem>
                    ),
                    <Divider key="div" sx={{ my: { xs: 0.25, sm: 1 } }} />,
                    <Tooltip key="delete" title={canDeleteTables ? '' : "You don't have permission to delete tables"}>
                        {/* span keeps the tooltip working while the item is disabled */}
                        <span>
                            <MenuItem
                                onClick={() => menuTable && handleDeleteTable(menuTable)}
                                disabled={!canDeleteTables}
                                sx={{ py: { xs: 0, sm: 1 }, minHeight: { xs: 32, sm: 48 }, color: 'error.main' }}
                            >
                                <ListItemIcon sx={{ minWidth: { xs: 30, sm: 40 } }}>
                                    <DeleteIcon sx={{ fontSize: { xs: 16, sm: 20 } }} color="error" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Delete Table"
                                    primaryTypographyProps={{ sx: { fontSize: { xs: '0.75rem', sm: '0.950rem' }, fontWeight: 500, color: 'error.main', my: 0 } }}
                                />
                            </MenuItem>
                        </span>
                    </Tooltip>
                ].filter(Boolean)}
            </Menu>

            {/* Add Table Dialog */}
            <AddTableDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onSuccess={() => {
                    setAddDialogOpen(false);
                    fetchTables();
                }}
                customLocations={customLocations}
                onOpenAddLocation={() => setAddLocationDialogOpen(true)}
                initialLocation={selectedRoomForAddTable}
                existingTables={tables}
            />

            {/* Edit Table Dialog */}
            <EditTableDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={() => {
                    setEditDialogOpen(false);
                    fetchTables();
                }}
                table={selectedTable}
                customLocations={customLocations}
                onOpenAddLocation={() => setAddLocationDialogOpen(true)}
                existingTables={tables}
            />

            {/* Deleted Tables & Restoration Dialog */}
            <DeletedTablesDialog
                open={deletedDialogOpen}
                onClose={() => setDeletedDialogOpen(false)}
                onRestoreSuccess={fetchTables}
                tables={tables}
            />

            {/* History Dialog */}
            <HistoryDialog
                open={historyDialogOpen}
                onClose={() => setHistoryDialogOpen(false)}
                targetId={historyTargetId}
                module="tables"
                title={historyTitle}
            />

            {/* Booking Dialog */}
            <BookingDialog
                open={bookingDialogOpen}
                onClose={() => setBookingDialogOpen(false)}
                onSuccess={() => {
                    setBookingDialogOpen(false);
                    fetchTables();
                    fetchBookings();
                }}
                table={selectedTable}
                settings={settings}
            />

            {/* View Booking Details Dialog */}
            <ViewBookingDialog
                open={viewBookingDialogOpen}
                onClose={() => setViewBookingDialogOpen(false)}
                booking={selectedBookingForView}
                tables={tables}
                onStatusChange={handleBookingStatusChange}
                onCheckIn={handleCheckIn}
                getBookingStatusColor={getBookingStatusColor}
                formatDate={formatDate}
            />

            {/* Custom Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                    <DeleteIcon sx={{ fontSize: 50, color: 'error.main', mb: 1 }} />
                    <Typography variant="h5" component="div" fontWeight="bold">
                        Confirm Delete
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
                    <Typography variant="body1">
                        Are you sure you want to delete table <strong>{tableToDelete?.tableName || tableToDelete?.tableNumber}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        The table will move to Deleted and can be restored later.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3, px: 3 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDeleteTable}
                        variant="contained"
                        color="error"
                        fullWidth
                        sx={{ borderRadius: 2 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assign Waiter Dialog */}
            <Dialog
                open={assignWaiterDialogOpen}
                onClose={() => !assigningWaiter && handleCloseAssignWaiter()}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    Assign Waiter — {assignWaiterTable?.tableName || `Table ${assignWaiterTable?.tableNumber}`}
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Waiter</InputLabel>
                        <Select
                            value={selectedWaiterId}
                            label="Waiter"
                            onChange={(e) => setSelectedWaiterId(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Unassigned</em>
                            </MenuItem>
                            {waiters.map(w => (
                                <MenuItem key={w._id} value={w._id}>
                                    {`${w.firstName || ''} ${w.lastName || ''}`.trim() || w.email}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAssignWaiter} disabled={assigningWaiter}>Cancel</Button>
                    <Button onClick={handleConfirmAssignWaiter} variant="contained" disabled={assigningWaiter}>
                        {assigningWaiter ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Custom Location Dialog */}
            <Dialog
                open={addLocationDialogOpen}
                onClose={() => setAddLocationDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    backdrop: {
                        sx: {
                            backdropFilter: 'blur(6px)',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)'
                        }
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    Add Custom Location
                    <IconButton
                        aria-label="close"
                        onClick={() => setAddLocationDialogOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 16, top: 16, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            autoFocus
                            label="Location Name"
                            fullWidth
                            value={newLocationName}
                            inputProps={{ maxLength: 40 }}
                            onChange={(e) => {
                                const val = e.target.value.replace(/^\s+/, '');
                                if (/^[a-zA-Z0-9_\-\s]*$/.test(val)) {
                                    setNewLocationName(val);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newLocationName.trim()) {
                                        const formatted = newLocationName.trim().replace(/\s+/g, '_')?.toLowerCase();
                                        if (!isValidRoomName(formatted)) {
                                            toast.error('Invalid room name. Must be 2-30 characters.');
                                            return;
                                        }
                                        if (allAvailableSections.some(sec => canonicalizeRoomKey(sec) === canonicalizeRoomKey(formatted))) {
                                            toast.error(`Room "${formatted.replace(/_/g, ' ').toUpperCase()}" already exists!`);
                                            return;
                                        }
                                        const updatedCustom = [...new Set([...customLocations, formatted])];
                                        const updatedHidden = hiddenSections.filter(s => s.toLowerCase() !== formatted);
                                        setCustomLocations(updatedCustom);
                                        setHiddenSections(updatedHidden);
                                        saveStoredCustomRooms(updatedCustom, tenantSlug || undefined);
                                        try {
                                            localStorage.setItem('pos_hidden_sections', JSON.stringify(updatedHidden));
                                            settingsAPI.update('dining_rooms', { customRooms: updatedCustom, hiddenSections: updatedHidden }).catch(() => null);
                                        } catch (e) {}
                                        if (editDialogOpen && selectedTable) {
                                            setSelectedTable({ ...selectedTable, location: formatted });
                                        }
                                        setAddLocationDialogOpen(false);
                                        setNewLocationName('');
                                        toast.success(`Room "${formatted.replace(/_/g, ' ').toUpperCase()}" created & saved`);
                                    }
                                }
                            }}
                            placeholder="e.g. Poolside"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 3, px: 3 }}>
                    <Button onClick={() => setAddLocationDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (newLocationName.trim()) {
                                const formatted = newLocationName.trim().replace(/\s+/g, '_')?.toLowerCase();
                                if (!isValidRoomName(formatted)) {
                                    toast.error('Invalid room name. Must be 2-30 characters.');
                                    return;
                                }
                                if (allAvailableSections.some(sec => canonicalizeRoomKey(sec) === canonicalizeRoomKey(formatted))) {
                                    toast.error(`Room "${formatted.replace(/_/g, ' ').toUpperCase()}" already exists!`);
                                    return;
                                }
                                const updatedCustom = [...new Set([...customLocations, formatted])];
                                const updatedHidden = hiddenSections.filter(s => s.toLowerCase() !== formatted);
                                setCustomLocations(updatedCustom);
                                setHiddenSections(updatedHidden);
                                saveStoredCustomRooms(updatedCustom, tenantSlug || undefined);
                                try {
                                    localStorage.setItem('pos_hidden_sections', JSON.stringify(updatedHidden));
                                    settingsAPI.update('dining_rooms', { customRooms: updatedCustom, hiddenSections: updatedHidden }).catch(() => null);
                                } catch (e) {}
                                if (editDialogOpen && selectedTable) {
                                    setSelectedTable({ ...selectedTable, location: formatted });
                                }
                                setAddLocationDialogOpen(false);
                                setNewLocationName('');
                                toast.success(`Room "${formatted.replace(/_/g, ' ').toUpperCase()}" created & saved`);
                            }
                        }}
                        variant="contained"
                        disabled={!newLocationName.trim()}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Merge Tables Dialog */}
            <Dialog
                open={mergeDialogOpen}
                onClose={() => setMergeDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Merge Tables 🔗</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Select 2 or more tables to combine into a single seating group. The <strong>primary table</strong> will hold the order billing session.
                    </Typography>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel id="select-tables-to-merge-label">Select Tables to Merge</InputLabel>
                        <Select
                            labelId="select-tables-to-merge-label"
                            multiple
                            value={selectedTableIds}
                            onChange={(e) => {
                                const val = typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]);
                                setSelectedTableIds(val);
                                if (!val.includes(primaryTableId)) {
                                    setPrimaryTableId(val[0] || '');
                                }
                            }}
                            input={<OutlinedInput label="Select Tables to Merge" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((id) => {
                                        const t = tables.find(item => item._id === id);
                                        return (
                                            <Chip key={id} size="small" color="primary" variant="outlined" label={t ? `T-${t.tableNumber || t.tableName}` : id} />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {tables.filter(t => t.isActive !== false).map((t) => (
                                <MenuItem key={t._id} value={t._id}>
                                    <Checkbox checked={selectedTableIds.indexOf(t._id) > -1} />
                                    <ListItemText
                                        primary={`Table ${t.tableNumber || t.tableName} (${t.capacity} seats)`}
                                        secondary={`Room: ${(t.section || t.location || 'Indoor').toUpperCase()} • Status: ${t.status}`}
                                    />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small" disabled={selectedTableIds.length < 2} sx={{ mb: 2 }}>
                        <InputLabel id="primary-table-select-label">Primary Table (Bill / Main Seating)</InputLabel>
                        <Select
                            labelId="primary-table-select-label"
                            value={primaryTableId}
                            label="Primary Table (Bill / Main Seating)"
                            onChange={(e) => setPrimaryTableId(e.target.value)}
                        >
                            {selectedTableIds.map(id => {
                                const table = tables.find(t => t._id === id);
                                return (
                                    <MenuItem key={id} value={id}>
                                        Table {table?.tableNumber} {table?.tableName ? `(${table.tableName})` : ''} — Cap: {table?.capacity}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="primary.main" fontWeight="bold">
                                Combined Capacity:
                            </Typography>
                            <Typography variant="subtitle1" color="primary.dark" fontWeight="800">
                                {selectedTableIds.reduce((sum, id) => {
                                    const table = tables.find(t => t._id === id);
                                    return sum + (table?.capacity || 0);
                                }, 0)} Guests
                            </Typography>
                        </Stack>
                    </Box>

                    {(() => {
                        const prim = tables.find(t => t._id === primaryTableId);
                        if (prim?.status === 'occupied') {
                            return (
                                <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                                    The primary table is currently occupied. Ensure the combined capacity can accommodate the guest count.
                                </Alert>
                            );
                        }
                        return null;
                    })()}
                </DialogContent>
                <DialogActions sx={{ pb: 2.5, px: 3 }}>
                    <Button onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleMerge}
                        variant="contained"
                        disabled={selectedTableIds.length < 2 || !primaryTableId || isProcessing}
                        startIcon={isProcessing && <CircularProgress size={16} color="inherit" />}
                    >
                        {isProcessing ? 'Merging...' : `Merge ${selectedTableIds.length} Tables`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── UNIFIED MERGE HUB DIALOG (TABLES & ROOMS) ── */}
            <Dialog
                open={mergeSectionsDialogOpen}
                onClose={() => setMergeSectionsDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, p: 0.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CallSplitIcon color="primary" /> 🔀 Unified Merge Hub
                    </Box>
                    <IconButton onClick={() => setMergeSectionsDialogOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <Box sx={{ px: 3, pt: 0.5 }}>
                    <Tabs
                        value={mergeHubTab}
                        onChange={(_, val) => setMergeHubTab(val)}
                        sx={{
                            minHeight: 40,
                            '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, fontSize: '0.86rem', minHeight: 40, py: 0.5 }
                        }}
                    >
                        <Tab label="🔀 Merge Dining Tables" />
                        <Tab label="🏛️ Merge Room Sections" />
                    </Tabs>
                </Box>

                <DialogContent dividers sx={{ py: 2.5, minHeight: 280 }}>
                    {mergeHubTab === 0 ? (
                        /* TAB 0: MERGE TABLES */
                        <Stack spacing={2.5}>
                            <DialogContentText sx={{ fontSize: '0.85rem' }}>
                                Combine multiple dining tables into a single large party layout. Select the primary lead table and the secondary tables to join with it.
                            </DialogContentText>

                            <FormControl fullWidth size="small">
                                <InputLabel>Primary Table (Lead Table)</InputLabel>
                                <Select
                                    value={primaryMergeTableId}
                                    label="Primary Table (Lead Table)"
                                    onChange={(e) => {
                                        setPrimaryMergeTableId(e.target.value);
                                        setSecondaryMergeTableIds(prev => prev.filter(id => id !== e.target.value));
                                    }}
                                >
                                    {tables.filter(t => t.isActive !== false && !t.isMerged).map((t: any) => (
                                        <MenuItem key={t._id} value={t._id}>
                                            Table #{t.tableNumber} {t.tableName ? `(${t.tableName})` : ''} • {t.capacity} Seats ({(t.section || t.location || 'indoor').toUpperCase()})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Secondary Tables to Join</InputLabel>
                                <Select
                                    multiple
                                    value={secondaryMergeTableIds}
                                    label="Secondary Tables to Join"
                                    onChange={(e) => {
                                        const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                        setSecondaryMergeTableIds(val);
                                    }}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((id) => {
                                                const found = tables.find(t => t._id === id);
                                                return <Chip key={id} label={`Table #${found?.tableNumber || id}`} size="small" sx={{ fontWeight: 800 }} />;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {tables.filter(t => t.isActive !== false && t._id !== primaryMergeTableId && !t.isMerged).map((t: any) => (
                                        <MenuItem key={t._id} value={t._id}>
                                            Table #{t.tableNumber} • {t.capacity} Seats ({(t.section || t.location || 'indoor').toUpperCase()})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Show currently merged tables with Unmerge button */}
                            {tables.some(t => t.isPrimary || t.isMerged) && (
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                        Currently Merged Party Tables
                                    </Typography>
                                    <Stack spacing={1}>
                                        {tables.filter(t => t.isPrimary).map(primaryTable => {
                                            const mergedSecondaries = tables.filter(t => t.mergedWith === primaryTable.number || t.mergedWith === primaryTable._id);
                                            return (
                                                <Box key={primaryTable._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={800}>
                                                            Lead Table #{primaryTable.tableNumber} + {mergedSecondaries.map(s => `Table #${s.tableNumber}`).join(', ')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            Total Combined Capacity: {primaryTable.capacity + mergedSecondaries.reduce((acc, s) => acc + (s.capacity || 0), 0)} Seats
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={() => handleUnmergeTablesConfirm(primaryTable._id)}
                                                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.5 }}
                                                    >
                                                        Unmerge
                                                    </Button>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>
                    ) : (
                        /* TAB 1: MERGE ROOMS */
                        <Stack spacing={2.5}>
                            <DialogContentText sx={{ fontSize: '0.85rem' }}>
                                Transfer all tables from a source room section into a target room section.
                            </DialogContentText>
                            <FormControl fullWidth size="small">
                                <InputLabel>Source Room (Merge From)</InputLabel>
                                <Select
                                    value={sourceSection}
                                    label="Source Room (Merge From)"
                                    onChange={(e) => setSourceSection(e.target.value)}
                                >
                                    {allAvailableSections.map((sec: string) => (
                                        <MenuItem key={sec} value={sec} sx={{ textTransform: 'capitalize' }}>
                                            {sec.replace(/_/g, ' ')} ({tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === sec.toLowerCase()).length} Tables)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Target Room (Destination Room)</InputLabel>
                                <Select
                                    value={targetSection}
                                    label="Target Room (Destination Room)"
                                    onChange={(e) => setTargetSection(e.target.value)}
                                >
                                    {allAvailableSections.filter((s: string) => s.toLowerCase() !== sourceSection.toLowerCase()).map((sec: string) => (
                                        <MenuItem key={sec} value={sec} sx={{ textTransform: 'capitalize' }}>
                                            {sec.replace(/_/g, ' ')} ({tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === sec.toLowerCase()).length} Tables)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {sourceSection && targetSection && (
                                <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                                    Reassigning {tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === sourceSection.toLowerCase()).length} tables from <strong>{sourceSection.toUpperCase()}</strong> into <strong>{targetSection.toUpperCase()}</strong>.
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setMergeSectionsDialogOpen(false)} disabled={isProcessing} variant="outlined" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                        Cancel
                    </Button>
                    {mergeHubTab === 0 ? (
                        <Button
                            onClick={handleMergeTablesConfirm}
                            variant="contained"
                            color="primary"
                            disabled={!primaryMergeTableId || secondaryMergeTableIds.length === 0 || isProcessing}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                        >
                            {isProcessing ? 'Merging...' : 'Confirm Table Merge'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleMergeSections}
                            variant="contained"
                            color="secondary"
                            disabled={!sourceSection || !targetSection || isProcessing}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                        >
                            {isProcessing ? 'Merging...' : 'Confirm Room Merge'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── UNIFIED MANAGEMENT HUB DIALOG (ROOMS & TABLES) ── */}
            <Dialog
                open={manageRoomsDialogOpen}
                onClose={() => setManageRoomsDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, p: 0.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RoomIcon color="primary" /> ⚙️ Unified Management Hub
                    </Box>
                    <IconButton onClick={() => setManageRoomsDialogOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <Box sx={{ px: 3, pt: 0.5 }}>
                    <Tabs
                        value={manageHubTab}
                        onChange={(_, val) => setManageHubTab(val)}
                        sx={{
                            minHeight: 40,
                            '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, fontSize: '0.86rem', minHeight: 40, py: 0.5 }
                        }}
                    >
                        <Tab label="🏷️ Manage Rooms & Sections" />
                        <Tab label={`🍽️ Master Tables Directory (${tables.filter(t => t.isActive !== false).length})`} />
                    </Tabs>
                </Box>

                <DialogContent dividers sx={{ minHeight: 360, py: 2.5 }}>
                    {manageHubTab === 0 ? (
                        /* TAB 0: MANAGE ROOMS */
                        <Box>
                            <DialogContentText sx={{ mb: 2, fontSize: '0.875rem' }}>
                                Manage room lifecycle: create new rooms, rename existing rooms, toggle off-season visibility, or delete unused rooms.
                            </DialogContentText>

                            {/* Inline Add New Room Bar */}
                            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1px dashed #94A3B8' }}>
                                <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 1, color: '#334155' }}>
                                    ✨ CREATE NEW ROOM
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        size="small"
                                        placeholder="e.g. Rooftop Terrace, VIP Lounge..."
                                        value={inlineAddRoomName}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/^\s+/, '');
                                            if (/^[a-zA-Z0-9_\-\s]*$/.test(val)) {
                                                setInlineAddRoomName(val);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (inlineAddRoomName.trim()) {
                                                    const norm = inlineAddRoomName.trim().toLowerCase();
                                                    if (!isValidRoomName(norm)) {
                                                        toast.error('Invalid room name. Must be 2-30 characters.');
                                                        return;
                                                    }
                                                    if (allAvailableSections.some(sec => canonicalizeRoomKey(sec) === canonicalizeRoomKey(norm))) {
                                                        toast.error(`Room "${norm.toUpperCase()}" already exists!`);
                                                        return;
                                                    }
                                                    const updatedCustom = [...new Set([...customLocations, norm])];
                                                    const updatedHidden = hiddenSections.filter(s => s.toLowerCase() !== norm);
                                                    setCustomLocations(updatedCustom);
                                                    setHiddenSections(updatedHidden);
                                                    saveStoredCustomRooms(updatedCustom, tenantSlug || undefined);
                                                    try {
                                                        localStorage.setItem('pos_hidden_sections', JSON.stringify(updatedHidden));
                                                        settingsAPI.update('dining_rooms', { customRooms: updatedCustom, hiddenSections: updatedHidden }).catch(() => null);
                                                    } catch (e) {}
                                                    toast.success(`Room "${norm.toUpperCase()}" created successfully`);
                                                    setInlineAddRoomName('');
                                                }
                                            }
                                        }}
                                        sx={{ flexGrow: 1, bgcolor: '#FFFFFF' }}
                                    />
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        disabled={inlineAddRoomName.trim().length < 2}
                                        onClick={() => {
                                            if (inlineAddRoomName.trim()) {
                                                const norm = inlineAddRoomName.trim().toLowerCase();
                                                if (!isValidRoomName(norm)) {
                                                    toast.error('Invalid room name. Must be 2-30 characters.');
                                                    return;
                                                }
                                                if (allAvailableSections.some(sec => canonicalizeRoomKey(sec) === canonicalizeRoomKey(norm))) {
                                                    toast.error(`Room "${norm.toUpperCase()}" already exists!`);
                                                    return;
                                                }
                                                const updatedCustom = [...new Set([...customLocations, norm])];
                                                const updatedHidden = hiddenSections.filter(s => s.toLowerCase() !== norm);
                                                setCustomLocations(updatedCustom);
                                                setHiddenSections(updatedHidden);
                                                saveStoredCustomRooms(updatedCustom, tenantSlug || undefined);
                                                try {
                                                    localStorage.setItem('pos_hidden_sections', JSON.stringify(updatedHidden));
                                                    settingsAPI.update('dining_rooms', { customRooms: updatedCustom, hiddenSections: updatedHidden }).catch(() => null);
                                                } catch (e) {}
                                                toast.success(`Room "${norm.toUpperCase()}" created successfully`);
                                                setInlineAddRoomName('');
                                            }
                                        }}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                                    >
                                        Add Room
                                    </Button>
                                </Stack>
                            </Paper>

                            {/* Real-Time Room Search Bar */}
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search rooms by name..."
                                value={roomSearchQuery}
                                onChange={(e) => setRoomSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: roomSearchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setRoomSearchQuery('')}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null
                                }}
                                sx={{ mb: 2, bgcolor: '#FFFFFF' }}
                            />

                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {filteredSections.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                                        No rooms match "{roomSearchQuery}"
                                    </Typography>
                                ) : (
                                    filteredSections.map((sec: string) => {
                                        const isHidden = hiddenSections.includes(sec.toLowerCase());
                                        const tableCount = tables.filter((t: any) => !t.isDeleted && t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === sec.toLowerCase()).length;
                                        return (
                                            <Paper key={sec} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: isHidden ? 'action.hover' : 'background.paper' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: isHidden ? 'grey.300' : 'primary.50', color: isHidden ? 'grey.600' : 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                                        <RoomIcon fontSize="small" />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'capitalize' }}>
                                                            {sec.replace(/_/g, ' ')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            {tableCount} Tables • Status: {isHidden ? 'Hidden (Off-Season)' : 'Visible on Canvas'}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Tooltip title={isHidden ? 'Show Room on Canvas' : 'Hide Room (Off-Season)'}>
                                                        <IconButton size="small" onClick={() => handleToggleSectionVisibility(sec)} color={isHidden ? 'default' : 'primary'}>
                                                            {isHidden ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Rename Room">
                                                        <IconButton size="small" onClick={() => { setRenameRoomSection(sec); setNewRoomSectionName(sec.replace(/_/g, ' ')); }}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete Room">
                                                        <IconButton color="error" onClick={() => { setDeleteRoomSection(sec); setDeleteRoomTargetSection(''); }} size="small">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Paper>
                                        );
                                    })
                                )}
                            </Stack>
                        </Box>
                    ) : (
                        /* TAB 1: MANAGE MASTER TABLES DIRECTORY */
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Master Dining Tables Directory
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        setManageRoomsDialogOpen(false);
                                        setAddDialogOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                                >
                                    Add New Table
                                </Button>
                            </Box>

                            {/* Real-Time Table Search Bar */}
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search by table #, name, room, status, or seats..."
                                value={masterTableSearchQuery}
                                onChange={(e) => setMasterTableSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: masterTableSearchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setMasterTableSearchQuery('')}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null
                                }}
                                sx={{ mb: 2, bgcolor: '#FFFFFF' }}
                            />

                            {(() => {
                                const q = masterTableSearchQuery.trim().toLowerCase();
                                const activeTables = tables.filter(t => t.isActive !== false);
                                const filteredTables = activeTables.filter(table => {
                                    if (!q) return true;
                                    const numStr = String(table.tableNumber || '').toLowerCase();
                                    const nameStr = String(table.tableName || '').toLowerCase();
                                    const roomStr = String(table.section || table.location || 'indoor').toLowerCase();
                                    const statusStr = String(table.status || '').toLowerCase();
                                    const capStr = `${table.capacity || 0} seats`.toLowerCase();
                                    return numStr.includes(q) || nameStr.includes(q) || roomStr.includes(q) || statusStr.includes(q) || capStr.includes(q);
                                });

                                if (filteredTables.length === 0) {
                                    return (
                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4, fontStyle: 'italic' }}>
                                            No dining tables match "{masterTableSearchQuery}"
                                        </Typography>
                                    );
                                }

                                return (
                                    <Stack spacing={1.2}>
                                        {filteredTables.map((table: any) => (
                                            <Paper key={table._id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Chip label={`#${table.tableNumber}`} size="small" color="primary" sx={{ fontWeight: 900, borderRadius: 1.5 }} />
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={800}>
                                                            Table #{table.tableNumber} {table.tableName ? `(${table.tableName})` : ''}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                            {table.capacity} Seats • Room: <b>{(table.section || table.location || 'indoor').toUpperCase()}</b> • Shape: <b>{(table.shape || 'rectangle').toUpperCase()}</b>
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip
                                                        label={table.status.toUpperCase()}
                                                        size="small"
                                                        color={table.status === 'occupied' ? 'error' : table.status === 'reserved' ? 'warning' : 'success'}
                                                        sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                                                    />
                                                    <IconButton size="small" onClick={() => { setManageRoomsDialogOpen(false); handleEditTable(table); }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteTable(table)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                );
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setManageRoomsDialogOpen(false)} variant="outlined" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── RENAME ROOM DIALOG ── */}
            <Dialog
                open={Boolean(renameRoomSection)}
                onClose={() => setRenameRoomSection(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon /> Rename Room: {renameRoomSection?.toUpperCase()}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter new name for room <strong>"{renameRoomSection?.toUpperCase()}"</strong>. All assigned tables will be updated automatically.
                    </DialogContentText>
                    <TextField
                        fullWidth
                        autoFocus
                        label="New Room Name"
                        value={newRoomSectionName}
                        onChange={(e) => {
                            const val = e.target.value.replace(/^\s+/, '');
                            if (/^[a-zA-Z0-9_\-\s]*$/.test(val)) {
                                setNewRoomSectionName(val);
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameRoomConfirm(); }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setRenameRoomSection(null)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRenameRoomConfirm}
                        variant="contained"
                        color="primary"
                        disabled={isProcessing || newRoomSectionName.trim().length < 2}
                    >
                        {isProcessing ? 'Renaming...' : 'Confirm Rename'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── DELETE ROOM CONFIRMATION DIALOG ── */}
            <Dialog
                open={Boolean(deleteRoomSection)}
                onClose={() => setDeleteRoomSection(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteIcon /> Delete Room: {deleteRoomSection?.toUpperCase()}
                </DialogTitle>
                <DialogContent>
                    {(() => {
                        if (!deleteRoomSection) return null;
                        const tablesInSec = tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === deleteRoomSection.toLowerCase());
                        if (tablesInSec.length > 0) {
                            return (
                                <Box>
                                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                                        Room <strong>{deleteRoomSection.toUpperCase()}</strong> contains <strong>{tablesInSec.length} table(s)</strong>.
                                    </Alert>
                                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
                                        Select destination room to transfer these {tablesInSec.length} tables before deleting:
                                    </Typography>
                                    <FormControl fullWidth>
                                        <InputLabel>Destination Room</InputLabel>
                                        <Select
                                            value={deleteRoomTargetSection}
                                            label="Destination Room"
                                            onChange={(e) => setDeleteRoomTargetSection(e.target.value)}
                                        >
                                            {allAvailableSections.filter((s: string) => s.toLowerCase() !== deleteRoomSection.toLowerCase()).map((sec: string) => (
                                                <MenuItem key={sec} value={sec} sx={{ textTransform: 'capitalize' }}>
                                                    {sec.replace(/_/g, ' ')} ({tables.filter((t: any) => t.isActive !== false && (t.section || t.location || 'indoor').toLowerCase() === sec.toLowerCase()).length} Tables)
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            );
                        }
                        return (
                            <DialogContentText>
                                Are you sure you want to delete room <strong>"{deleteRoomSection.toUpperCase()}"</strong>? This room is empty (0 tables).
                            </DialogContentText>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setDeleteRoomSection(null)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteRoomConfirm}
                        variant="contained"
                        color="error"
                        disabled={isProcessing}
                    >
                        Confirm Delete Room
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── CONTACTLESS DINING & TABLE QR MODAL ── */}
            <ContactlessDiningModal
                open={contactlessModalOpen}
                onClose={() => setContactlessModalOpen(false)}
                tables={tables}
                tenantSlug={tenantSlug}
            />
        </Box >
    );
};

export default TablesPage;
