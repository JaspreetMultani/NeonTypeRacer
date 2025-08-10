import { createTheme } from '@mui/material';

const minimalistTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#A2AF9B',
            dark: '#8B9A85',
            light: '#B8C4B0',
        },
        secondary: {
            main: '#DCCFC0',
            dark: '#C4B8A8',
            light: '#E6DCD0',
        },
        background: {
            default: '#FAF9EE',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#2D3748',
            secondary: '#4A5568',
        },
        error: {
            main: '#E53E3E',
            light: '#FEB2B2',
        },
        success: {
            main: '#38A169',
            light: '#9AE6B4',
        },
        info: {
            main: '#3182CE',
            light: '#90CDF4',
        },
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#2D3748',
        },
        h2: {
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#2D3748',
        },
        h3: {
            fontWeight: 600,
            color: '#2D3748',
        },
        body1: {
            fontFamily: '"Inter", sans-serif',
            letterSpacing: '-0.01em',
            color: '#2D3748',
        },
        body2: {
            fontFamily: '"Inter", sans-serif',
            letterSpacing: '-0.01em',
            color: '#4A5568',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    borderRadius: 8,
                    '&:hover': {
                        backgroundColor: '#8B9A85',
                        boxShadow: '0 2px 8px rgba(162, 175, 155, 0.2)',
                    },
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    '@media (min-width: 600px)': {
                        paddingLeft: '32px',
                        paddingRight: '32px',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #EEEEEE',
                    borderRadius: 12,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        '& fieldset': {
                            borderColor: '#EEEEEE',
                        },
                        '&:hover fieldset': {
                            borderColor: '#DCCFC0',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#A2AF9B',
                        },
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 500,
                },
            },
        },
    },
});

export { minimalistTheme }; 