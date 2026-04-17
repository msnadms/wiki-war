import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getAdminDb, getAdminAuth } from '$lib/server/firebase-admin';
import { fetchRandomArticle } from '$lib/server/wikipedia';
import type { WikiCard } from '$lib/wikipedia.model';

async function verifyToken(formData: FormData): Promise<{ uid: string } | ReturnType<typeof fail>> {
    const token = formData.get('token');
    if (typeof token !== 'string') return fail(401, { error: 'Unauthorized' });
    try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        return { uid: decoded.uid };
    } catch (e) {
        return fail(401, { error: `Invalid token ${e}` });
    }
}

export const actions: Actions = {
    refresh: async ({ request }) => {
        const formData = await request.formData();
        const auth = await verifyToken(formData);
        if ('status' in auth) return auth;
        const { uid } = auth;

        const date = new Date().toISOString().slice(0, 10);
        const db = getAdminDb();

        const dailyRef = db.collection('users').doc(uid).collection('daily').doc(date)
        const dailyCards = await dailyRef.get();
        if (dailyCards.exists) {
            console.log('Cards found. Using daily cards...')
            const data = dailyCards.data()!;
            return { articles: data.cards as WikiCard[], boss: data.boss as WikiCard, useDaily: true, battleState: data.state ?? null };
        }

        const cardsRef = db.collection('users').doc(uid).collection('cards');
        const existing = await cardsRef.get();
        const existingTitles = new Set(existing.docs.map(doc => doc.data().title as string));

        console.log('No cards found. Calling wikipedia...')
        let articles: WikiCard[];
        let boss: WikiCard;
        try {
            [boss, ...articles] = await Promise.all([
                fetchRandomArticle(true),
                ...Array.from({ length: 3 }, () => fetchRandomArticle()),
            ]);
        } catch (e) {
            return fail(503, { error: e instanceof Error ? e.message : 'Failed to fetch articles' });
        }

        const newCards = articles.filter(card => !existingTitles.has(card.title));
        await Promise.all([
            dailyRef.set({ cards: articles, boss }),
            ...newCards.map(card => cardsRef.add(card))
        ]);

        return { articles, boss, useDaily: false };
    },
};
