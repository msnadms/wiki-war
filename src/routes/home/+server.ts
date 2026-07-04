import { getAdminAuth, getAdminDb } from "$lib/server/firebase-admin";
import { json, type RequestHandler } from "@sveltejs/kit";
import type { WikiCard, Stats } from '$lib/wikipedia.model';
import { calcBossAction, handleAttack, type MoveRecord } from '$lib/battle-engine'
import type { BattleState } from "$lib/battle.svelte";

export const POST: RequestHandler = async ({request}) => {
    let uid;
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    try {
        const decoded = await getAdminAuth().verifyIdToken(token!)
        uid = decoded.uid
    } catch (e) {
        return json({ error: `Invalid token ${e}` }, { status: 401 })
    }

    const date = new Date().toISOString().slice(0, 10)
    const db = getAdminDb()

    // Parse body before the transaction — stream can only be read once and transactions may retry
    let moves: MoveRecord[]
    try {
        const body = await request.json()
        if (!Array.isArray(body.moves)) throw new Error()
        moves = body.moves
    } catch {
        return json({ error: 'incorrect moves format' }, { status: 400 })
    }

    const dailyRef = db.collection('users').doc(uid).collection('daily').doc(date)
    const cardsRef = db.collection('users').doc(uid).collection('cards')
    const result = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(dailyRef)
        if (!snap.exists) return { error: 'no daily cards', status: 404 }
        const data = snap.data()!
        const cards: WikiCard[] = data.cards
        const boss: WikiCard = data.boss
        let state: BattleState = !data.state ? {
            playerStats: Object.fromEntries(cards.map((card) => [card.title, { ...card.stats! }])),
            bossStats: { ...boss.stats! },
            turn: 0,
            battleOver: false
        } : data.state as BattleState

        if (state.battleOver) return { error: 'battle is already over', status: 400 }

        const aliveCount = Object.values(state.playerStats).filter(s => s.hp > 0).length
        if (moves.length === 0 || moves.length > aliveCount) return { state: 'invalid' }
        const allMoved = moves.length === aliveCount

        Object.values(state.playerStats).forEach(s => s.currentBlock = 0)
        state.bossStats.currentBlock = 0

        const movedTitles = new Set<string>()
        for (const move of moves) {

            const playerCard = cards.find((card) => card.title === move.cardTitle)
            if (!playerCard) return { state: 'invalid' }
            const playerStats = state.playerStats[playerCard.title]
            if (playerStats.hp <= 0) return { state: 'invalid' }
            if (movedTitles.has(move.cardTitle)) return { state: 'invalid' }
            movedTitles.add(move.cardTitle)

            if (move.type === 'attack') {
                handleAttack(playerStats, state.bossStats, playerCard.category, boss.category)
            } else if (move.type === 'block') {
                const targetStats = state.playerStats[move.targetTitle]
                if (!targetStats) return { state: 'invalid' }
                targetStats.currentBlock += playerStats.def
            } else {
                return { state: 'invalid' }
            }
        }
        if (state.bossStats.hp <= 0) {
            state.battleOver = true
            cards.forEach((card) => card.kept = true)
            transaction.update(dailyRef, { state, cards: cards })
            return { state: 'won', cardsToWrite: cards }
        }
        if (!allMoved) return { state: 'invalid' }

        const action = calcBossAction(state.bossStats, state.turn)
        state.turn++
        if (action === 'attack') {
            cards
                .filter((card) => state.playerStats[card.title].hp > 0)
                .forEach((card) =>
                    handleAttack(state.bossStats, state.playerStats[card.title], boss.category, card.category))
        } else {
            state.bossStats.hp = Math.min(state.bossStats.hp + state.bossStats.def, boss.stats!.hp)
        }
        if (Object.values(state.playerStats).every((stats) => stats.hp <= 0)) {
            state.battleOver = true
            const idx = Math.floor(Math.random() * cards.length)
            cards[idx].kept = true
            transaction.update(dailyRef, { state, cards: cards })
            return { state: 'lost', cardsToWrite: [cards[idx]] }
        }
        transaction.update(dailyRef, { state })
        return { state: 'ongoing' }
    })

    if (result && 'error' in result) return json({ error: result.error }, { status: result.status ?? 400 })
    const { cardsToWrite, ...response } = result as { cardsToWrite?: WikiCard[], state: string }
    if (cardsToWrite) {
        await Promise.all(cardsToWrite.map((card: WikiCard) => cardsRef.add(card)))
    }
    return json({ ...response, ...(cardsToWrite && { kept: cardsToWrite.map(c => c.title) }) })
}