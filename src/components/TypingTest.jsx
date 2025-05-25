import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Box, Typography, Button, LinearProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import SpeedIcon from '@mui/icons-material/Speed';
import GradeIcon from '@mui/icons-material/Grade';
import { motion, AnimatePresence } from 'framer-motion';
import { keyframes } from '@mui/system';
import { textGenerator } from '../utils/textGenerator';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TIME_MODES = {
    SHORT: 15,
    MEDIUM: 30,
    LONG: 60
};

const blinkAnimation = keyframes`
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
`;

// Common styles
const commonBoxStyles = {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    padding: '12px 20px',
    borderRadius: 2,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    maxWidth: '200px',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.6) 50%, rgba(139, 92, 246, 0.2) 100%)',
    },
    '&:hover': {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)',
    }
};

// Stat box component
const StatBox = memo(({ icon: Icon, label, value, color = 'primary.main' }) => (
    <Box sx={commonBoxStyles}>
        <Icon sx={{ color, fontSize: '1.5rem', opacity: 0.8 }} />
        <Box>
            <Typography variant="body2" sx={{
                color: 'text.secondary',
                fontWeight: 500,
                mb: 0.5,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }}>
                {label}
            </Typography>
            <Typography variant="h5" sx={{
                fontFamily: 'monospace',
                color,
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(106, 90, 205, 0.3)',
            }}>
                {value}
            </Typography>
        </Box>
    </Box>
));

// Custom hook for timer logic
const useTypingTimer = (hasStarted, startTime, selectedTimeMode, completedWords, input) => {
    const [timeLeft, setTimeLeft] = useState(selectedTimeMode);
    const [endTime, setEndTime] = useState(null);
    const [liveWPM, setLiveWPM] = useState(0);
    const [wpmData, setWpmData] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const timerRef = useRef(null);
    const lastDataPointRef = useRef(0);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        lastDataPointRef.current = 0;
        setTimeLeft(selectedTimeMode);
        setEndTime(null);
        setLiveWPM(0);
        setWpmData([]);
        setShowResults(false);
    }, [selectedTimeMode]);

    useEffect(() => {
        if (hasStarted && !endTime) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const remaining = selectedTimeMode - elapsed;
                const currentSecond = Math.min(selectedTimeMode - Math.ceil(remaining), selectedTimeMode);

                const timeInMinutes = Math.max(elapsed / 60, 0.001);
                const wordsTyped = completedWords + (input.split(' ').length - 1);
                const currentWPM = Math.round(wordsTyped / timeInMinutes);
                setLiveWPM(currentWPM);

                // Only add data point if we've moved to a new second
                if (currentSecond > lastDataPointRef.current) {
                    lastDataPointRef.current = currentSecond;
                    setWpmData(prev => [...prev, {
                        time: currentSecond,
                        wpm: currentWPM
                    }]);
                }

                if (remaining <= 0) {
                    setTimeLeft(0);
                    setEndTime(Date.now());
                    setShowResults(true);
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                } else {
                    setTimeLeft(remaining);
                }
            }, 16);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [hasStarted, startTime, endTime, completedWords, input, selectedTimeMode]);

    return { timeLeft, endTime, setEndTime, liveWPM, wpmData, setWpmData, showResults, setShowResults, resetTimer };
};

// Custom hook for typing logic
const useTypingLogic = (currentLine) => {
    const checkLineCompletion = useCallback((newInput) => {
        return newInput.length >= currentLine.length && newInput.endsWith(' ');
    }, [currentLine]);

    const isValidKeyPress = useCallback((e) => {
        return !e.metaKey && !e.ctrlKey && !e.altKey;
    }, []);

    const isAtLastWord = useCallback((input) => {
        return input.length >= currentLine.length ||
            (currentLine.slice(input.length).trim().length === 0);
    }, [currentLine]);

    const hasCompletedCurrentWord = useCallback((input) => {
        return input.length > 0 && currentLine.slice(0, input.length) === input;
    }, [currentLine]);

    return { checkLineCompletion, isValidKeyPress, isAtLastWord, hasCompletedCurrentWord };
};

