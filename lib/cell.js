export function x(cell) {
	return cell[0]
}

export function y(cell) {
	return cell[1]
}

export function equals(a, b) {
	return x(a) === x(b) && y(a) === y(b)
}

export function neighborhood(cell, radius) {
	if (!radius) radius = 1
	var start = { steps: 0, cell: cell }
	var queue = [ start ]
	var cells = [ cell ]
	while (queue.length) {
		var node = queue.shift()
		var neighbors = [
			[ x(node.cell) - 1, y(node.cell) ],
			[ x(node.cell) + 1, y(node.cell) ],
			[ x(node.cell), y(node.cell) - 1 ],
			[ x(node.cell), y(node.cell) + 1 ]
		]
		for (var i = 0; i < neighbors.length; i++) {
			var neighbor = neighbors[i]
			if (cells.length > 1) {
				for (var j = 0; j < cells.length; j++) {
					var other = cells[j]
					if (equals(neighbor, other)) {
						break
					}
				}
				if (j < cells.length) {
					continue
				}
			}
			cells.push(neighbor)
			if (node.steps + 1 < radius) {
				queue.push({
					steps: node.steps + 1,
					cell: neighbor
				})
			}
		}
	}
	return cells
}
