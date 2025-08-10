/*
Usage:
  1) Create a service account key (Editor/Owner) for your Firebase project and download JSON
  2) Export env var:  export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccountKey.json"
  3) Run: node scripts/delete-auth-users.cjs
WARNING: Irreversible. Runs in the project pointed to by your service account.
*/

const admin = require('firebase-admin');

function requireCredentials() {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
        console.error('GOOGLE_APPLICATION_CREDENTIALS is not set.');
        console.error('Set it to the absolute path of your service account JSON and re-run.');
        process.exit(1);
    }
}

async function main() {
    requireCredentials();

    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });

    console.log('Deleting all Firebase Auth users in the project associated with the provided service account...');

    let nextPageToken = undefined;
    let totalDeleted = 0;
    do {
        const list = await admin.auth().listUsers(1000, nextPageToken);
        const uids = list.users.map((u) => u.uid);
        if (uids.length > 0) {
            const res = await admin.auth().deleteUsers(uids);
            totalDeleted += res.successCount;
            console.log(`Batch deleted: ${res.successCount}, errors: ${res.failureCount}`);
            if (res.errors && res.errors.length) {
                res.errors.slice(0, 5).forEach((e) => console.warn('Error:', e.error?.toString?.() || e.error, 'UID index:', e.index));
            }
        }
        nextPageToken = list.pageToken;
    } while (nextPageToken);

    console.log(`Done. Total users deleted: ${totalDeleted}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
