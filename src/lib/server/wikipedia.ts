import type { WikiCard, Rarity, Stats } from '$lib/wikipedia.model';
import { classifyDescription } from './classifier';

interface PageStats {
    views: number
    increasing: boolean
    recentAvg: number
    firstHalfAvg: number
}

const NUM_RETRIES = 3;

async function fetchWikiStats(title: string): Promise<PageStats> {

    const [start, end] = getDateRange()
    const response = await fetchWithRetry(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${title}/monthly/${start}/${end}`)

    if (!response.ok) throw new Error(`Wikipedia API error: ${response.status}`);
    const data = await response.json();

    const items: { views: number }[] = data.items;
    const mid = Math.floor(items.length / 2);
    const avg = (slice: { views: number }[]) => slice.reduce((s, i) => s + i.views, 0) / slice.length;
    const firstHalfAvg = avg(items.slice(0, mid));
    const secondHalfAvg = avg(items.slice(mid));
    return {
        views: items.reduce((sum, item) => sum + item.views, 0),
        increasing: secondHalfAvg > firstHalfAvg,
        recentAvg: avg(items.slice(-15)),
        firstHalfAvg,
    };
}

export async function fetchRandomArticle(boss: boolean = false): Promise<WikiCard> {
    const response = await fetchWithRetry('https://en.wikipedia.org/api/rest_v1/page/random/summary')

    if (!response.ok) throw new Error(`Wikipedia API error: ${response.status}`);
    const data = await response.json();
    const pageStats: PageStats = await fetchWikiStats(data.title);
    const rarity = !boss ? assignRarity() : 'boss';
    const stats: Stats = {
        hp: calcHp(pageStats.views, rarity),
        atk: calcAtk(pageStats.recentAvg, pageStats.increasing, rarity),
        def: calcDef(pageStats.firstHalfAvg, rarity),
        currentBlock: 0
    }
    return {
        title: data.title,
        extract: data.extract,
        pageUrl: data.content_urls.desktop.page,
        thumbnailUrl: data.thumbnail?.source ?? null,
        views: pageStats.views,
        rarity: rarity,
        category: classifyDescription(data.description),
        stats: stats,
        hasMadeMove: false
    };
}

const rarityMults: Record<Rarity, number> = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    legendary: 2.5,
    boss: 4
}

function assignRarity(): Rarity {
    const roll = Math.random();
    if (roll <= 0.03) return 'legendary';
    if (roll < 0.15) return 'rare';
    if (roll < 0.35) return 'uncommon';
    return 'common';
}

const logScale = (n: number) => Math.ceil(Math.log(Math.max(n, 1)) / Math.log(1.05));

function calcHp(views: number, rarity: Rarity) {
    const hpMult = rarity !== 'boss' ? 2 : 1;
    return Math.ceil(logScale(views) * rarityMults[rarity] * hpMult);
}

function calcAtk(recentAvg: number, increasing: boolean, rarity: Rarity) {
    return Math.ceil(logScale(recentAvg) * (increasing ? 1.3 : 0.7) * rarityMults[rarity]);
}

function calcDef(firstHalfAvg: number, rarity: Rarity) {
    return Math.ceil(logScale(firstHalfAvg) * rarityMults[rarity]);
}

function getDateRange(): [string, string] {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    const startDate = new Date(endDate.getFullYear() - 6, endDate.getMonth() + 1, 1);
    return [fmt(startDate), fmt(endDate)]
}

function rateLimitDelay(response: Response): number {
    const header = response.headers.get('Retry-After');
    const MAX_WAIT = 10_000;
    if (header) {
        const seconds = Number(header);
        const requested = isNaN(seconds)
            ? new Date(header).getTime() - Date.now()
            : seconds * 1000;
        return Math.min(requested, MAX_WAIT);
    } else {
        return 5_000;
    }
}

async function fetchWithRetry(url: string): Promise<Response> {
    let delay = 3000;
    for(let retries: number = 0; retries < NUM_RETRIES; retries++) {
        const response = await fetch(
            url, 
            { headers: { 'User-Agent': 'WikiCardGame/1.0 (msnsupportdev@gmail.com)' } }
        );
        if (response.ok || retries === NUM_RETRIES - 1) return response;
        if (response.status === 404) throw new Error('404 not found');
        if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay(response)));
            continue;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
    throw new Error();
}
