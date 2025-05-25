import React from 'react';
import { Box, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';

const Header = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                gap: 1,
            }}
        >
            <BoltIcon
                sx={{
                    fontSize: '2.5rem',
                    color: 'primary.main',
                    animation: 'glow 2s ease-in-out infinite alternate',
                    '@keyframes glow': {
                        '0%': {
                            filter: 'drop-shadow(0 0 2px #6a5acd)',
                        },
                        '100%': {
                            filter: 'drop-shadow(0 0 8px #8a2be2)',
                        },
                    },
                }}
            />
            <Typography
                variant="h1"
                sx={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #6a5acd, #8a2be2)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                }}
            >
                NeonType
            </Typography>
        </Box>
    );
};

export default Header; 