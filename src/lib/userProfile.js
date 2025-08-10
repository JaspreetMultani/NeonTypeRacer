import { db } from './firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    collection,
    getDocs,
    serverTimestamp,
} from 'firebase/firestore';

function sanitizeUsername(input, fallback) {
    const base = (input || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    return base || fallback;
}

export async function ensureUserProfile(user) {
    const userDocRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userDocRef);
    if (existing.exists()) {
        return existing.data();
    }

    let candidate = sanitizeUsername(
        user.displayName,
        `user_${user.uid.slice(0, 6)}`
    );

    // Ensure uniqueness
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 5) {
        const q = query(collection(db, 'users'), where('username', '==', candidate));
        const qs = await getDocs(q);
        if (qs.empty) {
            unique = true;
        } else {
            attempts += 1;
            const suffix = Math.floor(Math.random() * 9000 + 1000);
            candidate = sanitizeUsername(`${candidate}${suffix}`, `user_${user.uid.slice(0, 6)}`);
        }
    }

    const profile = {
        username: candidate,
        avatarUrl: user.photoURL || null,
        createdAt: serverTimestamp(),
    };
    await setDoc(userDocRef, profile);
    return profile;
}

export async function getUserProfile(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

export async function checkUsernameAvailable(desiredUsername) {
    const sanitized = sanitizeUsername(desiredUsername, '');
    if (!sanitized || sanitized.length < 3) return false;
    const q = query(collection(db, 'users'), where('username', '==', sanitized));
    const qs = await getDocs(q);
    return qs.empty;
}

export async function createProfileWithUsername(user, desiredUsername) {
    const sanitized = sanitizeUsername(desiredUsername, `user_${user.uid.slice(0, 6)}`);
    if (!sanitized || sanitized.length < 3) {
        throw new Error('Username must be at least 3 characters (letters, numbers, underscore).');
    }
    const available = await checkUsernameAvailable(sanitized);
    if (!available) {
        throw new Error('That username is taken.');
    }
    const profile = {
        username: sanitized,
        avatarUrl: user.photoURL || null,
        createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    return profile;
}

export async function updateUsername({ uid, desiredUsername }) {
    const sanitized = sanitizeUsername(desiredUsername, '');
    if (!sanitized || sanitized.length < 3) {
        throw new Error('Username must be at least 3 characters (letters, numbers, underscore).');
    }
    // Check uniqueness
    const q = query(collection(db, 'users'), where('username', '==', sanitized));
    const qs = await getDocs(q);
    if (!qs.empty) {
        // If the existing doc is the same user, allow it
        const sameUser = qs.docs.length === 1 && qs.docs[0].id === uid;
        if (!sameUser) {
            throw new Error('That username is taken.');
        }
    }
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { username: sanitized });
    return sanitized;
}


