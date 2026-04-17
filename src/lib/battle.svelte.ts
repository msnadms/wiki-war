import type { WikiCard, Stats } from "./wikipedia.model"
import { type Action, type MoveRecord, calcBossAction, handleAttack } from "./battle-engine"
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
let roundLoading = $state(false)
let cards: WikiCard[] = []

let bossTurn = 0

// Move sequence is validated server side, along with permanently banning any users with invalid sequences
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
    const action = pendingAction
    pendingAction = null
    await enterMove({...action, target: card})
}

export async function enterMove(move: Move) {
    if (bossCard == null) return
    if (move.card !== bossCard && move.card.stats!.hp <= 0) return

    sequence.push(move)
    if (move.card !== bossCard) move.card.hasMadeMove = true

    const stats = move.card.stats!
    if (move.type === 'block') {
        const blockTarget = move.target === 'all' ? stats : move.target.stats!
        blockTarget.currentBlock += stats.def
    } else if (move.type === 'attack') {
        if (move.target === 'all') {
            cards.forEach(c => handleAttack(stats, c.stats!, move.card.category, c.category))
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

        const token = await authState.user!.getIdToken()
        const response = await fetch('/home', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ moves: roundMoves })
        })
        const result = await response.json()

        if (result.state === 'won') {
            handleBattleOver()
        } else if (result.state === 'lost' || result.state === 'ongoing') {
            const bossAction = calcBossAction(bossCard!.stats!, bossTurn)
            bossTurn++
            await enterMove({ type: bossAction, card: bossCard!, target: 'all' })
            if (result.state === 'lost') handleBattleOver()
        }
        roundLoading = false
    }
}

function handleBattleOver() {
    cards.forEach((card) => {
        card.battleOver = true
        card.hasMadeMove = false
    })
    bossCard!.battleOver = true
}

export function setBoss(boss: WikiCard | null) {
    bossCard = boss
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
