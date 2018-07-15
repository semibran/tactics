import * as Map from "./map"
import * as Unit from "./unit"
import * as Cell from "./cell"

export default function range(map, unit) {
	var range = {
		move: [ unit.cell ],
		attack: []
	}

	var mov = Unit.mov(unit)
	var start = { steps: 0, cell: unit.cell }
	var queue = [ start ]
	if (!mov) {
		queue.length = 0
	}
	while (queue.length) {
		var node = queue.shift()
		var neighbors = Cell.neighborhood(node.cell)
		for (var i = 0; i < neighbors.length; i++) {
			var neighbor = neighbors[i]
			if (!Map.contains(map, neighbor) || Map.tileAt(map, neighbor).solid) {
				continue
			}

			for (var j = 0; j < range.move.length; j++) {
				if (Cell.equals(neighbor, range.move[j])) {
					break
				}
			}

			if (j < range.move.length) {
				continue
			}

			var other = Map.unitAt(map, neighbor)
			if (!other) {
				range.move.push(neighbor)
			}

			if (other && !Unit.allied(unit, other)) {
				range.attack.push(neighbor)
			}

			if (node.steps < mov - 1 && (!other || Unit.allied(unit, other))) {
				queue.push({
					steps: node.steps + 1,
					cell: neighbor
				})
			}
		}
	}
	for (var i = 0; i < range.move.length; i++) {
		var cell = range.move[i]
		var neighbors = Cell.neighborhood(cell, unit.equipment.weapon.rng)
		for (var j = 0; j < neighbors.length; j++) {
			var neighbor = neighbors[j]
			if (!Map.contains(map, neighbor)
			|| Map.tileAt(map, neighbor).solid
			|| Cell.equals(unit.cell, neighbor)
			) {
				continue
			}

			var other = Map.unitAt(map, neighbor)
			if (other && Unit.allied(unit, other)) {
				continue
			}

			for (var k = 0; k < range.attack.length; k++) {
				if (Cell.equals(range.attack[k], neighbor)) {
					break
				}
			}
			if (k < range.attack.length) {
				continue
			}
			range.attack.push(neighbor)
		}
	}
	return range
}
