import { authState } from "$lib/auth.svelte"
import { getAdminDb } from "./firebase-admin"

async function getUserData() {
    if (!authState.user) throw new Error('Not Authenticated')
    const db = getAdminDb()
    const userRef = db.collection('user-data').doc(authState.user.uid)
    await userRef.get()
}