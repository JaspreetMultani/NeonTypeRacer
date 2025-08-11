import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, Avatar, ListItemText, LinearProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { joinRoom, subscribeRoom, subscribePlayers, startRace, updatePlayerProgress, finishPlayer, setInProgress, finishRace } from '../lib/roomService';
import { getUserProfile } from '../lib/userProfile';
import TypingTest from '../components/TypingTest';

export default function Room() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [players, setPlayers] = useState([]);
    const [countdown, setCountdown] = useState(null);
    const [resultsOpen, setResultsOpen] = useState(false);

    useEffect(() => {
        const unsubRoom = subscribeRoom(id, setRoom);
        const unsubPlayers = subscribePlayers(id, setPlayers);
        return () => { unsubRoom && unsubRoom(); unsubPlayers && unsubPlayers(); };
    }, [id]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        (async () => {
            try {
                const profile = await getUserProfile(user.uid);
                const username = profile?.username || user.displayName || (user.email ? user.email.split('@')[0] : 'user');
                await joinRoom({ roomId: id, uid: user.uid, username });
            } catch {
                const fallback = user.displayName || (user.email ? user.email.split('@')[0] : 'user');
                await joinRoom({ roomId: id, uid: user.uid, username: fallback });
            }
        })();
    }, [id]);

    // Open results dialog when race finishes
    useEffect(() => {
        if (room?.status === 'finished') {
            setResultsOpen(true);
        }
    }, [room?.status]);

    const topPlayers = useMemo(() => {
        const arr = [...players];
        arr.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        return arr.slice(0, 5);
    }, [players]);

    // Disable countdown: start immediately when host clicks start
    useEffect(() => {
        if (!room || room.status !== 'countdown') return;
        setInProgress({ roomId: id });
        setCountdown(null);
    }, [room, id]);

    // Auto finish: when all players finished or left
    useEffect(() => {
        if (!room || room.status !== 'in_progress') return;
        if (!players || players.length === 0) return;
        const allDone = players.every(p => p.finishedAt || (p.progress || 0) >= 1);
        if (allDone) {
            finishRace({ roomId: id });
        }
    }, [room, players, id]);

    const user = auth.currentUser;
    const isHost = user && room && room.hostId === user.uid;

    const handleStart = async () => {
        if (!isHost) return;
        await startRace({ roomId: id, countdownMs: 5000 });
    };

    const handleLive = async ({ wpm, accuracy, inputLength, progress }) => {
        if (!user) return;
        await updatePlayerProgress({ roomId: id, uid: user.uid, progress, wpm, accuracy, inputLength });
    };

    const handleFinish = async ({ wpm, accuracy }) => {
        if (!user) return;
        await finishPlayer({ roomId: id, uid: user.uid, wpm, accuracy });
    };

    if (!room) {
        return (
            <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                <Typography>Loading room…</Typography>
            </Box>
        );
    }

    const startAtMs = room.startAt ? (room.startAt.toDate ? room.startAt.toDate().getTime() : room.startAt.getTime()) : null;
    const statusLabel = room.status === 'finished' ? 'game over' : room.status;
    const statusColor = room.status === 'in_progress' ? 'success' : room.status === 'countdown' ? 'info' : room.status === 'finished' ? 'warning' : 'default';

    return (
        <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6">Room: {id}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Mode: {room.modeSeconds}s • Seed: {room.seed}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label={statusLabel} color={statusColor} />
                    {isHost && room.status === 'lobby' && (
                        <Button variant="contained" onClick={handleStart}>Start (5s)</Button>
                    )}
                    <Button variant="text" onClick={() => navigate('/multiplayer')}>Back</Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Players</Typography>
                <List sx={{ width: '100%' }}>
                    {players.map((p) => (
                        <ListItem key={p.uid} divider sx={{ px: 1 }}
                            secondaryAction={
                                <Box sx={{ minWidth: 200 }}>
                                    <LinearProgress variant="determinate" value={Math.round((p.progress || 0) * 100)} />
                                </Box>
                            }
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ width: 32, height: 32 }}>{(p.username || 'U').charAt(0).toUpperCase()}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={`@${p.username}`} secondary={`${Math.round((p.progress || 0) * 100)}%`} />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <TypingTest
                seed={room.seed}
                isDisabled={room.status !== 'in_progress'}
                startAtMs={startAtMs}
                modeSeconds={null}
                passage={room.passage}
                onLiveUpdate={handleLive}
                onFinish={handleFinish}
                onTestComplete={() => { }}
            />

            <Dialog
                open={resultsOpen}
                onClose={() => setResultsOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        backgroundColor: 'background.paper'
                    }
                }}
            >
                <DialogTitle sx={{
                    textAlign: 'center',
                    fontWeight: 700,
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}>
                    Race Results
                </DialogTitle>
                <DialogContent sx={{ pt: 2, px: 2 }}>
                    {topPlayers.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No results available.</Typography>
                    ) : (
                        <List sx={{ py: 0 }}>
                            {topPlayers.map((p, idx) => (
                                <ListItem key={p.uid} divider sx={{ px: 1 }}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 700 }}>{p.wpm || 0} WPM</Typography>
                                            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{p.accuracy || 0}%</Typography>
                                        </Box>
                                    }
                                >
                                    <Box sx={{ mr: 2, minWidth: 36, display: 'flex', justifyContent: 'center' }}>
                                        <Box sx={{
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 999,
                                            backgroundColor: 'secondary.light',
                                            color: 'text.primary',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                            minWidth: 24,
                                            textAlign: 'center'
                                        }}>
                                            #{idx + 1}
                                        </Box>
                                    </Box>
                                    <ListItemAvatar>
                                        <Avatar sx={{ width: 32, height: 32 }}>{(p.username || 'U').charAt(0).toUpperCase()}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`@${p.username}`}
                                        primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setResultsOpen(false)}>Close</Button>
                    <Button variant="contained" onClick={() => navigate('/multiplayer')}>Back to Multiplayer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


