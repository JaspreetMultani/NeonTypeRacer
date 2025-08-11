import { db } from './firebase';
import {
    addDoc,
    setDoc,
    updateDoc,
    doc,
    collection,
    getDoc,
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore';

export async function createRoom({ hostId, username, modeSeconds = 15, seed = Date.now().toString(), passage = null, passageLength = null }) {
    const roomRef = await addDoc(collection(db, 'rooms'), {
        status: 'lobby',
        modeSeconds,
        seed,
        hostId,
        createdAt: serverTimestamp(),
        startAt: null,
        passage: passage || null,
        passageLength: passage ? passageLength || 'medium' : null,
    });
    await setDoc(doc(db, 'rooms', roomRef.id, 'players', hostId), {
        uid: hostId,
        username,
        joinedAt: serverTimestamp(),
        wpm: 0,
        accuracy: 100,
        inputLength: 0,
        progress: 0,
        finishedAt: null,
        lastUpdate: serverTimestamp(),
    });
    return roomRef.id;
}

export async function joinRoom({ roomId, uid, username }) {
    // Prevent joining mid-race and cap at 10 players (client-side guard)
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (roomSnap.exists()) {
        const data = roomSnap.data();
        if (data.status !== 'lobby') {
            throw new Error('Race already started');
        }
    }
    // Count players
    // Note: lightweight approach would be to rely on rules; skipping count here for simplicity
    await setDoc(doc(db, 'rooms', roomId, 'players', uid), {
        uid,
        username,
        joinedAt: serverTimestamp(),
        wpm: 0,
        accuracy: 100,
        inputLength: 0,
        progress: 0,
        finishedAt: null,
        lastUpdate: serverTimestamp(),
    }, { merge: true });
}

export function subscribeRoom(roomId, onData, onError) {
    return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
        if (!snap.exists()) return onData?.(null);
        onData?.({ id: snap.id, ...snap.data() });
    }, onError);
}

export function subscribePlayers(roomId, onData, onError) {
    return onSnapshot(collection(db, 'rooms', roomId, 'players'), (snap) => {
        const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        players.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        onData?.(players);
    }, onError);
}

export async function startRace({ roomId, countdownMs = 5000 }) {
    // Use client time for start; acceptable for student project
    const startAt = new Date(Date.now() + countdownMs);
    await updateDoc(doc(db, 'rooms', roomId), {
        status: 'countdown',
        startAt,
    });
}

export async function setInProgress({ roomId }) {
    await updateDoc(doc(db, 'rooms', roomId), { status: 'in_progress' });
}

export async function finishRace({ roomId }) {
    await updateDoc(doc(db, 'rooms', roomId), { status: 'finished' });
}

export async function updatePlayerProgress({ roomId, uid, progress, wpm, accuracy, inputLength }) {
    const payload = { lastUpdate: serverTimestamp() };
    if (typeof progress === 'number') payload.progress = Math.max(0, Math.min(1, progress));
    if (typeof wpm === 'number') payload.wpm = wpm;
    if (typeof accuracy === 'number') payload.accuracy = accuracy;
    if (typeof inputLength === 'number') payload.inputLength = inputLength;
    await updateDoc(doc(db, 'rooms', roomId, 'players', uid), payload);
}

export async function finishPlayer({ roomId, uid, wpm, accuracy }) {
    await updateDoc(doc(db, 'rooms', roomId, 'players', uid), {
        wpm,
        accuracy,
        progress: 1,
        finishedAt: serverTimestamp(),
    });
}


