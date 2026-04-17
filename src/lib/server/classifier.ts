import type { CardCategory } from '$lib/wikipedia.model';

const CATEGORY_RULES: [CardCategory, string[]][] = [
    ['sports', [
        'football club', 'football team', 'cricket', 'basketball', 'baseball', 'rugby',
        'athlete', 'racing driver', 'cyclist', 'swimmer', 'boxer', 'golfer', 'footballer',
        'tennis player', 'sprinter', 'marathon runner', 'jockey', 'ice hockey',
        'volleyball', 'gymnastics', 'weightlifter', 'badminton', 'snooker player',
        'nfl', 'nba', 'mlb', 'nhl', 'uefa', 'fifa', 'soccer', 'footballer',
    ]],
    ['people', [
        'actor', 'actress', 'politician', 'musician', 'singer', 'composer',
        'film director', 'television director', 'director', 'author', 'writer', 'novelist',
        'scientist', 'philosopher', 'painter', 'poet', 'journalist', 'architect',
        'general', 'admiral', 'president', 'prime minister',
        'entrepreneur', 'activist', 'astronaut', 'explorer', 'historian',
        'economist', 'psychologist', 'professor', 'academic', 'comedian',
        'rapper', 'guitarist', 'drummer', 'bassist', 'violinist', 'conductor',
        'photographer', 'sculptor', 'illustrator', 'animator', 'producer',
        'engineer', 'inventor', 'mathematician', 'biologist', 'chemist', 'physician', 'judge'
    ]],
    ['geography', [
        'city', 'town', 'village', 'municipality', 'mountain', 'river', 'lake',
        'island', 'country', 'region', 'district', 'county', 'province', 'commune',
        'borough', 'township', 'suburb', 'capital city', 'sea', 'ocean', 'strait',
        'gulf', 'fjord', 'desert', 'plateau', 'canyon', 'glacier', 'waterfall',
        'national park', 'archipelago', 'peninsula', 'valley', 'bay', 'cape',
        'census-designated place', 'unincorporated community', 'atoll', 'baronetcy',
    ]],
    ['nature', [
        'species', 'genus', 'subspecies', 'family of', 'order of', 'breed of',
        'plant', 'animal', 'insect', 'bird', 'fish', 'mammal', 'fungus', 'bacteria',
        'reptile', 'amphibian', 'arachnid', 'virus', 'algae', 'tree', 'flower',
        'shrub', 'coral', 'mollusc', 'mollusk', 'crustacean', 'butterfly', 'moth',
        'beetle', 'shark', 'whale', 'dolphin', 'penguin', 'eagle', 'snake', 'lizard',
    ]],
    ['media', [
        'film', 'movie', 'television series', 'tv series', 'animated series',
        'sitcom', 'miniseries', 'documentary', 'album', 'song', 'single',
        'video game', 'comic', 'manga', 'anime', 'novel', 'podcast',
        'musical', 'opera', 'ballet', 'play', 'soundtrack', 'web series',
        'role-playing game', 'board game', 'series', 'theatre',
    ]],
    ['science', [
        'mathematics', 'mathematical', 'physics', 'chemistry', 'theorem', 'algorithm',
        'biology', 'astronomy', 'geology', 'ecology', 'neuroscience',
        'medicine', 'medical', 'pharmaceutical', 'vaccine', 'disease',
        'syndrome', 'disorder', 'nuclear', 'quantum', 'chemical element',
        'hypothesis', 'theory of', 'law of', 'computer science',
    ]],
    ['history', [
        'war', 'battle', 'treaty', 'dynasty', 'empire', 'revolution',
        'ancient', 'medieval', 'massacre', 'assassination', 'conquest',
        'invasion', 'crusade', 'expedition', 'colonization', 'independence',
        'rebellion', 'coup', 'siege',
    ]],
];

export function classifyDescription(description: string | undefined): CardCategory {
    if (!description) return 'neutral';
    const d = ' ' + description.toLowerCase() + ' ';
    return CATEGORY_RULES.find(([, keywords]) => keywords.some(k => d.includes(' ' + k + ' ')))?.[0] ?? 'neutral';
}
