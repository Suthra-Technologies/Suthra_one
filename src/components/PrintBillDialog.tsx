import {
    Close as CloseIcon,
    Download as DownloadIcon,
    Print as PrintIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import React, { useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { printBillThermal } from '../utils/printBillThermal';
import {
    formatDateTime,
    getOrderTypeLabel,
    getPaymentMethodLabel,
} from '../utils/orderWorkflows';

interface PrintBillDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
}

const PrintBillDialog: React.FC<PrintBillDialogProps> = ({ open, order, onClose }) => {
    const { settings, formatCurrency } = useSettings();
    const printRef = useRef<HTMLDivElement>(null);
    const [billData, setBillData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (open && order) {
            const fetchBillData = async () => {
                try {
                    setLoading(true);
                    // Import ordersAPI dynamically to avoid circular dependencies if any, 
                    // or just assume it's available. 
                    // Better to import at top level, but for this snippet I'll assume it's imported.
                    // Wait, I need to add the import if it's not there.
                    // It is not imported in the original file.
                    const { ordersAPI } = await import('../services/api');
                    const response = await ordersAPI.getBillData(order._id);
                    setBillData(response.data);
                } catch (error) {
                    console.error('Error fetching bill data:', error);
                    // Fallback to order data if fetch fails, but restaurant info will be missing
                    setBillData(order);
                } finally {
                    setLoading(false);
                }
            };
            fetchBillData();
        } else {
            setBillData(null);
        }
    }, [open, order]);

    const handlePrint = async () => {
        if (!billData) return;

        // Native Android Wi-Fi thermal printer (ESC/POS over TCP:9100). Fastest, no dialog.
        try {
            const printed = await printBillThermal(billData, settings.printer, formatCurrency);
            if (printed) return; // Sent to thermal printer, skip all other paths.
        } catch (err) {
            console.error('[ThermalPrint] Wi-Fi thermal print failed, falling back:', err);
            alert('Could not reach the thermal printer. Check that the printer is on and on the same Wi-Fi.');
            // Fall through to browser print so the bill can still be produced.
        }

        // Try direct printing via local print agent first (QZ Tray style fast path)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s fast timeout

            const response = await fetch('http://127.0.0.1:19001/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'bill',
                    jobId: `bill_${billData._id || Date.now()}_${Date.now()}`,
                    order: {
                        ...billData,
                        items: (billData.items || []).map((item: any) => ({
                            ...item,
                            spiceLevel: item.spiceLevel || '',
                        })),
                    },
                    timestamp: Date.now(),
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                    return; // Successfully printed locally, skip browser print dialog
                }
            }
        } catch (err) {
            console.warn('[DirectPrint] Local agent direct print failed, falling back to browser print:', err);
        }

        if (printRef.current) {
            const printWindow = window.open('', '', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Bill - Order #' + (billData?.orderNumber || '') + '</title>');
                printWindow.document.write('<style>');
                printWindow.document.write(`
                    @page {
                        size: 80mm auto;
                        margin: 0 !important;
                    }
          body {
            font-family: 'Public Sans', sans-serif;
            width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background-color: #fff;
          }
          .bill-container {
            width: 100%;
            margin: 0;
          }
          .header {
            text-align: center !important;
            margin: 0 !important;
            padding: 0 !important;
            margin-bottom: 4px !important;
          }
          .header h4, .header h1, .header p, .header h2, .header h3 {
            margin: 1px 0 !important;
            padding: 0 !important;
            line-height: 1.15 !important;
          }
          .header p {
            font-size: 10px !important;
            color: #000;
          }
          .divider {
            border-top: 1px dashed #000 !important;
            margin: 3px 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 2px 0 !important;
            table-layout: fixed !important;
          }
          .invoice-wrapper table th,
          .invoice-wrapper table td {
            padding: 3px 2px !important;
            text-align: left;
            font-size: 11px !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
          }
          th {
            background-color: #f8f9fa !important;
            border-bottom: 1px dashed #000 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td {
            border-bottom: none;
          }
          .col-item { width: 45% !important; }
          .col-qty { width: 15% !important; text-align: center !important; }
          .col-price { width: 20% !important; text-align: right !important; }
          .col-amount { width: 20% !important; text-align: right !important; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row {
            font-weight: bold;
            font-size: 13px;
            border-top: 1px dashed #000;
            margin-top: 3px;
            padding-top: 3px;
          }
          .footer {
            text-align: center !important;
            margin-top: 4px !important;
            font-size: 10.5px !important;
            color: #000;
          }
          /* Hide non-print elements */
          .no-print { display: none; }
          
          /* Utility classes for alignment */
          .flex-between {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .bold { font-weight: bold; }
          .logo {
            max-width: 45px !important;
            max-height: 45px !important;
            margin-top: 0 !important;
            margin-bottom: 2px !important;
          }
          .invoice-wrapper {
            margin: 0 !important;
            padding: 2px 8mm 4px 8mm !important; /* 8mm safety margin on both left and right edges to completely prevent physical paper roll cutoff */
            box-sizing: border-box !important;
            width: 100% !important;
          }
          th:last-child,
          td:last-child {
            padding-right: 2mm !important; /* Internal 2mm buffer so right-aligned values never touch the right border, protecting them from physical clipping */
          }
          .qr-code-section {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            margin: 6px 0 !important;
            width: 100% !important;
          }
          .qr-code-text {
            margin-top: 2px !important;
            font-weight: bold !important;
            font-size: 9px !important;
            display: block !important;
          }
 
          /* Make TAX INVOICE larger for printing */
          .tax-invoice {
            font-size: 12px !important;
            font-weight: 700 !important;
            letter-spacing: 0.5px;
            text-align: center;
            margin: 3px 0 !important;
            padding: 0 !important;
          }
 
          /* Reduce Order # size for print */
          .order-number {
            font-size: 10px !important;
          }
 
          /* Make Customer Details heading slightly larger when printing and tighten spacing */
          .customer-details {
            font-size: 11px !important;
            font-weight: 700 !important;
            margin-top: 0 !important;
            margin-bottom: 1px !important;
            padding-top: 0 !important;
            padding-bottom: 2px !important;
          }
 
          /* Reduce Name & Phone size in print and remove extra top margin */
          .customer-info {
            font-size: 10px !important;
            margin-top: 2px !important;
            padding-top: 0 !important;
            margin-bottom: 2px !important;
          }
 
          /* Remove default paragraph margins inside customer-info to tighten spacing */
          .customer-info p {
            margin: 1px 0px !important;
            padding: 0 !important;
          }
 
          /* Increase item rows font-size in printed bill */
          .invoice-wrapper table tbody td {
            font-size: 11px !important;
          }
 
          /* Grand total print styling: label and amount should match */
          .grand-total-label,
          .grand-total-amount {
            font-size: 14px !important;
            font-weight: 800 !important;
            color: #000 !important;
            line-height: 1.1 !important;
          }
 
          .totals-row {
            display: flex;
            justify-content: space-between;
            width: 95%;
            font-size: 11px;
          }
          /* Compact totals rows to remove gap between Grand Total and Payment Method */
          tr.totals-compact td {
            padding-top: 1.5px !important;
            padding-bottom: 1.5px !important;
          }
          tr.totals-compact .MuiTypography-root,
          tr.totals-compact p,
          tr.totals-compact span {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.1 !important;
            font-size: 11px !important;
          }
          .MuiDivider-root, hr {
            margin-top: 3px !important;
            margin-bottom: 3px !important;
            border-style: dashed !important;
            border-width: 1px 0 0 0 !important;
            border-color: #000 !important;
          }
        `);
                printWindow.document.write('</style></head><body>');
                printWindow.document.write(printRef.current.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();

                // Apply inline styles after the print window finishes loading so styles take effect
                // before printing. This is more reliable than trying to set styles before the DOM exists.
                printWindow.onload = () => {
                    try {
                        const gtAmount = printWindow.document.querySelector('.grand-total-amount') as HTMLElement | null;
                        const gtLabel = printWindow.document.querySelector('.grand-total-label') as HTMLElement | null;
                        if (gtAmount) {
                            gtAmount.style.setProperty('font-size', '14px', 'important');
                            gtAmount.style.setProperty('font-weight', '800', 'important');
                            gtAmount.style.setProperty('color', '#000', 'important');
                            gtAmount.style.setProperty('line-height', '1.1', 'important');
                        }
                        if (gtLabel) {
                            gtLabel.style.setProperty('font-size', '14px', 'important');
                            gtLabel.style.setProperty('font-weight', '800', 'important');
                            gtLabel.style.setProperty('color', '#000', 'important');
                            gtLabel.style.setProperty('line-height', '1.1', 'important');
                        }
                    } catch (err) {
                        // ignore silently
                    }

                    // Additional inline fallback: remove padding/margins for compact total rows
                    try {
                        const compactTds = printWindow.document.querySelectorAll('tr.totals-compact td');
                        compactTds.forEach((td) => {
                            (td as HTMLElement).style.setProperty('padding-top', '1.5px', 'important');
                            (td as HTMLElement).style.setProperty('padding-bottom', '1.5px', 'important');
                        });

                        const compactTypo = printWindow.document.querySelectorAll('tr.totals-compact .MuiTypography-root, tr.totals-compact p, tr.totals-compact span');
                        compactTypo.forEach((el) => {
                            (el as HTMLElement).style.setProperty('margin', '0', 'important');
                            (el as HTMLElement).style.setProperty('padding', '0', 'important');
                            (el as HTMLElement).style.setProperty('line-height', '1.1', 'important');
                        });
                    } catch (err) {
                        // ignore
                    }

                    try {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    } catch (err) {
                        // some browsers may block print() in onload; as a fallback use a short timeout
                        setTimeout(() => {
                            try { printWindow.print(); printWindow.close(); } catch (_) { }
                        }, 300);
                    }
                };
            }
        }
    };

    const handleDownloadPDF = async () => {
        try {
            setLoading(true);
            const { ordersAPI } = await import('../services/api');
            const response = await ordersAPI.downloadPDF(order._id);

            // Create a blob from the response data
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create a temporary link element and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Bill-${billData?.orderNumber || order._id.slice(-8)?.toUpperCase()}.pdf`);
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10, bgcolor: 'error.main',
                        color: 'common.white',
                        width: 20,
                        height: 20,
                        '&:hover': {
                            bgcolor: 'error.dark',
                        }
                    }}
                >
                    <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : billData ? (
                    <Box ref={printRef} className="invoice-wrapper" sx={{ p: 0.5 }}>


                        {/* Restaurant Header */}
                        <Box className="header" sx={{ textAlign: 'center', mb: 1 }}>
                            {billData.restaurant?.logo && (
                                <img
                                    src={billData.restaurant.logo}
                                    alt="Logo"
                                    className="logo"
                                    style={{ maxWidth: '60px', maxHeight: '60px', marginBottom: '2px', marginTop: '0px' }}
                                />
                            )}
                            <Typography variant="h4" fontWeight="bold" gutterBottom={false} sx={{ fontSize: '16px', mb: 0.25 }}>
                                {billData.restaurant?.name || 'Restaurant Name'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {billData.restaurant?.address || 'Address not available'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Phone: {billData.restaurant?.phone || 'N/A'} | Email: {billData.restaurant?.email || 'N/A'}
                            </Typography>
                            {billData.restaurant?.gstNo && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    GSTIN: {billData.restaurant.gstNo}
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 0.75, borderWidth: 1 }} />

                        {/* Bill Header */}
                        <Box sx={{ mb: 1 }}>
                            <Typography className="tax-invoice" variant="h1" fontWeight="bold" align="center" gutterBottom={false} sx={{ fontSize: '12px', mb: 0.5 }}>
                                {getOrderTypeLabel(billData.orderType)?.toUpperCase()} {billData.dailyTokenNumber ? `- Token No #${billData.dailyTokenNumber}` : ''}
                            </Typography>
                            <Stack spacing={0.25} sx={{ fontSize: '10px', lineHeight: 1.4 }}>
                                <Typography className="order-number" variant="body2" sx={{ fontSize: '10px', m: 0 }}>
                                    <strong>Order No:</strong> {billData.orderNumber || (billData._id ? billData._id.slice(-8)?.toUpperCase() : '')}
                                </Typography>
                                <Typography className="order-number" variant="body2" sx={{ fontSize: '10px', m: 0 }}>
                                    <strong>Date:</strong> {formatDateTime(billData.date || billData.createdAt)}
                                </Typography>
                                {((billData.orderType === 'dine_in' && billData.tableNumber) || billData.table) && (
                                    <Typography className="order-number" variant="body2" sx={{ fontSize: '10px', m: 0 }}>
                                        <strong>Table:</strong> {billData.tableNumber || billData.table?.tableNumber || billData.table?.number || billData.table?.tableName || billData.table?.name}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>

                        {/* Customer Info */}
                        {billData.customer?.name && (
                            <Box className="customer-info" sx={{ mb: 1 }}>
                                <Typography className="customer-details" variant="subtitle2" fontWeight="bold" gutterBottom={false} sx={{ fontSize: '12px', mb: 0.25 }}>
                                    Customer Details
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '11px' }}>Name: {/^[0-9a-fA-F]{8,24}$/.test(billData.customer.name) ? 'Guest' : billData.customer.name}</Typography>
                                {/* {billData.customer.phone && (
                                    <Typography variant="body2">Phone: {billData.customer.phone}</Typography>
                                )} */}
                            </Box>
                        )}

                        <Divider sx={{ my: 0.75 }} />

                        {/* Items & Totals Table */}
                        <TableContainer sx={{ mb: 1 }}>
                            <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableRow>
                                        <TableCell className="col-item" sx={{ fontWeight: 'bold', py: 1, px: 1, width: '45%' }}>Item</TableCell>
                                        <TableCell className="col-qty" align="center" sx={{ fontWeight: 'bold', py: 1, px: 1, width: '15%' }}>Qty</TableCell>
                                        <TableCell className="col-price" align="right" sx={{ fontWeight: 'bold', py: 1, px: 1, width: '20%' }}>Price</TableCell>
                                        <TableCell className="col-amount" align="right" sx={{ fontWeight: 'bold', py: 1, px: 1, width: '20%' }}>Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {billData.items?.filter((item: any) => item.preparationStatus !== 'cancelled').map((item: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell className="col-item" sx={{ borderBottom: 'none', py: 0.5, px: 1, width: '45%' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontSize: '12px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{item.name || item.menuItem?.name}</Typography>
                                                    {item.spiceLevel ? (
                                                        <Typography variant="caption" sx={{ color: '#000', fontWeight: 700, display: 'block', ml: 1 }}>
                                                            (Spice: {item.spiceLevel})
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                            </TableCell>
                                            <TableCell className="col-qty" align="center" sx={{ borderBottom: 'none', py: 0.5, px: 1, fontSize: '12px', width: '15%' }}>{item.quantity}</TableCell>
                                            <TableCell className="col-price" align="right" sx={{ borderBottom: 'none', py: 0.5, px: 1, fontSize: '12px', width: '20%' }}>{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="col-amount" align="right" sx={{ borderBottom: 'none', py: 0.5, px: 1, fontSize: '12px', width: '20%' }}>
                                                {formatCurrency(item.total || item.price * item.quantity)}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Subtotal with Top Border */}
                                    <TableRow className="totals-compact subtotal-row" sx={{ '& td': { borderTop: '1px dashed #000', pt: 0.5, pb: 0.5, borderBottom: 'none' } }}>
                                        <TableCell colSpan={3} sx={{ py: 0.25 }}>
                                            <Typography variant="body2">Subtotal:</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 0.25 }}>
                                            <Typography variant="body2">{formatCurrency(billData.subtotal)}</Typography>
                                        </TableCell>
                                    </TableRow>

                                    {((billData.tax?.amount || 0) + (billData.processingFee || 0)) > 0 && (
                                        <TableRow className="totals-compact tax-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Tax & Processing Fee:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency((billData.tax?.amount || 0) + (billData.processingFee || 0))}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.deliveryCharge > 0 && (
                                        <TableRow className="totals-compact delivery-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Delivery Charge:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.deliveryCharge)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.serviceCharge?.amount > 0 && (
                                        <TableRow className="totals-compact service-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Service Charge ({billData.serviceCharge.rate}%):</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.serviceCharge.amount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {(billData.discount?.amount > 0 || billData.couponDiscount > 0) && (
                                        <TableRow className="totals-compact discount-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Discount {(billData.discount?.couponCode || billData.couponCode) ? `(${billData.discount?.couponCode || billData.couponCode})` : ''}:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">-{formatCurrency(billData.discount?.amount || billData.couponDiscount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.rewardDiscount > 0 && (
                                        <TableRow className="totals-compact reward-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>Points Discount:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>-{formatCurrency(billData.rewardDiscount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {billData.tip > 0 && (
                                        <TableRow className="totals-compact tip-row">
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Tip:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.tip)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    <TableRow className="totals-compact grand-total-row">
                                        <TableCell colSpan={3} sx={{ borderBottom: 'none', pt: 0.75, pb: 0.5 }}>
                                            <Typography className="grand-total-label" variant="h6" fontWeight="bold">Grand Total:</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderBottom: 'none', pt: 0.75, pb: 0.5 }}>
                                            <Typography className="grand-total-amount" variant="h6" fontWeight="bold">{formatCurrency(billData.totalAmount)}</Typography>
                                        </TableCell>
                                    </TableRow>

                                    <TableRow className="totals-compact payment-method-row">
                                        <TableCell colSpan={3} sx={{ borderBottom: 'none', pb: 0.5 }}>
                                            <Typography variant="body2">Payment Method:</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderBottom: 'none', pb: 0.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {billData.paymentStatus === 'pending' ? 'PENDING' : getPaymentMethodLabel(billData.payments && billData.payments.length > 0 ? billData.payments.map((p: any) => p.method) : billData.paymentMethod)}
                                                    {billData.paymentMethod === 'card' && billData.cardType ? ` (${billData.cardType === 'debit' ? 'Debit' : 'Credit'})` : ''}
                                                </Typography>
                                                {billData.paymentStatus === 'paid' && (
                                                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'success.main' }}>
                                                        · PAID
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>


                        {/* QR Code for Feedback */}
                        {billData.restaurant?.slug && billData._id && (
                            <Box className="qr-code-section" sx={{ textAlign: 'center', my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <QRCodeSVG
                                    value={`${window.location.origin}/${billData.restaurant.slug}/feedback/${billData._id}`}
                                    size={80}
                                />
                                <Typography
                                    className="qr-code-text"
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 0.5, fontWeight: 'bold' }}
                                >
                                    Scan to Rate Us
                                </Typography>
                            </Box>
                        )}

                        {/* Footer */}
                        <Box className="footer" sx={{ textAlign: 'center', mt: 0.5 }}>
                            <Divider sx={{ mb: 0.5 }} />
                            <Typography variant="body2" color="text.secondary">
                                {(billData.orderType?.toLowerCase()?.includes('takeaway') || billData.orderType?.toLowerCase()?.includes('delivery'))
                                    ? 'Thank you for ordering from us!'
                                    : 'Thank you for dining with us!'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Please visit again
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="error">Failed to load bill data.</Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadPDF}
                    variant="outlined"
                    disabled={loading || !billData}
                >
                    Download PDF
                </Button>
                <Button
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    variant="contained"
                    disabled={loading || !billData}
                >
                    Print
                </Button>
            </DialogActions>
        </Dialog>
    );
};


export default PrintBillDialog;
