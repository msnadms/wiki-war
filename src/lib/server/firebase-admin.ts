import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PUBLIC_FIREBASE_PROJECT_ID } from '$env/static/public';

function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];
    return initializeApp({ projectId: PUBLIC_FIREBASE_PROJECT_ID });
}

export function getAdminDb() {
    return getFirestore(getAdminApp());
}

export function getAdminAuth() {
    return getAuth(getAdminApp());
}
