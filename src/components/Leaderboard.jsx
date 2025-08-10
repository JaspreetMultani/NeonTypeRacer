import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Paper, Avatar, Button, Alert, Link } from '@mui/material';
import { fetchLeaderboard } from '../lib/runService';

const MODES = [15, 30, 60];

export default function Leaderboard() {
    const [mode, setMode] = useState(15);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [indexUrl, setIndexUrl] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            setIndexUrl('');
            const data = await fetchLeaderboard({ modeSeconds: mode, topN: 50 });
            setRows(data);
        } catch (e) {
            const msg = e?.message || 'Failed to load leaderboard';
            setError(msg);
            const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s)]+/);
            if (match) setIndexUrl(match[0]);
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!mounted) return;
            await load();
        })();
        return () => {
            mounted = false;
        };
    }, [mode, load]);

    return (
        <Box sx={{ mt: 6 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2, textAlign: 'center' }}>
                All Time Leaderboard
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <ToggleButtonGroup
                    color="primary"
                    exclusive
                    value={mode}
                    onChange={(e, val) => val && setMode(val)}
                >
                    {MODES.map((m) => (
                        <ToggleButton key={m} value={m}>{m}s</ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {indexUrl ? (
                        <>
                            This query needs a Firestore index. Click{' '}
                            <Link href={indexUrl} target="_blank" rel="noreferrer">create index</Link>, wait for it to build, then refresh.
                        </>
                    ) : (
                        error
                    )}
                </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button size="small" onClick={load} disabled={loading}>
                    {loading ? 'Loading…' : 'Refresh'}
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rows.map((r, idx) => (
                    <Paper key={r.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" sx={{ width: 24, textAlign: 'right', color: 'text.secondary' }}>{idx + 1}</Typography>
                            <Avatar sx={{ width: 28, height: 28 }}>{(r.username || '?')[0]?.toUpperCase?.() || '?'}</Avatar>
                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{r.username}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Typography sx={{ color: 'primary.main', fontFamily: 'monospace' }}>{r.wpm} WPM</Typography>
                            <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{r.accuracy}%</Typography>
                        </Box>
                    </Paper>
                ))}
                {rows.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
                        No runs yet for {mode}s.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}


