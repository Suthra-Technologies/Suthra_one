import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

interface CustomItemDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (name: string, price: number, quantity: number, notes?: string) => void;
}

const CustomItemDialog: React.FC<CustomItemDialogProps> = ({ open, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');

    const handleAdd = () => {
        if (!name.trim()) return;
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) return;
        const numQuantity = parseInt(quantity);
        if (isNaN(numQuantity) || numQuantity <= 0) return;
        onAdd(name.trim(), numPrice, numQuantity, notes.trim());
        setName('');
        setPrice('');
        setQuantity('1');
        setNotes('');
    };

    const handleCancel = () => {
        onClose();
        setName('');
        setPrice('');
        setQuantity('1');
        setNotes('');
    };

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Item Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Price"
                            type="number"
                            fullWidth
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                        <TextField
                            label="Quantity"
                            type="number"
                            fullWidth
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                            inputProps={{ min: 1 }}
                        />
                    </Box>
                    <TextField
                        label="Notes (Optional)"
                        multiline
                        rows={2}
                        fullWidth
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button 
                    onClick={handleAdd} 
                    variant="contained" 
                    color="primary"
                    disabled={!name.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0}
                >
                    Add to Cart
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomItemDialog;
