import { db } from './firebase';
import {
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore';
import { getUserProfile } from './userProfile';

export async function submitRun({ user, modeSeconds, wpm, accuracy, errors, wpmSeries }) {
    if (!user) return;
    const profile = await getUserProfile(user.uid);
    const username = profile?.username || user.displayName || `user_${user.uid.slice(0, 6)}`;
    await addDoc(collection(db, 'runs'), {
        uid: user.uid,
        username,
        mode: modeSeconds,
        wpm,
        accuracy,
        errors,
        wpmSeries,
        createdAt: serverTimestamp(),
    });
}

function uniqueByUsernameSorted(runs, topN) {
    const seen = new Set();
    const unique = [];
    for (const r of runs) {
        const name = (r.username || '').toLowerCase();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        unique.push(r);
        if (unique.length >= topN) break;
    }
    return unique;
}

export async function fetchLeaderboard({ modeSeconds, topN = 50, since = null }) {
    const baseConstraints = [where('mode', '==', modeSeconds)];
    if (since) {
        baseConstraints.push(where('createdAt', '>=', since));
    }
    // Fetch more than needed, then de-duplicate by username
    const fetchLimit = Math.min(topN * 5, 1000);
    try {
        const q = query(
            collection(db, 'runs'),
            ...baseConstraints,
            orderBy('wpm', 'desc'),
            limit(fetchLimit)
        );
        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return uniqueByUsernameSorted(all, topN);
    } catch (err) {
        // Fallback without order to avoid index requirement, still returns some data
        const q2 = query(collection(db, 'runs'), ...baseConstraints, limit(fetchLimit));
        const snap2 = await getDocs(q2);
        const data = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (data.length > 0) {
            // sort client-side when fallback used
            data.sort((a, b) => (b.wpm || 0) - (a.wpm || 0));
        }
        return uniqueByUsernameSorted(data, topN); // return up to topN unique usernames
    }
}

export async function fetchUserRuns({ uid, topN = 100 }) {
    const baseConstraints = [where('uid', '==', uid)];
    try {
        const q = query(
            collection(db, 'runs'),
            ...baseConstraints,
            orderBy('createdAt', 'desc'),
            limit(topN)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
        // Fallback without orderBy
        const q2 = query(collection(db, 'runs'), ...baseConstraints, limit(topN));
        const snap2 = await getDocs(q2);
        const data = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        return data;
    }
}

export function subscribeUserRuns({ uid, topN = 100 }, onData, onError) {
    // Avoid index requirement by not ordering in query; sort client-side
    const q = query(collection(db, 'runs'), where('uid', '==', uid), limit(topN));
    return onSnapshot(
        q,
        (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            onData?.(data);
        },
        (err) => onError?.(err)
    );
}


