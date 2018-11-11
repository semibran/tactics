import * as Map from "../lib/map"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"

const delay = 15
const interval = 3

export function update(cursor, keys, game, view) {
	let { held, prev } = keys
	let { map, phase } = game

	if (held.confirm && !prev.confirm) {
		if (!cursor.selection) {
			if (cursor.under) {
				cursor.selection = cursor.under
				cursor.selection.time = 0
			}
		} else {
			let unit = cursor.selection.unit
			if (phase.pending.includes(unit)) {
				let index = map.units.indexOf(unit)
				let cached = view.cache.units[index]
				let range = view.cache.ranges[index]
				if (range) {
					let path = view.cache.path
					if (path && path.length) {
						let dest = path[path.length - 1].slice()
						let target = Map.unitAt(map, cursor.cell)
						if (range.move.find(cell => Cell.equals(cell, cursor.cell))) {
							Unit.move(cached, dest, map)
						} else if (target && range.attack.find(cell => Cell.equals(cell, cursor.cell))) {
							Unit.move(cached, dest, map)
							if (!view.cache.target) {
								view.cache.target = {
									unit: target,
									time: 0
								}
							}
						}
					} else {
						view.cache.moved = true
					}
				}
			} else {
				deselect(cursor)
			}
		}
	}

	if (held.mod && cursor.selection && phase.pending.includes(cursor.selection.unit)) {
		let unit = cursor.selection.unit
		let index = map.units.indexOf(unit)
		let range = view.cache.ranges[index]
		if (held.left && !prev.left && !held.right) {
			for (var x = cursor.cell[0]; x >= 0; x--) {
				for (var i = 0; i < range.move.length; i++) {
					let cell = range.move[i]
					if (cell[0] === x - 1 && cell[1] === cursor.cell[1]) {
						break
					}
				}
				if (i === range.move.length) {
					break
				}
			}
			cursor.cell[0] = x
		} else if (held.right && !prev.right && !held.left) {
			for (var x = cursor.cell[0]; x < map.layout.size[0]; x++) {
				for (var i = 0; i < range.move.length; i++) {
					let cell = range.move[i]
					if (cell[0] === x + 1 && cell[1] === cursor.cell[1]) {
						break
					}
				}
				if (i === range.move.length) {
					break
				}
			}
			cursor.cell[0] = x
		}
		if (held.up && !prev.up && !held.down) {
			for (var y = cursor.cell[1]; y >= 0; y--) {
				for (var i = 0; i < range.move.length; i++) {
					let cell = range.move[i]
					if (cell[1] === y - 1 && cell[0] === cursor.cell[0]) {
						break
					}
				}
				if (i === range.move.length) {
					break
				}
			}
			cursor.cell[1] = y
		} else if (held.down && !prev.down && !held.up) {
			for (var y = cursor.cell[1]; y < map.layout.size[1]; y++) {
				for (var i = 0; i < range.move.length; i++) {
					let cell = range.move[i]
					if (cell[1] === y + 1 && cell[0] === cursor.cell[0]) {
						break
					}
				}
				if (i === range.move.length) {
					break
				}
			}
			cursor.cell[1] = y
		}
	} else {
		if ((held.left && !prev.left || held.left > delay && !(held.left % interval)) && !held.right) {
			move(cursor, "left", map)
		} else if ((held.right && !prev.right || held.right > delay && !(held.right % interval)) && !held.left) {
			move(cursor, "right", map)
		}

		if ((held.up && !prev.up || held.up > delay && !(held.up % interval)) && !held.down) {
			move(cursor, "up", map)
		} else if ((held.down && !prev.down || held.down > delay && !(held.down % interval)) && !held.up) {
			move(cursor, "down", map)
		}
	}

	let unit = Map.unitAt(map, cursor.cell)
	if (unit) {
		if (!cursor.under || unit !== cursor.under.unit) {
			if (!cursor.under && view.cache.selected && view.cache.selected.unit === unit) {
				cursor.under = view.cache.selected
			} else {
				cursor.under = { unit, time: 0 }
			}
		} else {
			cursor.under.time++
		}
	} else {
		cursor.under = null
	}

	if (!cursor.selection) {
		if (held.select && !prev.select) {
			let reverse = held.mod
			cycle(cursor, game, reverse)
		}
	}
}

export function select(cursor, unit) {
	if (!cursor.selection) {
		cursor.selection = {
			unit: unit,
			time: 0
		}
	}
}

export function deselect(cursor) {
	cursor.selection = null
}

export function move(cursor, direction, map) {
	let bounds = map.layout.size
	if (direction === "left") {
		if (--cursor.cell[0] < 0) {
			cursor.cell[0] = 0
		}
	} else if (direction === "right") {
		if (++cursor.cell[0] >= bounds[0]) {
			cursor.cell[0] = bounds[0] - 1
		}
	} else if (direction === "up") {
		if (--cursor.cell[1] < 0) {
			cursor.cell[1] = 0
		}
	} else if (direction === "down") {
		if (++cursor.cell[1] >= bounds[1]) {
			cursor.cell[1] = bounds[1] - 1
		}
	}
}

export function cycle(cursor, game, reverse) {
	let { map, phase } = game
	let unit = Map.unitAt(map, cursor.cell)
	if (!unit) {
		unit = phase.pending.find(unit => unit.faction === phase.faction)
		if (unit) {
			cursor.cell = unit.cell.slice()
		}
		return
	}

	let other = null
	let allies = map.units.filter(other => other.faction === unit.faction)
	let units = unit.faction === phase.faction
		? phase.pending
		: allies
	let index = units.indexOf(unit)
	if (units === phase.pending && index === -1) {
		index = allies.indexOf(unit)
		units = allies
	}
	if (!reverse) {
		// cycle forward (+1)
		if (index + 1 < units.length) {
			other = units[index + 1]
		} else {
			other = units[0]
		}
	} else {
		// cycle backwards (-1)
		if (index - 1 >= 0) {
			other = units[index - 1]
		} else {
			other = units[units.length - 1]
		}
	}
	if (other) {
		cursor.cell = other.cell.slice()
	}
}
