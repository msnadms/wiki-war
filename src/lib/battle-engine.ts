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

// Blocking must outvalue a def-sized shield or attacking always dominates;
// 2.5x makes reacting to the boss telegraph the winning play (Monte Carlo tuned)
export const BLOCK_MULTIPLIER = 2.5
export const ENRAGE_TURN = 10
const ENRAGE_RAMP = 0.25

export function calcBlockAmount(def: number): number {
    return Math.ceil(def * BLOCK_MULTIPLIER)
}

// Boss damage ramps after ENRAGE_TURN so battles cannot stall indefinitely
export function enrageMultiplier(turn: number): number {
    return turn >= ENRAGE_TURN ? 1 + ENRAGE_RAMP * (turn - ENRAGE_TURN + 1) : 1
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
        ['attack', 'attack', 'block'],
    ]
    const pattern = patterns[hash % patterns.length]
    return pattern[turn % pattern.length]
}

export function handleAttack(stats: Stats, target: Stats, attackerCategory?: CardCategory, targetCategory?: CardCategory, damageMult: number = 1): void {
    if (target.hp <= 0 || stats.hp <= 0) return
    const damage = Math.ceil(stats.atk * getMultiplier(attackerCategory, targetCategory) * damageMult)
    target.hp -= Math.max(damage - target.currentBlock, 0)
    target.currentBlock = Math.max(target.currentBlock - damage, 0)
}
