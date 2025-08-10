import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Container } from '@mui/material';
import { minimalistTheme } from './theme';
import TypingTest from './components/TypingTest';
import Leaderboard from './components/Leaderboard';
import UserStats from './components/UserStats';
import Multiplayer from './pages/Play';
import Room from './pages/Room';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import { createQuote } from './utils/textGenerator';
import { auth } from './lib/firebase';

function App() {
  const [currentQuote, setCurrentQuote] = useState('');

  useEffect(() => {
    setCurrentQuote(createQuote());
  }, []);

  const handleTestComplete = () => {
    setCurrentQuote(createQuote());
  };

  const RequireAuth = ({ children }) => {
    const user = auth.currentUser;
    if (!user) return <Navigate to="/multiplayer" replace />;
    return children;
  };

  return (
    <ThemeProvider theme={minimalistTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', transition: 'background-color 0.3s ease', position: 'relative', overflow: 'hidden' }}>
        <BrowserRouter>
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 2 }}>
            <Header />
            <Routes>
              <Route path="/" element={<TypingTest text={currentQuote} onTestComplete={handleTestComplete} />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/stats" element={<UserStats />} />
              <Route path="/multiplayer" element={<Multiplayer />} />
              <Route path="/room/:id" element={<RequireAuth><Room /></RequireAuth>} />
            </Routes>
          </Container>
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  );
}

export default App;
