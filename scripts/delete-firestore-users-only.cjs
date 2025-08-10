/*
Deletes only the Firestore 'users' collection.

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccountKey.json"
  node scripts/delete-firestore-users-only.cjs
*/

const admin = require('firebase-admin');

function requireCredentials() {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
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

async function main() {
    requireCredentials();
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    const db = admin.firestore();
    const deleted = await deleteCollection(db, 'users');
    console.log(`Deleted users docs: ${deleted}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
