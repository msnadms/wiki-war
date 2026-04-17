import type { WikiCard } from "./wikipedia.model";

export const usedCards: WikiCard[] = $state([]);

export function toggleUsed(article: WikiCard): void {
    const idx = usedCards.findIndex(c => c.title === article.title);
    if (idx === -1) {
        usedCards.push(article);
    } else {
        usedCards.splice(idx, 1);
    }
}
