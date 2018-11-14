import * as Unit from "./unit"

export function create(map) {
	let units = map.units.map(unit => Unit.create(...unit))
	return {
		map: {
			id: map.id,
			tiles: map.tiles,
			layout: map.layout,
			units: units
		},
		phase: {
			faction: "player",
			pending: units.filter(unit => unit.faction === "player")
		}
	}
}

export function endTurn(game, unit) {
	let pending = game.phase.pending
	let index = pending.indexOf(unit)
	if (index !== -1) {
		pending.splice(index, 1)
		if(!pending.length) {
			nextPhase(game)
		}
		return true
	} else {
		return false
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