const TypingTest = ({ onTestComplete }) => {
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [errorCount, setErrorCount] = useState(0);
    const [totalCharacters, setTotalCharacters] = useState(0);
    const [currentLine, setCurrentLine] = useState('');
    const [nextLine, setNextLine] = useState('');
    const [completedWords, setCompletedWords] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [selectedTimeMode, setSelectedTimeMode] = useState(TIME_MODES.SHORT);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef(null);
    const [testHistory, setTestHistory] = useState([]);

    // Custom hooks
    const {
        timeLeft,
        endTime,
        setEndTime,
        liveWPM,
        wpmData,
        setWpmData,
        showResults: timerShowResults,
        resetTimer
    } = useTypingTimer(
        hasStarted,
        startTime,
        selectedTimeMode,
        completedWords,
        input
    );
    const { checkLineCompletion, isValidKeyPress, isAtLastWord, hasCompletedCurrentWord } = useTypingLogic(currentLine);

    // Initialize lines
    useEffect(() => {
        const firstLine = textGenerator.getNextLine();
        const secondLine = textGenerator.getNextLine();
        setCurrentLine(firstLine);
        setNextLine(secondLine);
        containerRef.current?.focus();
    }, []);

    const calculateStats = useCallback(() => {
        if (!startTime || !endTime) return { wpm: 0, accuracy: 100 };

        const timeInMinutes = Math.max((endTime - startTime) / 1000 / 60, 0.001);
        const wordsTyped = completedWords + (input.split(' ').length - 1);
        const wpm = Math.round(wordsTyped / timeInMinutes);
        const accuracy = totalCharacters ?
            Math.round(((totalCharacters - errorCount) / totalCharacters) * 100) : 100;

        return { wpm, accuracy };
    }, [startTime, endTime, completedWords, input, totalCharacters, errorCount]);

    const handleLineCompletion = useCallback((newInput) => {
        if (checkLineCompletion(newInput)) {
            setCompletedWords(prev => prev + currentLine.split(' ').length);
            setInput('');
            setCurrentLine(nextLine);
            setNextLine(textGenerator.getNextLine());
            return true;
        }
        return false;
    }, [checkLineCompletion, currentLine, nextLine]);

    const handleKeyPress = useCallback((e) => {
        if (endTime) return;
        if (!isValidKeyPress(e)) return;

        // Start the timer on first keypress
        if (!hasStarted && e.key.length === 1) {
            setHasStarted(true);
            setStartTime(Date.now());
        }

        if (e.key === 'Backspace') {
            if (input.length > 0) {
                const lastChar = input[input.length - 1];
                setInput(prev => prev.slice(0, -1));
                if (lastChar !== ' ') {
                    setTotalCharacters(prev => prev - 1);
                }
            }
            return;
        }

        if (e.key === ' ') {
            const expectedChar = currentLine[input.length];
            const atLastWord = isAtLastWord(input);
            const completedWord = hasCompletedCurrentWord(input);

            if (expectedChar && expectedChar !== ' ' && !atLastWord && !completedWord) {
                setErrorCount(prev => prev + 1);
            }

            if (expectedChar === ' ' || atLastWord || completedWord) {
                const newInput = input + e.key;
                setInput(newInput);
                setTotalCharacters(prev => prev + 1);
                handleLineCompletion(newInput);
            }
            return;
        }

        if (e.key.length === 1) {
            if (input.length >= currentLine.length) return;

            const newInput = input + e.key;
            setInput(newInput);
            setTotalCharacters(prev => prev + 1);

            const expectedChar = currentLine[input.length];
            if (expectedChar === ' ' || e.key !== expectedChar) {
                setErrorCount(prev => prev + 1);
            }
        }
    }, [endTime, hasStarted, input, currentLine, isValidKeyPress, isAtLastWord, hasCompletedCurrentWord, handleLineCompletion]);

    const handleReset = useCallback(() => {
        // Reset timer state
        resetTimer();

        // Save test history if test was completed
        if (endTime && startTime) {
            const currentStats = calculateStats();
            setTestHistory(prev => [{
                timestamp: new Date().toLocaleTimeString(),
                duration: selectedTimeMode,
                wpm: currentStats.wpm,
                accuracy: currentStats.accuracy,
                errors: errorCount
            }, ...prev.slice(0, 4)]);
        }

        // Reset all state
        setInput('');
        setStartTime(null);
        setErrorCount(0);
        setTotalCharacters(0);
        setCompletedWords(0);
        setHasStarted(false);

        // Reset lines with new text
        const firstLine = textGenerator.getNextLine();
        const secondLine = textGenerator.getNextLine();
        setCurrentLine(firstLine);
        setNextLine(secondLine);

        // Focus the container
        containerRef.current?.focus();

        // Call onTestComplete callback
        onTestComplete();
    }, [endTime, startTime, selectedTimeMode, errorCount, calculateStats, onTestComplete, resetTimer]);

    const handleTimeModeChange = useCallback((event, newMode) => {
        if (newMode !== null) {
            setSelectedTimeMode(newMode);
            setTimeLeft(newMode);
            handleReset();
        }
    }, [handleReset]);

    // Stats panel components
    const StatsPanel = memo(() => (
        <Box sx={{ display: 'flex', gap: 2, mb: 4, width: '100%', justifyContent: 'center' }}>
            <StatBox
                icon={TimerIcon}
                label="Time"
                value={`${!hasStarted ? selectedTimeMode : Math.ceil(timeLeft)}s`}
                color={timeLeft < 5 ? 'error.main' : 'primary.main'}
            />
            <StatBox
                icon={SpeedIcon}
                label="WPM"
                value={hasStarted ? liveWPM : 0}
            />
            <StatBox
                icon={GradeIcon}
                label="Accuracy"
                value={`${totalCharacters ? Math.round(((totalCharacters - errorCount) / totalCharacters) * 100) : 100}%`}
            />
        </Box>
    ));

    // Results section component
    const ResultsSection = memo(() => (
        <AnimatePresence>
            {timerShowResults && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    <Box
                        sx={{
                            backgroundColor: 'background.paper',
                            borderRadius: 2,
                            p: 4,
                            boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
                            mt: 4
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                color: 'primary.main',
                                fontWeight: 'bold',
                                mb: 3,
                                textAlign: 'center',
                                textShadow: '0 0 10px rgba(106, 90, 205, 0.3)',
                            }}
                        >
                            Test Results
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 4, mb: 4, justifyContent: 'center' }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {liveWPM}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Words per minute</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {Math.round(((totalCharacters - errorCount) / totalCharacters) * 100)}%
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Accuracy</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {errorCount}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Errors</Typography>
                            </Box>
                        </Box>

                        {/* WPM Graph */}
                        <Box sx={{ height: 300, mb: 8 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'text.primary',
                                    mb: 2,
                                    textAlign: 'center'
                                }}
                            >
                                WPM Over Time
                            </Typography>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={wpmData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        bottom: 40,
                                        left: 60
                                    }}
                                >
                                    <XAxis
                                        dataKey="time"
                                        stroke="#666"
                                        label={{
                                            value: 'Time (seconds)',
                                            position: 'bottom',
                                            fill: '#666',
                                            offset: 20
                                        }}
                                        domain={[0, selectedTimeMode]}
                                        ticks={Array.from({ length: Math.min(16, selectedTimeMode + 1) }, (_, i) => i)}
                                        type="number"
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        label={{
                                            value: 'WPM',
                                            angle: -90,
                                            position: 'left',
                                            fill: '#666',
                                            offset: 40
                                        }}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: '#fff'
                                        }}
                                        formatter={(value) => [`${value} WPM`, 'Speed']}
                                        labelFormatter={(time) => `Time: ${time}s`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="wpm"
                                        stroke="#8B5CF6"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>

                        {/* Previous Attempts */}
                        {testHistory.length > 0 && (
                            <>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: 'text.primary',
                                        mb: 3,
                                        mt: 2,
                                        textAlign: 'center'
                                    }}
                                >
                                    Previous Attempts
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        mt: 2
                                    }}
                                >
                                    {testHistory.map((test, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                p: 2,
                                                borderRadius: 1,
                                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                            }}
                                        >
                                            <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                                {test.timestamp} ({test.duration}s)
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 3 }}>
                                                <Typography sx={{ color: 'primary.main', fontFamily: 'monospace' }}>
                                                    {test.wpm} WPM
                                                </Typography>
                                                <Typography sx={{ color: 'primary.main', fontFamily: 'monospace' }}>
                                                    {test.accuracy}% ACC
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    ));

    const renderText = (text, isCurrentLine = true) => {
        const characters = text.split('');
        return (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                {/* Cursor for initial position */}
                {isCurrentLine && input.length === 0 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: '-1px',
                            width: '2px',
                            height: '1.6em',
                            backgroundColor: 'primary.main',
                            animation: `${blinkAnimation} 1s step-end infinite`,
                        }}
                    />
                )}

                {characters.map((char, idx) => {
                    const isCurrent = isCurrentLine && idx === input.length - 1;
                    let style = {
                        opacity: isCurrentLine ? (idx >= input.length ? 0.9 : 1) : 0.6,
                        fontWeight: isCurrentLine && idx < input.length ? 600 : 400,
                        color: !isCurrentLine ? 'text.secondary' :
                            idx >= input.length ? 'text.primary' :
                                input[idx] === char ? 'primary.light' : 'error.light',
                        position: 'relative',
                        whiteSpace: 'pre',
                        fontSize: '1.5rem',
                        letterSpacing: '0.05em',
                        display: 'inline-block',
                        textShadow: isCurrentLine && idx < input.length && input[idx] === char ?
                            '0 0 8px rgba(139, 92, 246, 0.3)' : 'none',
                    };

                    return (
                        <Typography
                            component="span"
                            key={idx}
                            sx={style}
                        >
                            {char}
                            {/* Cursor for positions after typing starts */}
                            {isCurrent && input.length > 0 && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '100%',
                                        width: '2px',
                                        height: '1.6em',
                                        backgroundColor: 'primary.main',
                                        animation: `${blinkAnimation} 1s step-end infinite`,
                                    }}
                                />
                            )}
                        </Typography>
                    );
                })}
            </Box>
        );
    };

    const stats = calculateStats();
    const progressValue = hasStarted ? ((timeLeft - timeLeft) / timeLeft) * 100 : 0;

    return (
        <Box
            sx={{
                mt: 4,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '1200px',
                mx: 'auto',
                px: 3,
                gap: 4,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    gap: 4,
                    flexDirection: 'column'
                }}
            >
                {/* Main typing area */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    {/* Time Mode Selector */}
                    <ToggleButtonGroup
                        value={selectedTimeMode}
                        exclusive
                        onChange={handleTimeModeChange}
                        aria-label="time mode"
                        sx={{
                            mb: 4,
                            gap: 2,
                            '& .MuiToggleButton-root': {
                                backgroundColor: 'background.paper',
                                color: 'text.secondary',
                                borderRadius: 2,
                                border: 'none',
                                padding: '12px 24px',
                                boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
                                fontFamily: 'monospace',
                                gap: 1,
                                '&.Mui-selected': {
                                    backgroundColor: 'background.paper',
                                    color: 'primary.main',
                                    fontWeight: 'bold',
                                    textShadow: '0 0 10px rgba(106, 90, 205, 0.3)',
                                },
                                '&:hover': {
                                    backgroundColor: 'background.paper',
                                    opacity: 0.9,
                                },
                            },
                        }}
                    >
                        <ToggleButton value={TIME_MODES.SHORT}>
                            <TimerIcon sx={{ fontSize: '1.2rem' }} />
                            15s
                        </ToggleButton>
                        <ToggleButton value={TIME_MODES.MEDIUM}>
                            <TimerIcon sx={{ fontSize: '1.2rem' }} />
                            30s
                        </ToggleButton>
                        <ToggleButton value={TIME_MODES.LONG}>
                            <TimerIcon sx={{ fontSize: '1.2rem' }} />
                            60s
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Stats Panel - Now Horizontal */}
                    <StatsPanel />

                    {/* Typing Area */}
                    <Box
                        ref={containerRef}
                        tabIndex={0}
                        onKeyDown={handleKeyPress}
                        sx={{
                            width: '100%',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'text',
                            outline: 'none',
                            position: 'relative',
                            backgroundColor: 'background.paper',
                            borderRadius: 2,
                            p: 4,
                            '&:focus': {
                                boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}`
                            }
                        }}
                    >
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={currentLine}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                style={{ width: '100%', textAlign: 'center' }}
                            >
                                <Box sx={{ mb: 3, lineHeight: 1.8 }}>{renderText(currentLine, true)}</Box>
                            </motion.div>
                            <motion.div
                                key={nextLine}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                style={{ width: '100%', textAlign: 'center' }}
                            >
                                <Box sx={{ lineHeight: 1.8 }}>{renderText(nextLine, false)}</Box>
                            </motion.div>
                        </AnimatePresence>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<RestartAltIcon />}
                        onClick={handleReset}
                        size="large"
                        sx={{
                            mt: 4,
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1.1rem',
                            fontFamily: 'monospace',
                            backgroundColor: 'background.paper',
                            color: 'primary.main',
                            boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
                            border: 'none',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(106, 90, 205, 0.3)',
                            '&:hover': {
                                backgroundColor: 'background.paper',
                                opacity: 0.9,
                            }
                        }}
                    >
                        Try Again
                    </Button>
                </Box>
            </Box>

            {/* Results Section */}
            <ResultsSection />
        </Box>
    );
};

export default TypingTest; 