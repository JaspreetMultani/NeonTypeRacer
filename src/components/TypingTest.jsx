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
import { auth } from '../lib/firebase';
import { submitRun } from '../lib/runService';

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
    backgroundColor: 'background.paper',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '220px',
    position: 'relative',
    overflow: 'hidden'
};

// Stat box component
const StatBox = memo(({ icon: Icon, label, value, color = 'primary.main' }) => (
    <Box sx={commonBoxStyles}>
        <Icon sx={{ color, fontSize: '1.4rem', opacity: 0.9 }} />
        <Box>
            <Typography variant="body2" sx={{
                color: 'text.secondary',
                fontWeight: 600,
                mb: 0.5,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
            }}>
                {label}
            </Typography>
            <Typography variant="h6" sx={{
                fontFamily: 'monospace',
                color,
                fontWeight: 700
            }}>
                {value}
            </Typography>
        </Box>
    </Box>
));

// Custom hook for timer logic
const useTypingTimer = (hasStarted, startTime, selectedTimeMode, completedWords, input, disableAutoEnd = false) => {
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

                if (!disableAutoEnd && remaining <= 0) {
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

// Added startAtMs and isDisabled
const TypingTest = ({ onTestComplete, onLiveUpdate, onFinish, seed, isDisabled = false, startAtMs = null, modeSeconds = null, passage = null }) => {
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [errorCount, setErrorCount] = useState(0);
    const [totalCharacters, setTotalCharacters] = useState(0);
    const [currentLine, setCurrentLine] = useState('');
    const [nextLine, setNextLine] = useState('');
    const [completedWords, setCompletedWords] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [selectedTimeMode, setSelectedTimeMode] = useState(modeSeconds || TIME_MODES.SHORT);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef(null);
    const [testHistory, setTestHistory] = useState([]);
    const [passageWords, setPassageWords] = useState(null);
    const [passageOffset, setPassageOffset] = useState(0);
    const wordsPerLine = 9;
    const isPassageMode = !!passage;

    // If modeSeconds prop changes (multiplayer), lock the timer mode
    useEffect(() => {
        if (typeof modeSeconds === 'number' && modeSeconds > 0) {
            setSelectedTimeMode(modeSeconds);
        }
    }, [modeSeconds]);

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
        input,
        !!passage // disable auto end when using passage mode
    );
    const { checkLineCompletion, isValidKeyPress, isAtLastWord, hasCompletedCurrentWord } = useTypingLogic(currentLine);

    // Initialize lines: fixed passage (multiplayer) or generated
    useEffect(() => {
        if (passage && passage.length > 0) {
            const words = passage.trim().split(/\s+/);
            setPassageWords(words);
            setPassageOffset(0);
            const makeLine = (start) => words.slice(start, Math.min(words.length, start + wordsPerLine)).join(' ');
            setCurrentLine(makeLine(0));
            setNextLine(makeLine(wordsPerLine));
        } else {
            if (seed !== undefined && seed !== null) {
                textGenerator.setSeed(seed);
            }
            const firstLine = textGenerator.getNextLine();
            const secondLine = textGenerator.getNextLine();
            setCurrentLine(firstLine);
            setNextLine(secondLine);
        }
        containerRef.current?.focus();
    }, [seed, passage]);

    // Align start with provided startAtMs in multiplayer so refresh doesn't reset timer
    useEffect(() => {
        if (startAtMs && !isDisabled) {
            const startTimeMs = startAtMs; // when countdown hit zero
            setHasStarted(true);
            setStartTime(startTimeMs);
        }
    }, [startAtMs, isDisabled]);

    // Removed fallback auto-start to ensure single-player starts on first keypress only

    const calculateStats = useCallback(() => {
        if (!startTime || !endTime) return { wpm: 0, accuracy: 100 };
        const timeInMinutes = Math.max((endTime - startTime) / 1000 / 60, 0.001);
        const wordsTyped = completedWords + (input.split(' ').length - 1);
        const wpm = Math.round(wordsTyped / timeInMinutes);
        const accuracy = totalCharacters ? Math.round(((totalCharacters - errorCount) / totalCharacters) * 100) : 100;
        return { wpm, accuracy };
    }, [startTime, endTime, completedWords, input, totalCharacters, errorCount]);

    // Submit run once when results first show
    const hasSubmittedRef = useRef(false);
    useEffect(() => {
        if (timerShowResults && !hasSubmittedRef.current && startTime && endTime) {
            hasSubmittedRef.current = true;
            const { wpm, accuracy } = calculateStats();
            const user = auth.currentUser;
            if (user && !user.isAnonymous) {
                submitRun({
                    user,
                    modeSeconds: selectedTimeMode,
                    wpm,
                    accuracy,
                    errors: errorCount,
                    wpmSeries: wpmData,
                }).catch(() => { });
            }
            if (onFinish) {
                onFinish({ wpm, accuracy, errors: errorCount, modeSeconds: selectedTimeMode });
            }
        }
    }, [timerShowResults, startTime, endTime, calculateStats, selectedTimeMode, errorCount, wpmData, onFinish]);

    // Live update callback on new data points
    const lastSentRef = useRef(0);
    useEffect(() => {
        if (!onLiveUpdate || wpmData.length === 0) return;
        const latest = wpmData[wpmData.length - 1];
        if (!latest || latest.time === lastSentRef.current) return;
        lastSentRef.current = latest.time;
        const accuracy = totalCharacters ? Math.round(((totalCharacters - errorCount) / totalCharacters) * 100) : 100;
        let progress;
        if (passage && passageWords) {
            const totalChars = passageWords.join(' ').length;
            progress = Math.max(0, Math.min(1, totalChars ? totalCharacters / totalChars : 0));
        }
        onLiveUpdate({ time: latest.time, wpm: latest.wpm, accuracy, inputLength: input.length, progress });
    }, [wpmData, onLiveUpdate, totalCharacters, errorCount, input.length, passage, passageWords]);

    const handleLineCompletion = useCallback((newInput) => {
        if (checkLineCompletion(newInput)) {
            setCompletedWords(prev => prev + currentLine.split(' ').length);
            setInput('');
            if (passage && passageWords) {
                const newOffset = passageOffset + wordsPerLine;
                setPassageOffset(newOffset);
                const makeLine = (start) => passageWords.slice(start, Math.min(passageWords.length, start + wordsPerLine)).join(' ');
                const nextCurrent = makeLine(newOffset);
                const nextNext = makeLine(newOffset + wordsPerLine);
                setCurrentLine(nextCurrent);
                setNextLine(nextNext);
                if (!nextCurrent) {
                    setEndTime(Date.now());
                    if (onFinish) {
                        const stats = calculateStats();
                        onFinish({ ...stats });
                    }
                }
            } else {
                setCurrentLine(nextLine);
                setNextLine(textGenerator.getNextLine());
            }
            return true;
        }
        return false;
    }, [checkLineCompletion, currentLine, nextLine, passage, passageWords, passageOffset, calculateStats, onFinish]);

    const handleKeyPress = useCallback((e) => {
        if (endTime) return;
        if (isDisabled) { e?.preventDefault?.(); return; }
        if (!isValidKeyPress(e)) return;
        if (e && typeof e.preventDefault === 'function') {
            const isTypingKey = e.key === ' ' || e.key === 'Backspace' || e.key.length === 1;
            if (isTypingKey) e.preventDefault();
        }
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
    }, [endTime, isDisabled, hasStarted, input, currentLine, isValidKeyPress, isAtLastWord, hasCompletedCurrentWord, handleLineCompletion]);

    // Ensure typing works even if focus leaves the typing box
    useEffect(() => {
        const onWindowKeyDown = (e) => {
            if (!containerRef.current) return;
            const active = document.activeElement;

            // If user is typing in an input/textarea/contenteditable or inside a dialog, do nothing
            const isInputEl = active && ((active.tagName === 'INPUT') || (active.tagName === 'TEXTAREA') || active.isContentEditable);
            const inDialog = active && typeof active.closest === 'function' && !!active.closest('[role="dialog"]');
            if (isInputEl || inDialog) return;

            const isTypingKey = (!e.metaKey && !e.ctrlKey && !e.altKey) && (e.key === ' ' || e.key === 'Backspace' || e.key.length === 1);
            if (isTypingKey && active !== containerRef.current) {
                e.preventDefault();
                containerRef.current.focus();
                handleKeyPress(e);
            }
        };
        window.addEventListener('keydown', onWindowKeyDown);
        return () => window.removeEventListener('keydown', onWindowKeyDown);
    }, [handleKeyPress]);

    const handleReset = useCallback(() => {
        // In multiplayer (room), never allow reset
        if (modeSeconds) {
            return;
        }

        // Reset timer state
        resetTimer();
        hasSubmittedRef.current = false;

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
    }, [modeSeconds, endTime, startTime, selectedTimeMode, errorCount, calculateStats, onTestComplete, resetTimer]);

    const handleTimeModeChange = useCallback((event, newMode) => {
        if (newMode !== null) {
            setSelectedTimeMode(newMode);
            // Reset and reinitialize for new duration
            handleReset();
        }
    }, [handleReset]);

    // Stats panel components
    const StatsPanel = memo(() => (
        <Box sx={{ display: 'flex', gap: 2, mb: 4, width: '100%', justifyContent: 'center' }}>
            {!isPassageMode && (
                <StatBox
                    icon={TimerIcon}
                    label="Time"
                    value={`${!hasStarted ? selectedTimeMode : Math.ceil(timeLeft)}s`}
                    color={timeLeft < 5 ? 'error.main' : 'primary.main'}
                />
            )}
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
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                            border: '1px solid',
                            borderColor: 'divider',
                            mt: 4
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                color: 'text.primary',
                                fontWeight: 'bold',
                                mb: 3,
                                textAlign: 'center'
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
                        <Box sx={{ height: 300, mb: 6 }}>
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
                                        stroke="#A2AF9B"
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
                                        mb: 2,
                                        mt: 1,
                                        textAlign: 'center'
                                    }}
                                >
                                    Previous Attempts
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        mt: 1.5
                                    }}
                                >
                                    {testHistory.map((test, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                p: 1.5,
                                                borderRadius: 1,
                                                backgroundColor: 'background.paper',
                                                border: '1px solid',
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                                {test.timestamp} ({test.duration}s)
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Typography sx={{ color: 'primary.main', fontFamily: 'monospace' }}>
                                                    {test.wpm} WPM
                                                </Typography>
                                                <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
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
                    {/* Time Mode Selector - hide in multiplayer (when modeSeconds is set) */}
                    {!modeSeconds && (
                        <ToggleButtonGroup
                            value={selectedTimeMode}
                            exclusive
                            onChange={handleTimeModeChange}
                            aria-label="time mode"
                            sx={{
                                mb: 4,
                                gap: 1,
                                '& .MuiToggleButton-root': {
                                    backgroundColor: 'background.paper',
                                    color: 'text.secondary',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    padding: '10px 18px',
                                    fontFamily: 'monospace',
                                    gap: 0.5,
                                    '&.Mui-selected': {
                                        backgroundColor: 'secondary.light',
                                        color: 'text.primary',
                                        fontWeight: 'bold'
                                    },
                                    '&:hover': {
                                        backgroundColor: 'secondary.light',
                                        opacity: 0.95,
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
                    )}

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
                        disabled={!!modeSeconds}
                        sx={{
                            mt: 4,
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1.05rem',
                            fontWeight: 600
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