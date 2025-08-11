import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, ToggleButtonGroup, ToggleButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { createRoom } from '../lib/roomService';
import { generatePassage } from '../utils/textGenerator';

export default function Multiplayer() {
    const [mode, setMode] = useState(15);
    const [seed, setSeed] = useState('');
    const [passageLength, setPassageLength] = useState('medium');
    const [joinOpen, setJoinOpen] = useState(false);
    const [joinInput, setJoinInput] = useState('');
    const [joinError, setJoinError] = useState('');
    const navigate = useNavigate();

    const signedIn = !!auth.currentUser;

    const handleCreate = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const chosenSeed = seed || Date.now().toString();
        const passage = generatePassage({ seed: chosenSeed, length: passageLength });
        const roomId = await createRoom({ hostId: user.uid, username: user.email?.split('@')[0] || 'user', modeSeconds: mode, seed: chosenSeed, passage, passageLength });
        navigate(`/room/${roomId}`);
    };

    const parseRoomInput = (value) => {
        if (!value) return '';
        const trimmed = value.trim();
        // Accept full link like https://.../room/abc123 or just abc123
        const match = trimmed.match(/room\/(.+)$/);
        return match ? match[1] : trimmed;
    };

    const submitJoin = () => {
        setJoinError('');
        const id = parseRoomInput(joinInput);
        if (!id) { setJoinError('Enter a room ID or paste an invite link'); return; }
        navigate(`/room/${id}`);
        setJoinOpen(false);
        setJoinInput('');
    };

    return (
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
            <Paper sx={{ p: 3, maxWidth: 520, width: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Multiplayer</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Create a room and share the ID, or join an existing room.</Typography>

                {!signedIn && (
                    <Alert severity="info" sx={{ mb: 2 }}>Sign in to access multiplayer.</Alert>
                )}

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Mode</Typography>
                <ToggleButtonGroup value={mode} exclusive onChange={(e, v) => v && setMode(v)} sx={{ mb: 2 }} disabled={!signedIn}>
                    <ToggleButton value={15}>15s</ToggleButton>
                    <ToggleButton value={30}>30s</ToggleButton>
                    <ToggleButton value={60}>60s</ToggleButton>
                </ToggleButtonGroup>

                <TextField label="Seed (optional)" fullWidth value={seed} onChange={(e) => setSeed(e.target.value)} sx={{ mb: 2 }} disabled={!signedIn} />

                <FormControl fullWidth sx={{ mb: 2 }} disabled={!signedIn}>
                    <InputLabel id="passage-length-label">Passage length</InputLabel>
                    <Select
                        labelId="passage-length-label"
                        value={passageLength}
                        label="Passage length"
                        onChange={(e) => setPassageLength(e.target.value)}
                    >
                        <MenuItem value="short">Short</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="long">Long</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" onClick={handleCreate} disabled={!signedIn}>Create room</Button>
                    <Button variant="outlined" onClick={() => setJoinOpen(true)} disabled={!signedIn}>Join room</Button>
                </Box>
            </Paper>

            <Dialog open={joinOpen} onClose={() => setJoinOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Join a room</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        label="Room ID or invite link"
                        value={joinInput}
                        onChange={(e) => setJoinInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitJoin(); } }}
                        fullWidth
                        autoFocus
                        error={!!joinError}
                        helperText={joinError || 'Paste a room link or enter the room ID'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setJoinOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={submitJoin} disabled={!joinInput.trim()}>Join</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


