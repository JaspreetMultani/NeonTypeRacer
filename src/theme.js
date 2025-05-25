import { createTheme } from '@mui/material';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#8B5CF6',
            dark: '#7C3AED',
            light: '#A78BFA',
        },
        background: {
            default: '#1E1B4B',
            paper: 'rgba(30, 27, 75, 0.7)',
        },
        text: {
            primary: '#F8FAFC',
            secondary: '#CBD5E1',
        },
        error: {
            main: '#EF4444',
            light: '#FCA5A5',
        },
        success: {
            main: '#10B981',
            light: '#6EE7B7',
        },
        info: {
            main: '#3B82F6',
            light: '#93C5FD',
        },
    },
    typography: {
        fontFamily: '"Space Grotesk", sans-serif',
        h1: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F8FAFC',
        },
        h2: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#F8FAFC',
        },
        h3: {
            fontWeight: 600,
            color: '#F8FAFC',
        },
        body1: {
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: '-0.02em',
            color: '#F8FAFC',
        },
        body2: {
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: '-0.01em',
            color: '#CBD5E1',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    '&:hover': {
                        backgroundColor: '#7C3AED',
                        boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)',
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
                    backgroundColor: 'rgba(30, 27, 75, 0.7)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
            },
        },
    },
});

export { darkTheme }; 