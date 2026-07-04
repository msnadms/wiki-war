import type { Stats, CardCategory } from './wikipedia.model'

export type Action = 'attack' | 'block' | 'use'

export interface MoveRecord {
    type: Action
    cardTitle: string
    targetTitle: string | 'all'
}

interface Counter {
    category: CardCategory
    multiplier: number
}

export const TypeCounters: Record<CardCategory, Counter[]> = {
    people:    [{ category: 'history',   multiplier: 1.5 }, { category: 'nature',  multiplier: 1.5 }],
    geography: [{ category: 'nature',    multiplier: 1.5 }, { category: 'neutral', multiplier: 1.5 }],
    science:   [{ category: 'geography', multiplier: 1.5 }, { category: 'people',  multiplier: 1.5 }],
    nature:    [{ category: 'science',   multiplier: 2.0 }, { category: 'neutral', multiplier: 1.5 }],
    media:     [{ category: 'science',   multiplier: 1.5 }, { category: 'history', multiplier: 1.5 }],
    sports:    [{ category: 'media',     multiplier: 1.5 }, { category: 'people',  multiplier: 1.5 }],
    history:   [{ category: 'geography', multiplier: 2.0 }, { category: 'sports',  multiplier: 1.5 }],
    neutral:   [{ category: 'history',   multiplier: 2.0 }, { category: 'media',   multiplier: 1.5 }],
}

function getMultiplier(attacker?: CardCategory, target?: CardCategory): number {
    if (!attacker || !target) return 1
    return TypeCounters[attacker].find(c => c.category === target)?.multiplier ?? 1
}

export function calcBossAction(bossStats: Stats, turn: number): Action {
    const { atk, def } = bossStats
    const seed = atk + def * 31
    const hash = (seed * 2654435761) >>> 0
    const patterns: Action[][] = [
        ['attack', 'block', 'block'],
        ['attack', 'block', 'attack'],
        ['attack', 'attack', 'attack'],
        ['block', 'attack', 'attack'],
        ['attack', 'block', 'block'],
    ]
    const pattern = patterns[hash % patterns.length]
    return pattern[turn % pattern.length]
}

export function handleAttack(stats: Stats, target: Stats, attackerCategory?: CardCategory, targetCategory?: CardCategory): void {
    if (target.hp <= 0 || stats.hp <= 0) return
    const damage = Math.ceil(stats.atk * getMultiplier(attackerCategory, targetCategory))
    target.hp -= Math.max(damage - target.currentBlock, 0)
    target.currentBlock = Math.max(target.currentBlock - damage, 0)
}
