import type { WikiCard, Stats } from "./wikipedia.model"
import { type Action, type MoveRecord, calcBossAction, calcBlockAmount, enrageMultiplier, handleAttack } from "./battle-engine"
import { authState } from "./auth.svelte"

export type { Action }

export interface Move {
    type: Action
    card: WikiCard
    target: WikiCard | 'all'
}

export interface PendingAction {
    type: Action
    card: WikiCard
}

export interface BattleState {
    playerStats: Record<string, Stats>
    bossStats: Stats
    turn: number
    battleOver: boolean
}

let pendingAction: PendingAction | null = $state(null)
let bossCard: WikiCard | null = $state(null)
let bossMaxHp: number = 0
let roundLoading = $state(false)
let cards: WikiCard[] = []

let bossTurn = $state(0)

// Move sequence is validated server side; rejected rounds are rolled back to the server's state
let sequence: Move[] = []

export function startAction(type: Action, card: WikiCard) {
    pendingAction = {type, card}
}

export function registerCard(card: WikiCard) {
    cards.push(card)
}

export async function selectTarget(card: WikiCard) {
    if (!pendingAction) return
    if (card.stats!.hp <= 0) return
    // Attacks may only target the boss (matches server validation); blocks only teammates
    if (pendingAction.type === 'attack' && card !== bossCard) return
    if (pendingAction.type === 'block' && card === bossCard) return
    const action = pendingAction
    pendingAction = null
    await enterMove({...action, target: card})
}

export async function enterMove(move: Move, bossDamageMult: number = 1) {
    if (bossCard == null) return
    if (move.card !== bossCard && move.card.stats!.hp <= 0) return

    sequence.push(move)
    if (move.card !== bossCard) move.card.hasMadeMove = true

    const stats = move.card.stats!
    if (move.type === 'block') {
        const blockTarget = move.target === 'all' ? stats : move.target.stats!
        if (move.card.rarity === 'boss') {
            blockTarget.hp = Math.min(blockTarget.hp + stats.def, bossMaxHp)
        } else {
            blockTarget.currentBlock += calcBlockAmount(stats.def)
        }
    } else if (move.type === 'attack') {
        if (move.target === 'all') {
            cards.forEach(c => handleAttack(stats, c.stats!, move.card.category, c.category, bossDamageMult))
        } else {
            handleAttack(stats, move.target.stats!, move.card.category, move.target.category)
            if (move.target === bossCard && bossCard.stats!.hp <= 0) {
                cards.forEach(c => { if (c.stats!.hp > 0) c.hasMadeMove = true })
            }
        }
    }

    const alivePlayers = cards.filter(c => c.stats!.hp > 0)
    if (alivePlayers.length > 0 && alivePlayers.every(c => c.hasMadeMove)) {
        cards.forEach(c => c.hasMadeMove = false)
        roundLoading = true

        const lastBossIdx = sequence.findLastIndex(m => m.card === bossCard)
        const roundMoves: MoveRecord[] = sequence.slice(lastBossIdx + 1).map(m => ({
            type: m.type,
            cardTitle: m.card.title,
            targetTitle: m.target === 'all' ? 'all' : m.target.title
        }))

        try {
            const token = await authState.user!.getIdToken()
            const response = await fetch('/home', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ moves: roundMoves })
            })
            if (!response.ok) {
                sequence = sequence.slice(0, lastBossIdx + 1)
                return
            }
            const result = await response.json()

            if (result.state === 'invalid') {
                // Server rejected the round: drop its moves and snap back to the authoritative state
                sequence = sequence.slice(0, lastBossIdx + 1)
                if (result.battle) restoreBattleState(result.battle)
            } else if (result.state === 'won') {
                if (result.battle) restoreBattleState(result.battle)
                handleBattleOver(result.kept)
            } else if (result.state === 'lost' || result.state === 'ongoing') {
                // Play the boss move locally for animation, then sync to the server's state
                const bossAction = calcBossAction(bossCard!.stats!, bossTurn)
                const bossDamageMult = enrageMultiplier(bossTurn)
                bossTurn++
                await enterMove({ type: bossAction, card: bossCard!, target: 'all' }, bossDamageMult)
                cards.forEach(c => c.stats!.currentBlock = 0)
                bossCard!.stats!.currentBlock = 0
                if (result.battle) restoreBattleState(result.battle)
                if (result.state === 'lost') handleBattleOver(result.kept)
            }
        } finally {
            roundLoading = false
        }
    }
}

function handleBattleOver(kept: string[] = []) {
    const keptSet = new Set(kept)
    cards.forEach((card) => {
        card.battleOver = true
        card.hasMadeMove = false
        card.kept = card.kept || keptSet.has(card.title)
    })
    bossCard!.battleOver = true
}

export function setBoss(boss: WikiCard | null) {
    bossCard = boss
    if (!boss) return
    bossMaxHp = boss.stats!.hp
}

export function resetBattle() {
    pendingAction = null
    bossCard = null
    roundLoading = false
    cards = []
    bossTurn = 0
    sequence = []
}

export function isRoundLoading() {
    return roundLoading
}

export function restoreBattleState(state: BattleState) {
    bossTurn = state.turn
    for (const card of cards) {
        const stored = state.playerStats[card.title]
        if (stored) Object.assign(card.stats!, stored)
    }
    if (bossCard) Object.assign(bossCard.stats!, state.bossStats)
    if (state.battleOver) handleBattleOver()
}

export function getNextBossAction() {
    if (!bossCard) return null
    return calcBossAction(bossCard.stats!, bossTurn)
}

// Enrage multiplier for the boss's upcoming turn (1 until ENRAGE_TURN)
export function getEnrageMultiplier() {
    return enrageMultiplier(bossTurn)
}

export function getPendingAction() {
    return pendingAction
}

export function getSequence(): MoveRecord[] {
    return sequence.map(m => ({
        type: m.type,
        cardTitle: m.card.title,
        targetTitle: m.target === 'all' ? 'all' : m.target.title
    }))
}
