import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { auth } from '../lib/firebase';
import { fetchUserRuns, subscribeUserRuns } from '../lib/runService';
import { onAuthStateChanged } from 'firebase/auth';

const MODES = [15, 30, 60];

function computeAggregates(runs) {
    const byMode = new Map();
    MODES.forEach((m) => byMode.set(m, []));
    runs.forEach((r) => { if (byMode.has(r.mode)) byMode.get(r.mode).push(r); });
    return MODES.map((m) => {
        const arr = byMode.get(m);
        if (!arr || arr.length === 0) return { mode: m, count: 0, best: 0, avgWpm: 0, avgAcc: 0 };
        const best = Math.max(...arr.map((r) => r.wpm || 0));
        const avgWpm = Math.round(arr.reduce((s, r) => s + (r.wpm || 0), 0) / arr.length);
        const avgAcc = Math.round(arr.reduce((s, r) => s + (r.accuracy || 0), 0) / arr.length);
        return { mode: m, count: arr.length, best, avgWpm, avgAcc };
    });
}

export default function UserStats() {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(() => auth.currentUser);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) { setRuns([]); setLoading(false); return; }
        setLoading(true);
        const unsub = subscribeUserRuns(
            { uid: user.uid, topN: 200 },
            (data) => { setRuns(data); setLoading(false); },
            async () => { const data = await fetchUserRuns({ uid: user.uid, topN: 200 }); setRuns(data); setLoading(false); }
        );
        return () => unsub && unsub();
    }, [user]);

    const aggregates = useMemo(() => computeAggregates(runs), [runs]);

    // Stable ordered runs: ignore entries without createdAt to avoid reshuffling when serverTimestamp resolves
    const orderedRuns = useMemo(() => {
        const withTs = runs.filter(r => r.createdAt && typeof r.createdAt.toMillis === 'function');
        withTs.sort((a, b) => {
            const ta = a.createdAt.toMillis();
            const tb = b.createdAt.toMillis();
            if (ta !== tb) return ta - tb;
            return (a.id || '').localeCompare(b.id || '');
        });
        return withTs;
    }, [runs]);

    const series = useMemo(() => orderedRuns.map((r, idx) => ({ x: idx + 1, wpm: r.wpm || 0, id: r.id })), [orderedRuns]);
    const overallAvgWpm = useMemo(() => {
        if (orderedRuns.length === 0) return 0;
        const sum = orderedRuns.reduce((s, r) => s + (r.wpm || 0), 0);
        return Math.round(sum / orderedRuns.length);
    }, [orderedRuns]);

    if (loading) return null;
    if (!user) {
        return (
            <Box sx={{ mt: 6 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>Sign in to access personal stats</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Your best scores, averages, and history will appear here once you sign in and complete runs.</Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 6 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2, textAlign: 'center' }}>Your Stats</Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
                {aggregates.map((a) => (
                    <Paper key={a.mode} sx={{ p: 2, minWidth: 220, textAlign: 'center' }}>
                        <Box sx={{ mb: 1 }}><Chip label={`${a.mode}s`} color="primary" size="small" /></Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Attempts: {a.count}</Typography>
                        <Typography variant="body1" sx={{ color: 'primary.main', fontFamily: 'monospace' }}>Best: {a.best} WPM</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>Avg: {a.avgWpm} WPM</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>Avg Acc: {a.avgAcc}%</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>WPM Over Recent Runs</Typography>
                <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="x" tick={false} axisLine={false} tickLine={false} />
                            <YAxis tick={false} axisLine={false} tickLine={false} />
                            {/* Subtle average line without label */}
                            {overallAvgWpm > 0 && (
                                <ReferenceLine y={overallAvgWpm} stroke="#DCCFC0" strokeDasharray="4 4" ifOverflow="extendDomain" />
                            )}
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 4, color: '#fff', padding: '6px 8px' }}
                                formatter={(value) => [`${value} WPM`, '']}
                                labelFormatter={() => ''}
                                separator=""
                            />
                            <Line
                                type="monotone"
                                dataKey="wpm"
                                stroke="#A2AF9B"
                                strokeWidth={2}
                                dot={{ r: 2, fill: '#A2AF9B', stroke: '#fff', strokeWidth: 1 }}
                                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 1 }}
                                isAnimationActive={false}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>Recent Runs</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {orderedRuns.slice(0, 10).map((r) => (
                        <Paper key={r.id} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontFamily: 'monospace' }}>{r.mode}s</Typography>
                            <Typography sx={{ fontFamily: 'monospace', color: 'primary.main' }}>{r.wpm} WPM</Typography>
                            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{r.accuracy}%</Typography>
                        </Paper>
                    ))}
                    {orderedRuns.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No runs yet. Sign in and complete a test to see your stats.</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}


