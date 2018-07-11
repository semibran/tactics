import * as Map from "./map"
import * as Unit from "./unit"
import * as Cell from "./cell"

export default function range(map, unit) {
	var radius = Unit.mov(unit)
	if (!radius) {
		return []
	}

	var start = { steps: 0, cell: unit.cell }
	var queue = [ start ]
	var cells = []
	while (queue.length) {
		var node = queue.shift()
		var neighbors = Cell.neighborhood(node.cell)

		for (var i = 0; i < neighbors.length; i++) {
			var neighbor = neighbors[i]

			if (!Map.contains(map, neighbor)) {
				continue
			}

			if (Cell.equals(neighbor, unit.cell)) {
				continue
			}

			var tile = Map.tileAt(map, neighbor)
			if (tile.solid) {
				continue
			}

			for (var j = 0; j < cells.length; j++) {
				if (Cell.equals(neighbor, cells[j])) {
					break
				}
			}

			if (j < cells.length) {
				continue
			}

			for (var j = 0; j < map.units.length; j++) {
				var other = map.units[j]
				if (Cell.equals(neighbor, other.cell)) {
					break
				} else {
					other = null
				}
			}

			if (!other || other && !Unit.allied(unit, other)) {
				cells.push(neighbor)
			}

			if ((!other || other && Unit.allied(unit, other)) && node.steps < radius - 1) {
				queue.push({
					steps: node.steps + 1,
					cell: neighbor
				})
			} else {
				var range = Cell.neighborhood(neighbor)
				for (var j = 0; j < range.length; j++) {
					var cell = range[j]
					if (!Map.contains(map, cell)) {
						continue
					}

					if (Cell.equals(cell, unit.cell)) {
						continue
					}

					for (var k = 0; k < cells.length; k++) {
						if (Cell.equals(cell, cells[k])) {
							break
						}
					}

					if (k < cells.length) {
						continue
					}

					for (var k = 0; k < map.units.length; k++) {
						var other = map.units[k]
						if (Cell.equals(cell, other.cell)) {
							break
						} else {
							other = null
						}
					}

					if (other) {
						cells.push(cell)
					}
				}
			}
		}
	}
	return cells
}
