import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface MyAlertProps {
    open: boolean;
    onClose: () => void;
    message: string;
    severity: 'success' | 'error';
}

const MyAlert: React.FC<MyAlertProps> = ({ open, onClose, message, severity }) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={2500}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert onClose={onClose} variant="filled" severity={severity} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default MyAlert;