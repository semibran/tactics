import * as Map from "./map"
import * as Unit from "./unit"
import * as Cell from "./cell"
import pathfind from "./pathfind"

export function analyze(map, faction) {
	let strategy = []
	let copy = {
		tiles: map.tiles,
		layout: map.layout,
		units: map.units.map(unit => Object.assign({}, unit))
	}
	let cells = []
	let [ width, height ] = map.layout.size
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let i = y * width + x
			let id = map.layout.data[i]
			let tile = map.tiles[id]
			if (!tile.solid) {
				cells.push([ x, y ])
			}
		}
	}
	let units = copy.units.filter(unit => unit.faction === faction)
	for (let unit of units) {
		let actions = []
		strategy.push(actions)

		let targets = []
		if (unit.ai === "defend") {
			let range = Cell.neighborhood(unit.cell, Unit.rng(unit))
			for (let cell of range) {
				let other = Map.unitAt(copy, cell)
				if (other && !Unit.allied(unit, other)) {
					targets.push(other)
				}
			}
			if (targets.length) {
				let target = priority(unit, targets)
				actions.push([ "attack", map.units[copy.units.indexOf(target)] ])
				Unit.attack(unit, target)
			}
		} else if (unit.ai === "wait") {
			let range = Unit.range(copy, unit)
			for (let cell of range) {
				let other = Map.unitAt(copy, cell)
				if (other && !Unit.allied(unit, other)) {
					targets.push(other)
				}
			}
			if (targets.length) {
				let target = priority(unit, targets)
				let neighbors = Cell.neighborhood(target.cell, Unit.rng(unit))
					.filter(neighbor => range.find(cell => Cell.equals(cell, neighbor)) && !Map.unitAt(copy, neighbor))
				if (neighbors.length) {
					neighbors.sort((a, b) => Cell.manhattan(target.cell, b) - Cell.manhattan(target.cell, a))
					let goal = neighbors[0]
					actions.push([ "move", goal ], [ "attack", map.units[copy.units.indexOf(target)] ])
					unit.cell = goal
					Unit.attack(unit, target)
				}
			}
		} else if (unit.ai === "attack") {
			let range = Unit.range(copy, unit)
			for (let cell of range) {
				let other = Map.unitAt(copy, cell)
				if (other && !Unit.allied(unit, other)) {
					targets.push(other)
				}
			}
			if (targets.length) {
				targets.sort((a, b) => a.hp - b.hp)
				if (targets[0].hp === 3) {
					targets.sort((a, b) => Cell.manhattan(unit.cell, a.cell) - Cell.manhattan(unit.cell, b.cell))
				}
				let target = targets[0]
				let neighbors = Cell.neighborhood(target.cell, Unit.rng(unit))
					.filter(neighbor => range.find(cell => Cell.equals(cell, neighbor)) && !Map.unitAt(copy, neighbor))
				if (neighbors.length) {
					neighbors.sort((a, b) => Cell.manhattan(target.cell, b) - Cell.manhattan(target.cell, a))
					let goal = neighbors[0]
					actions.push([ "move", goal ], [ "attack", map.units[copy.units.indexOf(target)] ])
					unit.cell = goal
					Unit.attack(unit, target)
				}
			} else {
				targets = copy.units.filter(other => !Unit.allied(unit, other))
				if (targets.length) {
					let paths = targets.map(target => pathfind(cells, unit.cell, target.cell).slice(0, -1))
					targets.sort((a, b) => paths[targets.indexOf(a)].length - paths[targets.indexOf(b)])
					let target = targets[0]
					let path = paths.find(path => Cell.manhattan(path[path.length - 1], target.cell) === 1)
					let goals = []
					for (let i = 0; i < range.length; i++) {
						let cell = range[i]
						let other = path.find(other => Cell.equals(cell, other))
						if (other && !Map.unitAt(copy, cell)) {
							goals.push(other)
						}
					}
					if (goals.length) {
						goals.sort((a, b) => path.indexOf(b) - path.indexOf(a))
						let goal = goals[0]
						actions.push([ "move", goal ])
						unit.cell = goal
					}
				}
			}
		}
	}
	return strategy
}

function priority(unit, targets) {
	targets = targets.slice()
	targets.sort((a, b) => a.hp - b.hp)
	let hp = Infinity
	for (let i = 0; i < targets.length; i++) {
		let target = targets[i]
		if (target.hp <= hp) {
			hp = target.hp
		} else {
			targets = targets.slice(0, i + 1)
			break
		}
	}
	targets.sort((a, b) => Cell.manhattan(unit.cell, a.cell) - Cell.manhattan(unit.cell, b.cell))
	return targets[0]
}
