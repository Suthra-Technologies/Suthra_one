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
    const { formatCurrency } = useSettings();
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

    const handlePrint = () => {
        if (printRef.current) {
            const printWindow = window.open('', '', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Bill - Order #' + (billData?.orderNumber || '') + '</title>');
                printWindow.document.write('<style>');
                printWindow.document.write(`
                    @page {
                        size: 80mm auto;
                        margin: 5mm;
                    }
          body {
            font-family: 'Public Sans', sans-serif;
            width: 100%; /* Slightly less than 80mm to prevent horizontal scroll/overflow */
            margin: 0 auto;
            padding: 0;
            background-color: #fff;
          }
          .bill-container {
            width: 100%;
            margin: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p {
            margin: 2px 0;
            font-size: 12px;
            color: #000;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
          }
          th, td {
            padding: 4px 0;
            text-align: left;
            font-size: 12px;
            vertical-align: top;
          }
          th {
            border-bottom: 1px solid #000;
            font-weight: bold;
          }
          td {
            border-bottom: none;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            margin-top: 5px;
            padding-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 5px!important;
            font-size: 12px;
            color: #000;
          }
          /* Hide non-print elements */
          .no-print { display: none; }
          
          /* Utility classes for alignment */
          .flex-between {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 2px;
          }
          .bold { font-weight: bold; }
          .logo {
            max-width: 60px;
            max-height: 60px;
            margin-bottom: 5px;
          }
         .invoice-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            }
          .qr-code-section {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            margin: 20px 0 !important;
            width: 100% !important;
          }
          .qr-code-text {
            margin-top: 15px !important;
            font-weight: bold !important;
            font-size: 11px !important;
            display: block !important;
          }

                 /* Make TAX INVOICE larger for printing */
                 .tax-invoice {
                        font-size: 16px !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.5px;
                        text-align: center;
                        margin: 4px 0 6px 0;
                 }

                      /* Reduce Order # size for print */
                      .order-number {
                          font-size: 12px !important;
                      }

                      /* Make Customer Details heading slightly larger when printing and tighten spacing */
                      .customer-details {
                          font-size: 14px !important;
                          font-weight: 700 !important;
                          margin-top: 0 !important;
                          margin-bottom: 2px !important;
                          padding-top: 0 !important;
                          padding-bottom: 8px !important;
                      }

                      /* Reduce Name & Phone size in print and remove extra top margin */
                      .customer-info {
                          font-size: 11px !important;
                          margin-top: 0 !important;
                          padding-top: 0 !important;
                          margin-bottom: 4px !important;
                         
                      }

                      /* Remove default paragraph margins inside customer-info to tighten spacing */
                      .customer-info p {
                          margin: 1px 0px !important;
                          padding: 0 !important;
                          
                      }

                      /* Increase item rows font-size in printed bill */
                      .invoice-wrapper table tbody td {
                          font-size: 13px !important;
                      }

                      /* Grand total print styling: label and amount should match */
                      .grand-total-label {
                          font-size: 36px !important;
                          font-weight: 900 !important;
                          color: #000 !important;
                          line-height: 1 !important;
                      }

                      /* Make the printed Grand Total much more prominent */
                      .grand-total-amount {
                          font-size: 36px !important;
                          font-weight: 900 !important;
                          color: #000 !important;
                          line-height: 1 !important;
                      }

                 .totals-row {
                display: flex;
                justify-content: space-between;
                width: 95%;
                font-size: 12px;

        }
                /* Compact totals rows to remove gap between Grand Total and Payment Method */
                tr.totals-compact td {
                    padding-top: 2px !important;
                    padding-bottom: 4px !important;
                }
                tr.totals-compact .MuiTypography-root,
                tr.totals-compact p,
                tr.totals-compact span {
                    margin: 0 !important;
                    padding: 0 !important;
                    line-height: 1 !important;
                }
                /* Reduce the visual size a bit for printed grand total so it doesn't force extra spacing */
                .grand-total-label,
                .grand-total-amount {
                    font-size: 22px !important;
                    line-height: 1 !important;
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
                            gtAmount.style.setProperty('font-size', '18px', 'important');
                            gtAmount.style.setProperty('font-weight', '800', 'important');
                            gtAmount.style.setProperty('color', '#000', 'important');
                            gtAmount.style.setProperty('line-height', '1', 'important');
                        }
                        if (gtLabel) {
                            gtLabel.style.setProperty('font-size', '18px', 'important');
                            gtLabel.style.setProperty('font-weight', '800', 'important');
                            gtLabel.style.setProperty('color', '#000', 'important');
                            gtLabel.style.setProperty('line-height', '1', 'important');
                        }
                    } catch (err) {
                        // ignore silently
                    }

                    // Additional inline fallback: remove padding/margins for compact total rows
                    try {
                        const compactTds = printWindow.document.querySelectorAll('tr.totals-compact td');
                        compactTds.forEach((td) => {
                            (td as HTMLElement).style.setProperty('padding-top', '2px', 'important');
                            (td as HTMLElement).style.setProperty('padding-bottom', '4px', 'important');
                        });

                        const compactTypo = printWindow.document.querySelectorAll('tr.totals-compact .MuiTypography-root, tr.totals-compact p, tr.totals-compact span');
                        compactTypo.forEach((el) => {
                            (el as HTMLElement).style.setProperty('margin', '0', 'important');
                            (el as HTMLElement).style.setProperty('padding', '0', 'important');
                            (el as HTMLElement).style.setProperty('line-height', '1', 'important');
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

    const handleDownloadPDF = () => {
        alert('PDF download functionality coming soon');
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
                    <Box ref={printRef} className="invoice-wrapper" sx={{ p: 2 }}>


                        {/* Restaurant Header */}
                        <Box className="header" sx={{ textAlign: 'center', mb: 3 }}>
                            {billData.restaurant?.logo && (
                                <img
                                    src={billData.restaurant.logo}
                                    alt="Logo"
                                    className="logo"
                                    style={{ maxWidth: '80px', maxHeight: '80px', marginBottom: '10px' }}
                                />
                            )}
                            <Typography variant="h4" fontWeight="bold" gutterBottom>
                                {billData.restaurant?.name || 'Restaurant Name'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {billData.restaurant?.address || 'Address not available'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Phone: {billData.restaurant?.phone || 'N/A'} | Email: {billData.restaurant?.email || 'N/A'}
                            </Typography>
                            {billData.restaurant?.gstNo && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    GSTIN: {billData.restaurant.gstNo}
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 2, borderWidth: 2 }} />

                        {/* Bill Header */}
                        <Box sx={{ mb: 3 }}>
                            <Typography className="tax-invoice" variant="h1" fontWeight="bold" align="center" gutterBottom sx={{ fontSize: { xs: '16px', sm: '16px' } }}>
                                {getOrderTypeLabel(billData.orderType).toUpperCase()} {billData.dailyTokenNumber ? `- Token No #${billData.dailyTokenNumber}` : ''}
                            </Typography>
                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography className="order-number" variant="body2" sx={{ fontSize: '10px' }}>
                                        <strong>Order No:</strong> {billData.orderNumber || (billData._id ? billData._id.slice(-8).toUpperCase() : '')}
                                    </Typography>
                                    <Typography className="order-number" variant="body2" sx={{ fontSize: '10px' }}>
                                        <strong>Date:</strong> {formatDateTime(billData.date || billData.createdAt)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    {/* <Typography className="order-number" variant="body2" sx={{ fontSize: '10px' }}>
                                        <strong>Type:</strong> {getOrderTypeLabel(billData.orderType)}
                                    </Typography> */}
                                    {((billData.orderType === 'dine_in' && billData.tableNumber) || billData.table) && (
                                        <Typography className="order-number" variant="body2" sx={{ fontSize: '10px' }}>
                                            <strong>Table:</strong> {billData.tableNumber || billData.table?.tableNumber || billData.table?.number || billData.table?.tableName || billData.table?.name}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* Customer Info */}
                        {billData.customer?.name && (
                            <Box className="customer-info" sx={{ mb: 2 }}>
                                <Typography className="customer-details" variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: '13px' }}>
                                    Customer Details
                                </Typography>
                                <Typography variant="body2">Name: {/^[0-9a-fA-F]{8,24}$/.test(billData.customer.name) ? 'Guest' : billData.customer.name}</Typography>
                                {/* {billData.customer.phone && (
                                    <Typography variant="body2">Phone: {billData.customer.phone}</Typography>
                                )} */}
                            </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Items & Totals Table */}
                        <TableContainer sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Item</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {billData.items?.filter((item: any) => item.preparationStatus !== 'cancelled').map((item: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>
                                                <Box>
                                                    <Typography variant="body2">{item.name || item.menuItem?.name}</Typography>
                                                    {item.spiceLevel ? (
                                                        <Typography variant="caption" sx={{ color: '#000', fontWeight: 700, display: 'block', ml: 1 }}>
                                                            (Spice: {item.spiceLevel})
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center" sx={{ borderBottom: 'none', py: 0.5 }}>{item.quantity}</TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatCurrency(item.price)}</TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>
                                                {formatCurrency(item.total || item.price * item.quantity)}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Subtotal with Top Border */}
                                    <TableRow sx={{ '& td': { borderTop: '1px solid #000', pt: 1.5, borderBottom: 'none' } }}>
                                        <TableCell colSpan={3}>
                                            <Typography variant="body2">Subtotal:</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{formatCurrency(billData.subtotal)}</Typography>
                                        </TableCell>
                                    </TableRow>

                                    {((billData.tax?.amount || 0) + (billData.processingFee || 0)) > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Tax ({billData.tax?.rate || 0}%) & Processing Fee:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency((billData.tax?.amount || 0) + (billData.processingFee || 0))}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.deliveryCharge > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Delivery Charge:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.deliveryCharge)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.serviceCharge?.amount > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Service Charge ({billData.serviceCharge.rate}%):</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.serviceCharge.amount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {billData.discount?.amount > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Discount {billData.discount.code ? `(${billData.discount.code})` : ''}:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">-{formatCurrency(billData.discount.amount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {billData.rewardDiscount > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>Points Discount:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>-{formatCurrency(billData.rewardDiscount)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {billData.tip > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">Tip:</Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: 'none', py: 0.25 }}>
                                                <Typography variant="body2">{formatCurrency(billData.tip)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    <TableRow className="totals-compact grand-total-row">
                                        <TableCell colSpan={3} sx={{ borderBottom: 'none', pt: 1 }}>
                                            <Typography className="grand-total-label" variant="h6" fontWeight="bold">Grand Total:</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderBottom: 'none', pt: 1 }}>
                                            <Typography className="grand-total-amount" variant="h6" fontWeight="bold">{formatCurrency(billData.totalAmount)}</Typography>
                                        </TableCell>
                                    </TableRow>

                                    <TableRow className="totals-compact payment-method-row">
                                        <TableCell colSpan={3} sx={{ borderBottom: 'none', pb: 1 }}>
                                            <Typography variant="body2">Payment Method:</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderBottom: 'none', pb: 1 }}>
                                            <Typography variant="body2" fontWeight="bold">
                                                {billData.paymentStatus === 'pending' ? 'PENDING' : getPaymentMethodLabel(billData.payments && billData.payments.length > 0 ? billData.payments.map((p: any) => p.method) : billData.paymentMethod)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>


                        {/* QR Code for Feedback */}
                        {billData.restaurant?.slug && billData._id && (
                            <Box className="qr-code-section" sx={{ textAlign: 'center', my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <QRCodeSVG
                                    value={`${window.location.origin}/${billData.restaurant.slug}/feedback/${billData._id}`}
                                    size={80}
                                />
                                <Typography
                                    className="qr-code-text"
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 1, fontWeight: 'bold' }}
                                >
                                    Scan to Rate Us
                                </Typography>
                            </Box>
                        )}

                        {/* Footer */}
                        <Box className="footer" sx={{ textAlign: 'center', mt: 1 }}>
                            <Divider sx={{ mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Thank you for dining with us!
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
