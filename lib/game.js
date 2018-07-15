import * as Unit from "./unit"

export function create(map) {
	return {
		map: {
			layout: map.layout,
			units: map.units.map(unit => Unit.create(...unit))
		},
		phase: {
			faction: "player",
			pending: map.units.filter(unit => unit.faction === "player")
		}
	}
}

export function endTurn(game, unit) {
	let pending = game.phase.pending
	pending.splice(pending.indexOf(unit), 1)
	if(!pending.length) {
		nextPhase(game)
	}
}

export function nextPhase(game) {
	let { map, phase } = game
	phase.faction =
		phase.faction === "player"
			? "enemy"
			: "player"
	phase.pending = map.units.filter(unit => unit.faction === phase.faction)
	if (!phase.pending.length) {
		nextPhase(game)
	}
}
