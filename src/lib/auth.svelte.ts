import { browser } from '$app/environment';
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    type Auth
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getApp } from './firebase';

export const authState = $state<{ user: User | null; loading: boolean }>({ user: null, loading: true });

let auth: Auth | null = null;

if (browser) {
    auth = getAuth(getApp());
    onAuthStateChanged(auth, (user) => {
        authState.user = user;
        authState.loading = false;
    });
}

function getAuthInstance(): Auth {
    if (!auth) throw new Error('Auth not initialized');
    return auth;
}

export async function signInWithGoogle() {
    try {
        await signInWithPopup(getAuthInstance(), new GoogleAuthProvider());
    } catch (e) {
        console.error('Sign-in failed:', e);
        throw e;
    }
}

export async function signOut() {
    await firebaseSignOut(getAuthInstance());
}
