import { collection, getDocs, getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getApp } from "./firebase";
import { authState } from "./auth.svelte";
import type { WikiCard } from "./wikipedia.model";

let db: Firestore | null = null;

function getDb() {
    if (!db) {
        db = getFirestore(getApp());
    }
    return db;
}

function userCardsCollection() {
    if (!authState.user) throw new Error('Not authenticated');
    return collection(getDb(), "users", authState.user.uid, "cards");
}

let cardCache: WikiCard[] | null = null;
let cacheIsDirty = true;

export function invalidateCardCache() {
    cacheIsDirty = true;
}

export async function getCardsForUser(): Promise<WikiCard[]> {
    if (cardCache && !cacheIsDirty) return cardCache;
    const snapshot = await getDocs(userCardsCollection());
    cardCache = snapshot.docs.map(doc => doc.data() as WikiCard);
    cacheIsDirty = false;
    return cardCache;
}
