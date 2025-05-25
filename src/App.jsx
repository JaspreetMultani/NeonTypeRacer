import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Container } from '@mui/material';
import { darkTheme } from './theme';
import TypingTest from './components/TypingTest';
import Header from './components/Header';
import { createQuote } from './utils/textGenerator';
import './styles/gradient.css';

function App() {
  const [currentQuote, setCurrentQuote] = useState('');

  useEffect(() => {
    // Initialize with a new quote
    setCurrentQuote(createQuote());
  }, []);

  const handleTestComplete = () => {
    // Generate a new quote when test is complete
    setCurrentQuote(createQuote());
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        className="gradient-background"
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: 'background-color 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 1
          }}
        >
          <Header />

          <TypingTest
            text={currentQuote}
            onTestComplete={handleTestComplete}
          />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
