import { browser } from "$app/environment";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_FIREBASE_STORAGE_BUCKET,
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_MEASUREMENT_ID
} from "$env/static/public";

const firebaseConfig = {
    apiKey: PUBLIC_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: PUBLIC_FIREBASE_APP_ID,
    measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;

if (browser) {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
}

export function getApp(): FirebaseApp {
    if (!app) throw new Error('firebase app not initialized');
    return app;
}

export function getAnalyticsInstance(): Analytics {
    if (!analytics) throw new Error('firebase analytics not initialized');
    return analytics;
}