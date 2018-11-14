import manhattan from "./manhattan"
import * as Map from "./map"
import { equals, neighborhood } from "./cell"

export default function pathfind(map, start, goal, whitelist) {
	var path = []
	var open = [ start ]
	var opened = {}
	var closed = {}
	var parent = {}
	var g = {}
	var f = {}
	if (whitelist) {
		for (var i = 0; i < whitelist.length; i++) {
			var cell = whitelist[i]
			g[cell] = Infinity
			f[cell] = Infinity
		}
	} else {
		for (var y = 0; y < map.layout.size[1]; y++) {
			for (var x = 0; x < map.layout.size[0]; x++) {
				var cell = x + "," + y
				g[cell] = Infinity
				f[cell] = Infinity
			}
		}
	}
	g[start] = 0
	f[start] = manhattan(start, goal)
	while (open.length) {
		var best = { score: Infinity, index: -1, cell: null }
		for (var i = 0; i < open.length; i++) {
			var cell = open[i]
			var score = f[cell]
			if (score < best.score) {
				best.score = score
				best.index = i
				best.cell = cell
			}
		}
		var cell = best.cell
		if (equals(cell, goal)) {
			while (!equals(cell, start)) {
				path.unshift(cell)
				cell = parent[cell]
			}
			path.unshift(cell)
			return path
		}
		open.splice(best.index, 1)
		opened[cell] = false
		closed[cell] = true
		var neighbors = neighborhood(cell)
		for (var i = 0; i < neighbors.length; i++) {
			var neighbor = neighbors[i]
			if (closed[neighbor]) {
				continue
			}
			if (whitelist) {
				for (var j = 0; j < whitelist.length; j++) {
					var other = whitelist[j]
					if (equals(other, neighbor)) {
						break
					}
				}
				if (j === whitelist.length) {
					continue
				}
			}
			if (!Map.walkable(map, neighbor, cell)) {
				continue
			}
			if (!opened[neighbor]) {
				opened[neighbor] = true
				open.push(neighbor)
			}
			var score = g[cell] + 1
			if (score >= g[neighbor]) {
				continue
			}
			parent[neighbor] = cell
			g[neighbor] = score
			f[neighbor] = score + manhattan(neighbor, goal)
		}
	}
}
