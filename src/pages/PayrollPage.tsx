import {
    Add as AddIcon,
    AccountBalance as BankIcon,
    Badge as BadgeIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    EventBusy as LeaveIcon,
    Payments as PayrollIcon,
    PersonOff as TerminateIcon,
    PlayArrow as ProcessIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Sync as SyncIcon,
    Today as TodayIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import {
    alpha,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormHelperText,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    ListItemText,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { payrollAPI, usersAPI } from '../services/api';
import { TableSkeleton } from '../components/common/PageSkeleton';

const ITEMS_PER_PAGE = 10;

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
    active: 'success',
    inactive: 'default',
    resigned: 'warning',
    terminated: 'error',
    paid: 'success',
    pending: 'warning',
    hold: 'error',
};

const PAYSLIP_STATUS_COLORS: Record<string, string> = {
    unprocessed: '#9e9e9e',
    pending: '#ed6c02',
    paid: '#2e7d32',
    hold: '#d32f2f',
};

const DAY_COLORS: Record<string, string> = {
    present: '#2e7d32',
    half_day: '#ed6c02',
    absent: '#d32f2f',
    leave: '#0288d1',
    weekly_off: '#9e9e9e',
};

const DAY_LABELS: Record<string, string> = {
    present: 'P',
    half_day: 'H',
    absent: 'A',
    leave: 'L',
    weekly_off: '–',
};

/**
 * Job titles only — letters, digits, spaces and the punctuation real titles
 * use. Keeps URLs and markup out of the field. Mirrors the server rule in
 * payroll.service.ts.
 */
const DESIGNATION_MAX = 60;
const DESIGNATION_PATTERN = /^[\p{L}\p{M}0-9 &'./-]*$/u;
/** Dots are legal in titles ("Asst. Manager"), so domains need their own check. */
const DESIGNATION_URL_PATTERN =
    /(^|\s)(https?:|www\.|[\p{L}0-9-]+\.(com|net|org|io|co|in|us|uk|info|biz|xyz|dev|app)\b)/iu;

const designationError = (value: string): string => {
    const trimmed = (value || '').trim();
    if (trimmed.length > DESIGNATION_MAX) return `Maximum ${DESIGNATION_MAX} characters`;
    if (!DESIGNATION_PATTERN.test(trimmed)) return "Only letters, numbers, spaces and & ' . / -";
    if (DESIGNATION_URL_PATTERN.test(trimmed)) return 'Cannot contain a web address';
    return '';
};

/**
 * Numeric inputs are held as strings while the dialog is open so the field can
 * actually be emptied. Binding them straight to a number makes a cleared box
 * snap back to "0", which then sits in front of whatever is typed next ("05").
 */
const numText = (v: any): string => (v === null || v === undefined || v === '' ? '' : String(v));
const numValue = (v: string): number => (v === '' ? 0 : Number(v));

/** Blocks "-", "e"/"E" and "+" — type=number alone lets all of them through. */
const blockNonNumericKeys = (e: React.KeyboardEvent) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
};

/**
 * Keeps the leading numeric run and drops the rest, so a stray character ends
 * the value instead of being spliced out. Splicing would silently turn "22.9"
 * into "229" in an integer field — a different number, not a rejected one.
 */
const sanitizeNumText = (raw: string, allowDecimal: boolean): string => {
    const match = raw.trimStart().match(allowDecimal ? /^\d*\.?\d*/ : /^\d*/);
    return match ? match[0] : '';
};

/** US bank account numbers are digits only, typically 4–17 long. */
const ACCOUNT_MIN = 4;
const ACCOUNT_MAX = 17;
const accountNumberError = (value: string): string => {
    const v = (value || '').trim();
    if (!v) return '';
    if (!/^\d+$/.test(v)) return 'Digits only — no letters or special characters';
    if (v.length < ACCOUNT_MIN) return `Must be at least ${ACCOUNT_MIN} digits`;
    if (v.length > ACCOUNT_MAX) return `Must be ${ACCOUNT_MAX} digits or fewer`;
    return '';
};

const routingNumberError = (value: string): string => {
    const v = (value || '').trim();
    if (!v) return '';
    if (!/^\d{9}$/.test(v)) return 'Must be exactly 9 digits';
    return '';
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyProfile = {
    user: '',
    designation: '',
    basicSalary: 0,
    bonus: 0,
    allowances: 0,
    monthlyWorkingDays: 0,
    shiftHours: 8,
    weeklyOffDays: [0],
    bank: { accountNumber: '', accountName: '', routingNumber: '', accountType: 'checking', bankName: '' },
    employment: { employmentType: 'w2', filingStatus: '', workState: '', w4OnFile: false, i9OnFile: false },
    status: 'active',
};

const PayrollPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { formatCurrency } = useSettings();

    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };

    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);

    // ----- period -----
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    // ----- directory -----
    const [profiles, setProfiles] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const debounceRef = React.useRef<any>(null);

    // ----- payroll sheet -----
    const [sheet, setSheet] = useState<any>({ data: [], totals: {} });
    const [monthlySheet, setMonthlySheet] = useState<any>({ data: [], totalDays: 30 });

    // ----- dialogs -----
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<any>(emptyProfile);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [staffUsers, setStaffUsers] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    // ----- profile form validation -----
    const staffError = !editingId && !form.user ? 'Select a staff member' : '';
    const designationIssue = designationError(form.designation || '');
    const salaryError = numValue(numText(form.basicSalary)) <= 0 ? 'Enter an amount greater than 0' : '';
    const shiftHoursValue = numValue(numText(form.shiftHours));
    const shiftHoursError =
        shiftHoursValue <= 0 ? 'Enter hours greater than 0'
            : shiftHoursValue > 24 ? 'Cannot exceed 24 hours'
                : '';
    const workingDaysValue = numValue(numText(form.monthlyWorkingDays));
    const workingDaysError = workingDaysValue > 31 ? 'Cannot exceed 31 days' : '';
    const accountError = accountNumberError(form.bank?.accountNumber || '');
    const routingError = routingNumberError(form.bank?.routingNumber || '');

    const formInvalid = !!(
        staffError || designationIssue || salaryError ||
        shiftHoursError || workingDaysError || accountError || routingError
    );

    const [detail, setDetail] = useState<any>(null);
    const [detailTab, setDetailTab] = useState(0);

    /**
     * Per-action busy flags. Several buttons only open their dialog after an
     * API round-trip, so without this the page looks frozen and users click
     * again. Keyed by action name — row-level actions append the row id.
     */
    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const isBusy = (key: string) => !!busy[key];
    const runBusy = useCallback(async (key: string, fn: () => Promise<void>) => {
        setBusy((prev) => {
            if (prev[key]) return prev;
            return { ...prev, [key]: true };
        });
        try {
            await fn();
        } finally {
            setBusy((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    }, []);

    const [processTarget, setProcessTarget] = useState<any>(null);
    const [processForm, setProcessForm] = useState({ otherDeductions: 0, advanceRecovered: 0, status: 'pending', note: '' });

    const [advanceTarget, setAdvanceTarget] = useState<any>(null);
    const [advanceForm, setAdvanceForm] = useState({ amount: 0, reason: '' });

    const [leaveTarget, setLeaveTarget] = useState<any>(null);
    const [leaveForm, setLeaveForm] = useState({ date: '', type: 'paid', reason: '' });

    // ----- attendance -----
    const todayKey = new Date().toISOString().slice(0, 10);
    const [attendance, setAttendance] = useState<any>({ data: [] });
    const [markForm, setMarkForm] = useState({ date: todayKey, status: 'present' });
    const [dailyOpen, setDailyOpen] = useState(false);
    const [dailyDate, setDailyDate] = useState(todayKey);
    const [roster, setRoster] = useState<any[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return [current - 2, current - 1, current, current + 1];
    }, []);

    // ------------------------------------------------------------------
    // Loaders
    // ------------------------------------------------------------------

    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getProfiles({
                page,
                limit: ITEMS_PER_PAGE,
                search: search || undefined,
                status: statusFilter,
            });
            setProfiles(res.data?.data || []);
            setTotal(res.data?.total || 0);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    const loadSheet = useCallback(async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getSheet(month, year);
            setSheet(res.data || { data: [], totals: {} });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load payroll');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    const loadMonthlySheet = useCallback(async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getMonthlySheet(month, year);
            setMonthlySheet(res.data || { data: [], totalDays: 30 });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load attendance sheet');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        if (tab === 0) loadProfiles();
        if (tab === 1) loadSheet();
        if (tab === 2) loadMonthlySheet();
    }, [tab, loadProfiles, loadSheet, loadMonthlySheet]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setPage(1), 400);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    // ------------------------------------------------------------------
    // Profile actions
    // ------------------------------------------------------------------

    const openCreate = () =>
        runBusy('create', async () => {
            setEditingId(null);
            setForm(emptyProfile);
            try {
                const res = await usersAPI.getUsers({ limit: 200 });
                const list = res.data?.data || res.data?.users || res.data || [];
                const covered = new Set(profiles.map((p: any) => String(p.user?._id)));
                setStaffUsers(
                    (Array.isArray(list) ? list : []).filter(
                        (u: any) => !u.roles?.includes('customer') && !covered.has(String(u._id)),
                    ),
                );
            } catch {
                setStaffUsers([]);
            }
            setFormOpen(true);
        });

    const openEdit = (profile: any) => {
        setEditingId(profile._id);
        setForm({
            ...emptyProfile,
            ...profile,
            user: profile.user?._id || profile.user,
            bank: { ...emptyProfile.bank, ...(profile.bank || {}) },
            employment: { ...emptyProfile.employment, ...(profile.employment || {}) },
        });
        setFormOpen(true);
    };

    const saveProfile = async () => {
        const firstIssue =
            staffError ||
            (designationIssue && `Designation: ${designationIssue}`) ||
            (salaryError && `Basic Salary: ${salaryError}`) ||
            (shiftHoursError && `Full Shift Hours: ${shiftHoursError}`) ||
            (workingDaysError && `Paid Days / Month: ${workingDaysError}`) ||
            (accountError && `Account Number: ${accountError}`) ||
            (routingError && `Routing Number: ${routingError}`);
        if (firstIssue) {
            toast.error(firstIssue);
            return;
        }
        // The numeric inputs hold strings while being typed; coerce before send.
        const payload = {
            ...form,
            designation: (form.designation || '').trim().replace(/\s+/g, ' '),
            basicSalary: numValue(numText(form.basicSalary)),
            bonus: numValue(numText(form.bonus)),
            allowances: numValue(numText(form.allowances)),
            monthlyWorkingDays: numValue(numText(form.monthlyWorkingDays)),
            shiftHours: numValue(numText(form.shiftHours)),
        };

        try {
            setSaving(true);
            if (editingId) {
                await payrollAPI.updateProfile(editingId, payload);
                toast.success('Profile updated');
            } else {
                await payrollAPI.createProfile(payload);
                toast.success('Payroll profile created');
            }
            setFormOpen(false);
            loadProfiles();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const syncUsers = () =>
        runBusy('sync', async () => {
            try {
                setLoading(true);
                const res = await payrollAPI.syncUsers();
                toast.success(`Created ${res.data?.created ?? 0} profile(s)`);
                await loadProfiles();
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Sync failed');
                setLoading(false);
            }
        });

    const terminate = async (profile: any) => {
        if (!window.confirm(`Mark ${profile.user?.firstName || profile.employeeCode} as terminated?`)) return;
        return runBusy(`terminate:${profile._id}`, async () => {
            try {
                await payrollAPI.deactivateProfile(profile._id, { status: 'terminated' });
                toast.success('Employee marked terminated');
                await loadProfiles();
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to update');
            }
        });
    };

    const openDetail = async (profile: any, keepTab = false) =>
        runBusy(`detail:${profile._id}`, async () => {
            try {
                const res = await payrollAPI.getProfile(profile._id);
                setDetail(res.data);
                if (!keepTab) {
                    setDetailTab(0);
                    setMarkForm({ date: todayKey, status: 'present' });
                }
                loadAttendance(profile._id);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load employee');
            }
        });

    // ------------------------------------------------------------------
    // Payroll actions
    // ------------------------------------------------------------------

    const openProcess = (row: any) => {
        setProcessTarget(row);
        setProcessForm({
            otherDeductions: 0,
            advanceRecovered: row.outstandingAdvance || 0,
            status: 'pending',
            note: '',
        });
    };

    const confirmProcess = async () => {
        if (!processTarget) return;
        try {
            setSaving(true);
            await payrollAPI.processSalary(processTarget.profileId, {
                month,
                year,
                ...processForm,
                reprocess: processTarget.processed,
            });
            toast.success(
                processForm.status === 'paid'
                    ? `Salary paid for ${processTarget.employeeCode} · logged to expenses`
                    : `Salary processed for ${processTarget.employeeCode}`,
            );
            setProcessTarget(null);
            loadSheet();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to process salary');
        } finally {
            setSaving(false);
        }
    };

    const processAll = async () => {
        if (!window.confirm(`Process salary for all active staff for ${MONTHS[month - 1]} ${year}?`)) return;
        return runBusy('processAll', async () => {
            try {
                setLoading(true);
                const res = await payrollAPI.processAll({ month, year });
                const { processed = 0, skipped = 0, failed = 0 } = res.data || {};
                toast.success(`Processed ${processed}, skipped ${skipped}, failed ${failed}`);
                await loadSheet();
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Bulk processing failed');
                setLoading(false);
            }
        });
    };

    const changeStatus = async (row: any, status: string) =>
        runBusy(`status:${row.profileId}`, async () => {
            try {
                const res = await payrollAPI.updateSalaryStatus(row.profileId, { month, year, status });
                const posting = res.data?.expensePosting;
                if (status === 'paid' && posting?.posted) {
                    toast.success(`Marked paid · logged as expense ${posting.expenseNumber}`);
                } else if (status === 'paid' && posting?.reason === 'already posted') {
                    toast.success('Marked paid · expense already logged');
                } else {
                    toast.success(`Marked ${status}`);
                }
                await loadSheet();
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to update status');
            }
        });

    /**
     * Single entry point for the status column. Picking a status applies it
     * directly; an unprocessed row (or an explicit "Process…") opens the
     * dialog, since those need deduction and advance figures confirmed first.
     */
    const onStatusSelect = (row: any, value: string) => {
        if (value === '__process' || !row.processed) {
            openProcess(row);
            return;
        }
        if (value === (row.payslipStatus || 'pending')) return;
        changeStatus(row, value);
    };

    const backfillExpenses = () =>
        runBusy('backfill', async () => {
            try {
                setLoading(true);
                const res = await payrollAPI.backfillExpenses();
                const { posted = 0, failed = 0 } = res.data || {};
                toast.success(
                    posted
                        ? `Posted ${posted} salary expense(s)${failed ? `, ${failed} failed` : ''}`
                        : 'All paid salaries are already in Expenses',
                );
                await loadSheet();
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to sync expenses');
                setLoading(false);
            }
        });

    const exportPayroll = () =>
        runBusy('export', async () => {
            try {
                const res = await payrollAPI.exportPayroll(month, year);
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.download = `payroll-${month}-${year}.xlsx`;
                link.click();
                window.URL.revokeObjectURL(url);
                toast.success('Payroll exported');
            } catch {
                toast.error('Export failed');
            }
        });

    const submitAdvance = async () => {
        if (!advanceTarget || advanceForm.amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        try {
            setSaving(true);
            await payrollAPI.addAdvance(advanceTarget._id, advanceForm);
            toast.success('Advance recorded');
            setAdvanceTarget(null);
            setAdvanceForm({ amount: 0, reason: '' });
            if (detail) openDetail(detail, true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to record advance');
        } finally {
            setSaving(false);
        }
    };

    const submitLeave = async () => {
        if (!leaveTarget || !leaveForm.date) {
            toast.error('Pick a date');
            return;
        }
        try {
            setSaving(true);
            await payrollAPI.markLeave(leaveTarget._id, leaveForm as any);
            toast.success('Leave marked');
            setLeaveTarget(null);
            setLeaveForm({ date: '', type: 'paid', reason: '' });
            if (detail) openDetail(detail, true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to mark leave');
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------------
    // Attendance
    // ------------------------------------------------------------------

    const loadAttendance = useCallback(async (profileId: string) => {
        try {
            const res = await payrollAPI.getEmployeeAttendance(profileId, { limit: 60 });
            setAttendance(res.data || { data: [] });
        } catch {
            setAttendance({ data: [] });
        }
    }, []);

    const markDay = async () => {
        if (!detail || !markForm.date) {
            toast.error('Pick a date');
            return;
        }
        try {
            setSaving(true);
            await payrollAPI.markDay(detail._id, markForm);
            toast.success(`Marked ${markForm.status.replace('_', ' ')}`);
            loadAttendance(detail._id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setSaving(false);
        }
    };

    const openDaily = (date = dailyDate) =>
        runBusy('daily', async () => {
            setDailyOpen(true);
            setDailyDate(date);
            try {
                setRosterLoading(true);
                const res = await payrollAPI.getDailyRoster(date);
                setRoster(res.data?.data || []);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load roster');
                setRoster([]);
            } finally {
                setRosterLoading(false);
            }
        });

    const saveDaily = async () => {
        try {
            setSaving(true);
            const res = await payrollAPI.markBulkDay({
                date: dailyDate,
                records: roster.map((r) => ({ profileId: r.profileId, status: r.status })),
            });
            const { marked = 0, failed = 0 } = res.data || {};
            toast.success(`Marked ${marked}${failed ? `, ${failed} failed` : ''}`);
            setDailyOpen(false);
            if (tab === 2) loadMonthlySheet();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------------
    // Render helpers
    // ------------------------------------------------------------------

    const nameOf = (user: any) => (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown');

    /** Joining date lives on the User record; hireDate is the older fallback. */
    const joiningDateOf = (user: any) => {
        const raw = user?.joiningDate || user?.hireDate;
        if (!raw) return '—';
        const date = new Date(raw);
        return isNaN(date.getTime())
            ? '—'
            : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const PeriodPicker = (
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <FormControl size="small" sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { sm: 130 } }}>
                <InputLabel>Month</InputLabel>
                <Select value={month} label="Month" onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => (
                        <MenuItem key={m} value={i + 1}>{m}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { sm: 100 } }}>
                <InputLabel>Year</InputLabel>
                <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
                    {years.map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );

    return (
        <Box sx={{ p: { xs: 1.5, md: 3 } }}>
            {/* Header */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ fontSize: headingFontSize }}>
                        <PayrollIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Employees &amp; Payroll
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Salary is calculated from clock-in / clock-out records
                    </Typography>
                </Box>
                <Stack
                    direction="row" spacing={1} flexWrap="wrap" useFlexGap
                    sx={{ '& > *': { flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' } } }}
                >
                    <Button
                        startIcon={isBusy('daily') ? <CircularProgress size={16} color="inherit" /> : <TodayIcon />}
                        onClick={() => openDaily(todayKey)}
                        disabled={isBusy('daily')}
                        variant="outlined" size="small"
                    >
                        Daily{!isMobile && ' Attendance'}
                    </Button>
                    <Button
                        startIcon={isBusy('sync') ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                        onClick={syncUsers}
                        disabled={isBusy('sync')}
                        variant="outlined" size="small"
                    >
                        {isBusy('sync') ? 'Syncing…' : 'Sync Staff'}
                    </Button>
                    <Button
                        startIcon={isBusy('export') ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                        onClick={exportPayroll}
                        disabled={isBusy('export')}
                        variant="outlined" size="small"
                    >
                        {isBusy('export') ? 'Exporting…' : 'Export'}
                    </Button>
                    <Button
                        startIcon={isBusy('create') ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                        onClick={openCreate}
                        disabled={isBusy('create')}
                        variant="contained" size="small"
                    >
                        Add{!isMobile && ' Employee'}
                    </Button>
                </Stack>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant={isMobile ? 'scrollable' : 'standard'}>
                <Tab label="Employee Directory" />
                <Tab label="Monthly Payroll" />
                <Tab label="Attendance Sheet" />
            </Tabs>

            {/* ---------------- Tab 0: Directory ---------------- */}
            {tab === 0 && (
                <Paper sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search name, code, phone…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ flex: 1 }}
                        />
                        <FormControl size="small" sx={{ width: { xs: '100%', sm: 140 } }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="resigned">Resigned</MenuItem>
                                <MenuItem value="terminated">Terminated</MenuItem>
                            </Select>
                        </FormControl>
                        <IconButton onClick={loadProfiles}><RefreshIcon /></IconButton>
                    </Stack>

                    {loading ? (
                        <TableSkeleton rows={8} columns={9} />
                    ) : isMobile ? (
                        <Stack spacing={1.5}>
                            {profiles.map((p) => (
                                <Paper key={p._id} variant="outlined" sx={{ p: 1.5 }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar src={p.user?.profileImage} sx={{ width: 36, height: 36 }}>
                                            {(p.user?.firstName || '?')[0]}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{nameOf(p.user)}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                {p.employeeCode} · {p.designation || p.user?.roles?.[0] || '—'}
                                            </Typography>
                                        </Box>
                                        <Chip size="small" label={p.status} color={STATUS_COLORS[p.status] || 'default'} />
                                    </Stack>

                                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Basic {formatCurrency(p.basicSalary || 0)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            +{formatCurrency((p.bonus || 0) + (p.allowances || 0))}
                                        </Typography>
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                        Joined {joiningDateOf(p.user)}
                                    </Typography>

                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Button
                                            size="small" fullWidth variant="outlined"
                                            disabled={isBusy(`detail:${p._id}`)}
                                            startIcon={isBusy(`detail:${p._id}`) ? <CircularProgress size={14} color="inherit" /> : undefined}
                                            onClick={() => openDetail(p)}
                                        >
                                            View
                                        </Button>
                                        <Button size="small" fullWidth variant="outlined" onClick={() => openEdit(p)}>Edit</Button>
                                        <Button
                                            size="small" fullWidth color="error" variant="outlined"
                                            disabled={p.status === 'terminated' || isBusy(`terminate:${p._id}`)}
                                            startIcon={isBusy(`terminate:${p._id}`) ? <CircularProgress size={14} color="inherit" /> : undefined}
                                            onClick={() => terminate(p)}
                                        >
                                            End
                                        </Button>
                                    </Stack>
                                </Paper>
                            ))}
                            {!profiles.length && (
                                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                    No payroll profiles yet — use “Sync Staff” to import existing staff.
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Code</TableCell>
                                        <TableCell>Employee</TableCell>
                                        <TableCell>Designation</TableCell>
                                        <TableCell>Joined</TableCell>
                                        <TableCell align="right">Basic</TableCell>
                                        <TableCell align="right">Bonus</TableCell>
                                        <TableCell align="right">Allowances</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {profiles.map((p) => (
                                        <TableRow key={p._id} hover>
                                            <TableCell>{p.employeeCode}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar src={p.user?.profileImage} sx={{ width: 28, height: 28 }}>
                                                        {(p.user?.firstName || '?')[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2">{nameOf(p.user)}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {p.user?.roles?.[0] || '—'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{p.designation || '—'}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{joiningDateOf(p.user)}</TableCell>
                                            <TableCell align="right">{formatCurrency(p.basicSalary || 0)}</TableCell>
                                            <TableCell align="right">{formatCurrency(p.bonus || 0)}</TableCell>
                                            <TableCell align="right">{formatCurrency(p.allowances || 0)}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={p.status} color={STATUS_COLORS[p.status] || 'default'} />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="View">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={isBusy(`detail:${p._id}`)}
                                                            onClick={() => openDetail(p)}
                                                        >
                                                            {isBusy(`detail:${p._id}`)
                                                                ? <CircularProgress size={16} />
                                                                : <ViewIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Terminate">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            disabled={p.status === 'terminated' || isBusy(`terminate:${p._id}`)}
                                                            onClick={() => terminate(p)}
                                                        >
                                                            {isBusy(`terminate:${p._id}`)
                                                                ? <CircularProgress size={16} color="error" />
                                                                : <TerminateIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!profiles.length && (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">
                                                    No payroll profiles yet — use “Sync Staff” to import existing staff.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {total > ITEMS_PER_PAGE && (
                        <Stack alignItems="center" sx={{ mt: 2 }}>
                            <Pagination
                                count={Math.ceil(total / ITEMS_PER_PAGE)}
                                page={page}
                                onChange={(_, v) => setPage(v)}
                                size="small"
                            />
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ---------------- Tab 1: Monthly Payroll ---------------- */}
            {tab === 1 && (
                <Paper sx={{ p: 2 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                        {PeriodPicker}
                        <Box sx={{ flex: 1 }} />
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tooltip title="Post already-paid salaries that predate expense logging">
                                <span>
                                    <Button
                                        variant="outlined" onClick={backfillExpenses} size="small"
                                        disabled={isBusy('backfill')}
                                        startIcon={isBusy('backfill') ? <CircularProgress size={16} color="inherit" /> : undefined}
                                        sx={{ flex: { xs: 1, sm: 'none' } }}
                                    >
                                        {isBusy('backfill') ? 'Syncing…' : 'Sync Expenses'}
                                    </Button>
                                </span>
                            </Tooltip>
                            <Button
                                startIcon={isBusy('processAll') ? <CircularProgress size={16} color="inherit" /> : <ProcessIcon />}
                                variant="contained" onClick={processAll} size="small"
                                disabled={isBusy('processAll')}
                                sx={{ flex: { xs: 1, sm: 'none' } }}
                            >
                                {isBusy('processAll') ? 'Processing…' : 'Process All'}
                            </Button>
                            <IconButton onClick={loadSheet}><RefreshIcon /></IconButton>
                        </Stack>
                    </Stack>

                    {/* Totals */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {[
                            { label: 'Gross Payable', value: formatCurrency(sheet.totals?.grossPay || 0) },
                            { label: 'Deductions', value: formatCurrency(sheet.totals?.deductions || 0) },
                            { label: 'Net Payable', value: formatCurrency(sheet.totals?.netSalary || 0) },
                            { label: 'Processed', value: `${sheet.totals?.processed || 0} / ${sheet.count || 0}` },
                        ].map((stat) => (
                            <Grid item xs={6} md={3} key={stat.label}>
                                <Card variant="outlined">
                                    <CardContent sx={{ py: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                        <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {loading ? (
                        <TableSkeleton rows={8} columns={10} />
                    ) : isMobile ? (
                        /* Card layout on small screens so nothing scrolls sideways. */
                        <Stack spacing={1.5}>
                            {(sheet.data || []).map((row: any) => (
                                <Paper key={row.profileId} variant="outlined" sx={{ p: 1.5 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{nameOf(row.user)}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.employeeCode}</Typography>
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {formatCurrency(row.paidNetSalary ?? row.netSalary)}
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                        <Chip size="small" label={`P ${row.presentDays}`} sx={{ bgcolor: alpha(DAY_COLORS.present, 0.15), color: DAY_COLORS.present }} />
                                        <Chip size="small" label={`H ${row.halfDays}`} sx={{ bgcolor: alpha(DAY_COLORS.half_day, 0.15), color: DAY_COLORS.half_day }} />
                                        <Chip size="small" label={`A ${row.absentDays}`} sx={{ bgcolor: alpha(DAY_COLORS.absent, 0.15), color: DAY_COLORS.absent }} />
                                        <Chip size="small" label={`L ${row.leaveDays}`} sx={{ bgcolor: alpha(DAY_COLORS.leave, 0.15), color: DAY_COLORS.leave }} />
                                        <Chip size="small" label={`${row.hoursWorked}h`} variant="outlined" />
                                    </Stack>

                                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Gross {formatCurrency(row.grossPay)}
                                        </Typography>
                                        <Typography variant="caption" color="error.main">
                                            − {formatCurrency(row.attendanceDeduction)}
                                        </Typography>
                                    </Stack>

                                    <Select
                                        size="small" fullWidth
                                        value={row.processed ? (row.payslipStatus || 'pending') : 'unprocessed'}
                                        onChange={(e) => onStatusSelect(row, e.target.value)}
                                        disabled={isBusy(`status:${row.profileId}`)}
                                        sx={{
                                            mt: 1.5,
                                            fontSize: '0.78rem',
                                            color: PAYSLIP_STATUS_COLORS[row.processed ? (row.payslipStatus || 'pending') : 'unprocessed'],
                                            fontWeight: 600,
                                        }}
                                    >
                                        <MenuItem value="unprocessed" disabled>Not processed</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="paid">Paid</MenuItem>
                                        <MenuItem value="hold">Hold</MenuItem>
                                        <Divider />
                                        <MenuItem value="__process">
                                            {row.processed ? 'Reprocess…' : 'Process…'}
                                        </MenuItem>
                                    </Select>
                                </Paper>
                            ))}
                            {!(sheet.data || []).length && (
                                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                    No active employees for this period.
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employee</TableCell>
                                        <TableCell align="center">P</TableCell>
                                        <TableCell align="center">H</TableCell>
                                        <TableCell align="center">A</TableCell>
                                        <TableCell align="center">L</TableCell>
                                        <TableCell align="right">Hours</TableCell>
                                        <TableCell align="right">Gross</TableCell>
                                        <TableCell align="right">Deduction</TableCell>
                                        <TableCell align="right">Net</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(sheet.data || []).map((row: any) => (
                                        <TableRow key={row.profileId} hover>
                                            <TableCell>
                                                <Typography variant="body2">{nameOf(row.user)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{row.employeeCode}</Typography>
                                            </TableCell>
                                            <TableCell align="center">{row.presentDays}</TableCell>
                                            <TableCell align="center">{row.halfDays}</TableCell>
                                            <TableCell align="center">{row.absentDays}</TableCell>
                                            <TableCell align="center">{row.leaveDays}</TableCell>
                                            <TableCell align="right">{row.hoursWorked}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.grossPay)}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main' }}>
                                                {formatCurrency(row.attendanceDeduction)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                {formatCurrency(row.paidNetSalary ?? row.netSalary)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Select
                                                    size="small"
                                                    value={row.processed ? (row.payslipStatus || 'pending') : 'unprocessed'}
                                                    onChange={(e) => onStatusSelect(row, e.target.value)}
                                                    disabled={isBusy(`status:${row.profileId}`)}
                                                    sx={{
                                                        fontSize: '0.75rem',
                                                        minWidth: 132,
                                                        color: PAYSLIP_STATUS_COLORS[row.processed ? (row.payslipStatus || 'pending') : 'unprocessed'],
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {/* Placeholder for a row with no payslip yet. */}
                                                    <MenuItem value="unprocessed" disabled>Not processed</MenuItem>
                                                    <MenuItem value="pending">Pending</MenuItem>
                                                    <MenuItem value="paid">Paid</MenuItem>
                                                    <MenuItem value="hold">Hold</MenuItem>
                                                    <Divider />
                                                    <MenuItem value="__process">
                                                        {row.processed ? 'Reprocess…' : 'Process…'}
                                                    </MenuItem>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!(sheet.data || []).length && (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No active employees for this period.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* ---------------- Tab 2: Attendance Sheet ---------------- */}
            {tab === 2 && (
                <Paper sx={{ p: 2 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                    >
                        {PeriodPicker}
                        <Box sx={{ flex: 1 }} />
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            {Object.entries(DAY_LABELS).map(([key, label]) => (
                                <Chip
                                    key={key}
                                    size="small"
                                    label={`${label} ${key.replace('_', ' ')}`}
                                    sx={{ bgcolor: alpha(DAY_COLORS[key], 0.15), color: DAY_COLORS[key] }}
                                />
                            ))}
                            <IconButton onClick={loadMonthlySheet} size="small"><RefreshIcon /></IconButton>
                        </Stack>
                    </Stack>

                    {loading ? (
                        <TableSkeleton rows={8} columns={8} />
                    ) : isMobile ? (
                        /* 31 columns cannot fit a phone, so each employee becomes
                           a card whose days wrap instead of scrolling sideways. */
                        <Stack spacing={1.5}>
                            {(monthlySheet.data || []).map((row: any) => (
                                <Paper key={row.profileId} variant="outlined" sx={{ p: 1.5 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{nameOf(row.user)}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.employeeCode}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            P {row.presentDays} · A {row.absentDays}
                                        </Typography>
                                    </Stack>
                                    <Box
                                        sx={{
                                            mt: 1,
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))',
                                            gap: 0.5,
                                        }}
                                    >
                                        {(row.days || []).map((day: any, i: number) => (
                                            <Box
                                                key={day.date}
                                                title={`${day.date} · ${day.status} · ${day.hours}h`}
                                                sx={{
                                                    textAlign: 'center',
                                                    borderRadius: 0.75,
                                                    py: 0.4,
                                                    fontSize: '0.62rem',
                                                    lineHeight: 1.3,
                                                    fontWeight: 700,
                                                    color: DAY_COLORS[day.status],
                                                    bgcolor: alpha(DAY_COLORS[day.status] || '#000', 0.12),
                                                }}
                                            >
                                                <Box sx={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 400 }}>{i + 1}</Box>
                                                {DAY_LABELS[day.status]}
                                            </Box>
                                        ))}
                                    </Box>
                                </Paper>
                            ))}
                            {!(monthlySheet.data || []).length && (
                                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                    No data for this period.
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            Employee
                                        </TableCell>
                                        {Array.from({ length: monthlySheet.totalDays || 30 }, (_, i) => (
                                            <TableCell key={i} align="center" sx={{ px: 0, fontSize: '0.68rem' }}>
                                                {i + 1}
                                            </TableCell>
                                        ))}
                                        <TableCell align="center">P</TableCell>
                                        <TableCell align="center">A</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(monthlySheet.data || []).map((row: any) => (
                                        <TableRow key={row.profileId} hover>
                                            <TableCell>
                                                <Typography variant="body2" noWrap>{nameOf(row.user)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{row.employeeCode}</Typography>
                                            </TableCell>
                                            {(row.days || []).map((day: any) => (
                                                <Tooltip key={day.date} title={`${day.date} · ${day.status} · ${day.hours}h`}>
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            px: 0,
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            color: DAY_COLORS[day.status],
                                                            bgcolor: alpha(DAY_COLORS[day.status] || '#000', 0.1),
                                                        }}
                                                    >
                                                        {DAY_LABELS[day.status]}
                                                    </TableCell>
                                                </Tooltip>
                                            ))}
                                            <TableCell align="center">{row.presentDays}</TableCell>
                                            <TableCell align="center">{row.absentDays}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!(monthlySheet.data || []).length && (
                                        <TableRow>
                                            <TableCell colSpan={35} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No data for this period.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* ---------------- Create / Edit dialog ---------------- */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle>
                    {editingId ? 'Edit Payroll Profile' : 'New Payroll Profile'}
                    <IconButton onClick={() => setFormOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        {!editingId && (
                            <Grid item xs={12}>
                                <FormControl fullWidth size="small" required error={!!staffError}>
                                    <InputLabel>Staff Member</InputLabel>
                                    <Select
                                        value={form.user}
                                        label="Staff Member"
                                        onChange={(e) => setForm({ ...form, user: e.target.value })}
                                    >
                                        {staffUsers.map((u) => (
                                            <MenuItem key={u._id} value={u._id}>
                                                {u.firstName} {u.lastName} — {u.roles?.[0]}
                                            </MenuItem>
                                        ))}
                                        {!staffUsers.length && (
                                            <MenuItem value="" disabled>
                                                No staff without a payroll profile
                                            </MenuItem>
                                        )}
                                    </Select>
                                    <FormHelperText>{staffError || 'Required'}</FormHelperText>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" label="Designation" value={form.designation || ''}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                onBlur={(e) => setForm({ ...form, designation: e.target.value.trim().replace(/\s+/g, ' ') })}
                                inputProps={{ maxLength: DESIGNATION_MAX }}
                                error={!!designationError(form.designation || '')}
                                helperText={
                                    designationError(form.designation || '') ||
                                    `e.g. Head Chef · ${(form.designation || '').length}/${DESIGNATION_MAX}`
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select value={form.status} label="Status" onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="resigned">Resigned</MenuItem>
                                    <MenuItem value="terminated">Terminated</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}><Divider textAlign="left"><Chip icon={<PayrollIcon />} label="Pay Structure" size="small" /></Divider></Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" type="number" label="Basic Salary"
                                value={numText(form.basicSalary)}
                                onKeyDown={blockNonNumericKeys}
                                onChange={(e) => setForm({ ...form, basicSalary: sanitizeNumText(e.target.value, true) })}
                                onBlur={(e) => setForm({ ...form, basicSalary: numValue(sanitizeNumText(e.target.value, true)) })}
                                inputProps={{ min: 0, step: '0.01' }}
                                error={!!salaryError}
                                helperText={salaryError || 'Monthly gross before deductions'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" type="number" label="Bonus / Differential"
                                value={numText(form.bonus)}
                                onKeyDown={blockNonNumericKeys}
                                onChange={(e) => setForm({ ...form, bonus: sanitizeNumText(e.target.value, true) })}
                                onBlur={(e) => setForm({ ...form, bonus: numValue(sanitizeNumText(e.target.value, true)) })}
                                inputProps={{ min: 0, step: '0.01' }}
                                helperText="Leave 0 if none"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" type="number" label="Allowances"
                                value={numText(form.allowances)}
                                onKeyDown={blockNonNumericKeys}
                                onChange={(e) => setForm({ ...form, allowances: sanitizeNumText(e.target.value, true) })}
                                onBlur={(e) => setForm({ ...form, allowances: numValue(sanitizeNumText(e.target.value, true)) })}
                                inputProps={{ min: 0, step: '0.01' }}
                                helperText="Leave 0 if none"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" type="number" label="Paid Days / Month (0 = calendar)"
                                value={numText(form.monthlyWorkingDays)}
                                onKeyDown={blockNonNumericKeys}
                                onChange={(e) => setForm({ ...form, monthlyWorkingDays: sanitizeNumText(e.target.value, false) })}
                                onBlur={(e) => setForm({ ...form, monthlyWorkingDays: numValue(sanitizeNumText(e.target.value, false)) })}
                                inputProps={{ min: 0, max: 31, step: 1 }}
                                error={!!workingDaysError}
                                helperText={workingDaysError || 'Divisor for the daily rate · 0 = use calendar month'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" type="number" label="Full Shift Hours"
                                value={numText(form.shiftHours)}
                                onKeyDown={blockNonNumericKeys}
                                onChange={(e) => setForm({ ...form, shiftHours: sanitizeNumText(e.target.value, true) })}
                                onBlur={(e) => setForm({ ...form, shiftHours: numValue(sanitizeNumText(e.target.value, true)) })}
                                inputProps={{ min: 1, max: 24, step: '0.5' }}
                                error={!!shiftHoursError}
                                helperText={shiftHoursError || 'Below 75% of this counts as a half day'}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Weekly Offs</InputLabel>
                                <Select
                                    multiple
                                    value={form.weeklyOffDays || []}
                                    label="Weekly Offs"
                                    onChange={(e) => {
                                        const picked = e.target.value as number[];
                                        setForm({ ...form, weeklyOffDays: [...picked].sort((a, b) => a - b) });
                                    }}
                                    renderValue={(selected: any) =>
                                        !(selected as number[]).length ? (
                                            <Typography variant="body2" color="text.secondary">None</Typography>
                                        ) : (
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                {(selected as number[]).map((d) => (
                                                    <Chip key={d} size="small" label={WEEKDAYS_SHORT[d]} />
                                                ))}
                                            </Stack>
                                        )
                                    }
                                >
                                    {WEEKDAYS.map((d, i) => (
                                        <MenuItem key={d} value={i}>
                                            <Checkbox
                                                size="small"
                                                checked={(form.weeklyOffDays || []).includes(i)}
                                                sx={{ py: 0, mr: 1 }}
                                            />
                                            <ListItemText primary={d} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}><Divider textAlign="left"><Chip icon={<BankIcon />} label="Bank" size="small" /></Divider></Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" label="Account Number" value={form.bank?.accountNumber || ''}
                                onChange={(e) => setForm({
                                    ...form,
                                    bank: { ...form.bank, accountNumber: e.target.value.replace(/\D/g, '').slice(0, ACCOUNT_MAX) },
                                })}
                                inputProps={{ inputMode: 'numeric', maxLength: ACCOUNT_MAX }}
                                error={!!accountError}
                                helperText={accountError || `${ACCOUNT_MIN}–${ACCOUNT_MAX} digits`}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" label="Account Name" value={form.bank?.accountName || ''}
                                onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountName: e.target.value } })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" label="Routing Number" value={form.bank?.routingNumber || ''}
                                onChange={(e) => setForm({
                                    ...form,
                                    bank: { ...form.bank, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) },
                                })}
                                inputProps={{ inputMode: 'numeric', maxLength: 9 }}
                                error={!!routingError}
                                helperText={routingError || '9-digit ABA routing number'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Account Type</InputLabel>
                                <Select
                                    value={form.bank?.accountType || 'checking'} label="Account Type"
                                    onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountType: e.target.value } })}
                                >
                                    <MenuItem value="checking">Checking</MenuItem>
                                    <MenuItem value="savings">Savings</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth size="small" label="Bank Name" value={form.bank?.bankName || ''}
                                onChange={(e) => setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } })}
                            />
                        </Grid>

                        <Grid item xs={12}><Divider textAlign="left"><Chip icon={<BadgeIcon />} label="Employment &amp; Tax" size="small" /></Divider></Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Employment Type</InputLabel>
                                <Select
                                    value={form.employment?.employmentType || 'w2'} label="Employment Type"
                                    onChange={(e) => setForm({ ...form, employment: { ...form.employment, employmentType: e.target.value } })}
                                >
                                    <MenuItem value="w2">W-2 Employee</MenuItem>
                                    <MenuItem value="1099">1099 Contractor</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Filing Status</InputLabel>
                                <Select
                                    value={form.employment?.filingStatus || ''} label="Filing Status"
                                    onChange={(e) => setForm({ ...form, employment: { ...form.employment, filingStatus: e.target.value } })}
                                >
                                    <MenuItem value="single">Single</MenuItem>
                                    <MenuItem value="married_joint">Married — Filing Jointly</MenuItem>
                                    <MenuItem value="married_separate">Married — Filing Separately</MenuItem>
                                    <MenuItem value="head_of_household">Head of Household</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" label="Work State" value={form.employment?.workState || ''}
                                onChange={(e) => setForm({ ...form, employment: { ...form.employment, workState: e.target.value } })}
                                inputProps={{ maxLength: 2 }}
                                helperText="2-letter code, e.g. GA"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>W-4 on File</InputLabel>
                                <Select
                                    value={form.employment?.w4OnFile ? 'yes' : 'no'} label="W-4 on File"
                                    onChange={(e) => setForm({ ...form, employment: { ...form.employment, w4OnFile: e.target.value === 'yes' } })}
                                >
                                    <MenuItem value="yes">Yes</MenuItem>
                                    <MenuItem value="no">No</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>I-9 on File</InputLabel>
                                <Select
                                    value={form.employment?.i9OnFile ? 'yes' : 'no'} label="I-9 on File"
                                    onChange={(e) => setForm({ ...form, employment: { ...form.employment, i9OnFile: e.target.value === 'yes' } })}
                                >
                                    <MenuItem value="yes">Yes</MenuItem>
                                    <MenuItem value="no">No</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained" onClick={saveProfile}
                        disabled={saving || formInvalid}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---------------- Process salary dialog ---------------- */}
            <Dialog open={!!processTarget} onClose={() => setProcessTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Process Salary — {processTarget?.employeeCode}
                    <Typography variant="body2" color="text.secondary">
                        {MONTHS[month - 1]} {year}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {processTarget && (
                        <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2">Present / Half / Absent / Leave</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {processTarget.presentDays} / {processTarget.halfDays} / {processTarget.absentDays} / {processTarget.leaveDays}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2">Gross Pay</Typography>
                                <Typography variant="body2" fontWeight={600}>{formatCurrency(processTarget.grossPay)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2">Attendance Deduction</Typography>
                                <Typography variant="body2" color="error.main" fontWeight={600}>
                                    − {formatCurrency(processTarget.attendanceDeduction)}
                                </Typography>
                            </Stack>
                            <Divider />
                            <TextField
                                size="small" type="number" label="Other Deductions" value={processForm.otherDeductions}
                                onChange={(e) => setProcessForm({ ...processForm, otherDeductions: Number(e.target.value) })}
                            />
                            <TextField
                                size="small" type="number" label="Advance Recovery"
                                value={processForm.advanceRecovered}
                                onChange={(e) => setProcessForm({ ...processForm, advanceRecovered: Number(e.target.value) })}
                                helperText={`Outstanding: ${formatCurrency(processTarget.outstandingAdvance || 0)}`}
                            />
                            <FormControl size="small">
                                <InputLabel>Mark As</InputLabel>
                                <Select
                                    value={processForm.status} label="Mark As"
                                    onChange={(e) => setProcessForm({ ...processForm, status: e.target.value })}
                                >
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="paid">Paid</MenuItem>
                                    <MenuItem value="hold">Hold</MenuItem>
                                </Select>
                            </FormControl>
                            {processForm.status === 'paid' && (
                                <Typography variant="caption" color="text.secondary">
                                    Marking paid records this salary under “salaries” in Expenses.
                                </Typography>
                            )}
                            <TextField
                                size="small" label="Note" value={processForm.note}
                                onChange={(e) => setProcessForm({ ...processForm, note: e.target.value })}
                            />
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="subtitle1" fontWeight={700}>Net Salary</Typography>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {formatCurrency(
                                        Math.max(
                                            0,
                                            (processTarget.grossPay || 0) -
                                            (processTarget.attendanceDeduction || 0) -
                                            (processForm.otherDeductions || 0) -
                                            Math.min(processForm.advanceRecovered || 0, processTarget.outstandingAdvance || 0),
                                        ),
                                    )}
                                </Typography>
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProcessTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained" onClick={confirmProcess} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {saving ? 'Processing…' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---------------- Employee detail dialog ---------------- */}
            <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle>
                    {nameOf(detail?.user)}
                    <Typography variant="body2" color="text.secondary">
                        {detail?.employeeCode} · {detail?.designation || detail?.user?.roles?.[0]}
                    </Typography>
                    <IconButton onClick={() => setDetail(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Tabs
                        value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}
                        variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
                    >
                        <Tab label="Profile" />
                        <Tab label="Attendance" />
                        <Tab label="Salary History" />
                        <Tab label="Advances" />
                        <Tab label="Leaves" />
                    </Tabs>

                    {detailTab === 0 && detail && (
                        <Grid container spacing={2}>
                            {[
                                ['Email', detail.user?.email],
                                ['Phone', detail.user?.phone],
                                ['Role', detail.user?.roles?.[0]],
                                ['Department', detail.user?.department],
                                ['Joined', joiningDateOf(detail.user)],
                                ['Basic Salary', formatCurrency(detail.basicSalary || 0)],
                                ['Bonus', formatCurrency(detail.bonus || 0)],
                                ['Allowances', formatCurrency(detail.allowances || 0)],
                                ['Shift Hours', detail.shiftHours],
                                ['Bank Account', detail.bank?.accountNumber ? `••••${String(detail.bank.accountNumber).slice(-4)}` : ''],
                                ['Routing Number', detail.bank?.routingNumber],
                                ['Account Type', detail.bank?.accountType],
                                ['Employment Type', detail.employment?.employmentType === '1099' ? '1099 Contractor' : 'W-2 Employee'],
                                ['Work State', detail.employment?.workState],
                                ['W-4 / I-9', `${detail.employment?.w4OnFile ? 'W-4 ✓' : 'W-4 ✗'} · ${detail.employment?.i9OnFile ? 'I-9 ✓' : 'I-9 ✗'}`],
                            ].map(([label, value]) => (
                                <Grid item xs={6} sm={4} key={label as string}>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                    <Typography variant="body2">{value || '—'}</Typography>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {detailTab === 1 && (
                        <>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
                                alignItems={{ xs: 'stretch', sm: 'flex-end' }} sx={{ mb: 2 }}
                            >
                                <TextField
                                    size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                                    value={markForm.date}
                                    onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                                    inputProps={{ max: todayKey }}
                                    sx={{ width: { xs: '100%', sm: 170 } }}
                                />
                                <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={markForm.status} label="Status"
                                        onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
                                    >
                                        <MenuItem value="present">Present</MenuItem>
                                        <MenuItem value="half_day">Half Day</MenuItem>
                                        <MenuItem value="absent">Absent</MenuItem>
                                        <MenuItem value="leave">Leave</MenuItem>
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained" onClick={markDay} disabled={saving}
                                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                                    sx={{ flex: { xs: 'none', sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
                                >
                                    {saving ? 'Saving…' : 'Mark'}
                                </Button>
                            </Stack>

                            <Typography variant="caption" color="text.secondary">
                                Marking writes a shift record — the same data clock-in/out produces.
                            </Typography>

                            <TableContainer sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Clock In</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Clock Out</TableCell>
                                            <TableCell align="right">Hours</TableCell>
                                            <TableCell align="right">Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(attendance?.data || []).map((r: any) => (
                                            <TableRow
                                                key={r._id}
                                                sx={{ bgcolor: alpha(DAY_COLORS[r.dayStatus] || '#000', 0.06) }}
                                            >
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(r.clockInTime).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                    {new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                    {r.clockOutTime
                                                        ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : '—'}
                                                </TableCell>
                                                <TableCell align="right">{r.totalHours}</TableCell>
                                                <TableCell align="right" sx={{ color: DAY_COLORS[r.dayStatus], fontWeight: 700 }}>
                                                    {r.dayStatus === 'half_day' ? 'Half Day' : r.dayStatus === 'present' ? 'Present' : 'Absent'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!(attendance?.data || []).length && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">No attendance records yet.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}

                    {detailTab === 2 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Period</TableCell>
                                        <TableCell align="center">P/H/A/L</TableCell>
                                        <TableCell align="right">Gross</TableCell>
                                        <TableCell align="right">Deductions</TableCell>
                                        <TableCell align="right">Net</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(detail?.salaryHistory || []).slice().reverse().map((s: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell>{MONTHS[s.month - 1]} {s.year}</TableCell>
                                            <TableCell align="center">
                                                {s.presentDays}/{s.halfDays}/{s.absentDays}/{s.leaveDays}
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(s.grossPay)}</TableCell>
                                            <TableCell align="right">
                                                {formatCurrency((s.attendanceDeduction || 0) + (s.otherDeductions || 0) + (s.advanceRecovered || 0))}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(s.netSalary)}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={s.status} color={STATUS_COLORS[s.status] || 'default'} />
                                                {s.expenseNumber && (
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                                        {s.expenseNumber}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!(detail?.salaryHistory || []).length && (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No salary processed yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {detailTab === 3 && (
                        <>
                            <Button
                                size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
                                onClick={() => setAdvanceTarget(detail)}
                            >
                                Issue Advance
                            </Button>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell align="right">Repaid</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(detail?.advances || []).map((a: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{a.reason || '—'}</TableCell>
                                                <TableCell align="right">{formatCurrency(a.amount)}</TableCell>
                                                <TableCell align="right">{formatCurrency(a.repaidAmount || 0)}</TableCell>
                                                <TableCell><Chip size="small" label={a.status} /></TableCell>
                                            </TableRow>
                                        ))}
                                        {!(detail?.advances || []).length && (
                                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No advances.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}

                    {detailTab === 4 && (
                        <>
                            <Button
                                size="small" startIcon={<LeaveIcon />} sx={{ mb: 1 }}
                                onClick={() => setLeaveTarget(detail)}
                            >
                                Mark Leave
                            </Button>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Reason</TableCell>
                                            <TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(detail?.leaves || []).map((l: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>{new Date(l.date).toLocaleDateString()}</TableCell>
                                                <TableCell><Chip size="small" label={l.type} /></TableCell>
                                                <TableCell>{l.reason || '—'}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small" color="error"
                                                        onClick={async () => {
                                                            try {
                                                                await payrollAPI.removeLeave(detail._id, new Date(l.date).toISOString().slice(0, 10));
                                                                toast.success('Leave removed');
                                                                openDetail(detail, true);
                                                            } catch {
                                                                toast.error('Failed to remove leave');
                                                            }
                                                        }}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!(detail?.leaves || []).length && (
                                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>No leaves marked.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ---------------- Advance dialog ---------------- */}
            <Dialog open={!!advanceTarget} onClose={() => setAdvanceTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Issue Advance</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            size="small" type="number" label="Amount" value={advanceForm.amount}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                        />
                        <TextField
                            size="small" label="Reason" value={advanceForm.reason}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdvanceTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained" onClick={submitAdvance} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---------------- Daily attendance dialog ---------------- */}
            <Dialog open={dailyOpen} onClose={() => setDailyOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>
                    Daily Attendance
                    <IconButton onClick={() => setDailyOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} spacing={1}
                        alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}
                    >
                        <TextField
                            size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                            value={dailyDate}
                            onChange={(e) => openDaily(e.target.value)}
                            inputProps={{ max: todayKey }}
                            sx={{ width: { xs: '100%', sm: 170 } }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <Button
                            size="small"
                            onClick={() => setRoster(roster.map((r) => ({ ...r, status: 'present' })))}
                        >
                            All Present
                        </Button>
                    </Stack>

                    {rosterLoading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : (
                        <Stack spacing={1}>
                            {roster.map((r, i) => (
                                <Paper key={r.profileId} variant="outlined" sx={{ p: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Avatar src={r.user?.profileImage} sx={{ width: 30, height: 30 }}>
                                            {(r.user?.firstName || '?')[0]}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>{nameOf(r.user)}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.employeeCode}
                                                {r.recorded ? ` · ${r.hours}h recorded` : ''}
                                            </Typography>
                                        </Box>
                                        <Select
                                            size="small"
                                            value={r.status}
                                            onChange={(e) => {
                                                const next = [...roster];
                                                next[i] = { ...r, status: e.target.value };
                                                setRoster(next);
                                            }}
                                            sx={{ minWidth: 118, fontSize: '0.8rem' }}
                                        >
                                            <MenuItem value="present">Present</MenuItem>
                                            <MenuItem value="half_day">Half Day</MenuItem>
                                            <MenuItem value="absent">Absent</MenuItem>
                                            <MenuItem value="leave">Leave</MenuItem>
                                        </Select>
                                    </Stack>
                                </Paper>
                            ))}
                            {!roster.length && (
                                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                                    No active employees.
                                </Typography>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDailyOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained" onClick={saveDaily} disabled={saving || rosterLoading || !roster.length}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {saving ? 'Saving…' : `Save ${roster.length} Record(s)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---------------- Leave dialog ---------------- */}
            <Dialog open={!!leaveTarget} onClose={() => setLeaveTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Mark Leave</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            size="small" type="date" label="Date" InputLabelProps={{ shrink: true }}
                            value={leaveForm.date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                        />
                        <FormControl size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={leaveForm.type} label="Type"
                                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                            >
                                <MenuItem value="paid">Paid Leave</MenuItem>
                                <MenuItem value="unpaid">Unpaid Leave</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small" label="Reason" value={leaveForm.reason}
                            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLeaveTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained" onClick={submitLeave} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayrollPage;
