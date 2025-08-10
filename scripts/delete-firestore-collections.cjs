/*
Deletes Firestore collections: users, runs, rooms (and rooms/{id}/players)

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccountKey.json"
  node scripts/delete-firestore-collections.cjs

WARNING: Irreversible. Ensure the credentials point to the correct project.
*/

const admin = require('firebase-admin');

function requireCredentials() {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
        console.error('GOOGLE_APPLICATION_CREDENTIALS is not set.');
        process.exit(1);
    }
}

async function deleteQueryBatch(db, query, batchSize = 500) {
    const snapshot = await query.get();
    if (snapshot.empty) return 0;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
}

async function deleteCollection(db, collectionPath, batchSize = 500) {
    const colRef = db.collection(collectionPath);
    let total = 0;
    while (true) {
        const query = colRef.limit(batchSize);
        const numDeleted = await deleteQueryBatch(db, query, batchSize);
        total += numDeleted;
        if (numDeleted === 0) break;
    }
    return total;
}

async function deleteRoomsWithPlayers(db) {
    const roomsSnap = await db.collection('rooms').get();
    let totalPlayers = 0;
    for (const roomDoc of roomsSnap.docs) {
        const playersCol = roomDoc.ref.collection('players');
        // Delete players in batches
        while (true) {
            const playersSnap = await playersCol.limit(500).get();
            if (playersSnap.empty) break;
            const batch = db.batch();
            playersSnap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            totalPlayers += playersSnap.size;
        }
    }
    // Delete room docs themselves
    let totalRooms = 0;
    while (true) {
        const snap = await db.collection('rooms').limit(500).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        totalRooms += snap.size;
    }
    return { totalRooms, totalPlayers };
}

async function main() {
    requireCredentials();
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    const db = admin.firestore();

    console.log('Deleting Firestore collections: users, runs, rooms (with players) ...');

    const usersDeleted = await deleteCollection(db, 'users');
    console.log(`Deleted users docs: ${usersDeleted}`);

    const runsDeleted = await deleteCollection(db, 'runs');
    console.log(`Deleted runs docs: ${runsDeleted}`);

    const { totalRooms, totalPlayers } = await deleteRoomsWithPlayers(db);
    console.log(`Deleted room player docs: ${totalPlayers}`);
    console.log(`Deleted rooms docs: ${totalRooms}`);

    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
