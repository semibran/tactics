import { x, y, equals } from "./cell"

export function width(map) {
	return map.layout.size[0]
}

export function height(map) {
	return map.layout.size[1]
}

export function tileAt(map, cell) {
	return map.tiles[map.layout.data[y(cell) * width(map) + x(cell)]]
}

export function unitAt(map, cell) {
	for (var i = 0; i < map.units.length; i++) {
		var unit = map.units[i]
		if (equals(cell, unit.cell)) {
			return unit
		}
	}
}

export function contains(map, cell) {
	return x(cell) >= 0
	    && x(cell) < width(map)
	    && y(cell) >= 0
	    && y(cell) < height(map)
}
