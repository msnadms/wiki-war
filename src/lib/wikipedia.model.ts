export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'boss';

export type CardCategory =
    | 'people'
    | 'geography'
    | 'science'
    | 'nature'
    | 'media'
    | 'sports'
    | 'history'
    | 'neutral';

export interface Stats {
    hp: number;
    atk: number;
    def: number;
    currentBlock: number;
}

export interface WikiCard {
    title: string;
    extract: string;
    pageUrl: string;
    thumbnailUrl?: string | null;
    views: number;
    rarity: Rarity;
    category?: CardCategory;
    stats?: Stats;
    hasMadeMove?: boolean
    battleOver?: boolean
    kept?: boolean
}
