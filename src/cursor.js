import * as Map from "../lib/map"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"

const delay = 15
const interval = 3

export function update(cursor, keys, map, view) {
	let { held, prev } = keys

	if (held.confirm && !prev.confirm) {
		if (!cursor.selection) {
			let unit = Map.unitAt(map, cursor.cell)
			if (unit) {
				select(cursor, unit)
			}
		} else {
			let unit = cursor.selection.unit
			if (unit.faction === "player") {
				let index = map.units.indexOf(unit)
				let cached = view.cache.units[index]
				let range = view.cache.ranges[index]
				if (range && range.move.find(cell => Cell.equals(cell, cursor.cell))) {
					Unit.move(cached, cursor.cell.slice(), map)
				}
			}
		}
	}

	let bounds = map.layout.size
	if ((held.left && !prev.left || held.left > delay && !(held.left % interval)) && !held.right) {
		move(cursor, "left", bounds)
	} else if ((held.right && !prev.right || held.right > delay && !(held.right % interval)) && !held.left) {
		move(cursor, "right", bounds)
	}
	if ((held.up && !prev.up || held.up > delay && !(held.up % interval)) && !held.down) {
		move(cursor, "up", bounds)
	} else if ((held.down && !prev.down || held.down > delay && !(held.down % interval)) && !held.up) {
		move(cursor, "down", bounds)
	}

	if (!cursor.selection) {
		if (held.select && !prev.select) {
			cycle(cursor, map)
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

export function move(cursor, direction, bounds) {
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

export function cycle(cursor, map) {
	let unit = Map.unitAt(map, cursor.cell)
	if (!unit) {
		unit = map.units.find(unit => unit.faction === "player")
		if (unit) {
			cursor.cell = unit.cell.slice()
		}
		return
	}

	let index = map.units.indexOf(unit)
	let other = null
	for (let i = index + 1; i < map.units.length; i++) {
		other = map.units[i]
		if (other.faction === unit.faction) {
			break
		} else {
			other = null
		}
	}
	if (!other) {
		for (let i = 0; i <= index; i++) {
			other = map.units[i]
			if (other.faction === unit.faction) {
				break
			} else {
				other = null
			}
		}
	}
	if (other) {
		cursor.cell = other.cell.slice()
	}
}
