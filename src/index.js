import loadImage from "img-load"
import View from "./view"
import Anim from "./anim"
import Anims from "./anims"
import disassemble from "./sprites"
import pathfind from "../lib/pathfind"
import manhattan from "../lib/manhattan"
import * as AI from "../lib/ai"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"
import * as Map from "../lib/map"
import * as Game from "../lib/game"

const root = document.querySelector("main")

loadImage("sprites.png")
	.then(main)

let map = {
	tiles: [
		{ name: "grass", solid: false },
		{ name: "wall",  solid: true  },
		{ name: "floor", solid: false }
	],
	layout: {
		size: [ 25, 25 ],
		data: (
			"#########################" +
			"#      ##.......##      #" +
			"#      ##.......##      #" +
			"#      ##.......##      #" +
			"#      ####...####      #" +
			"#      ####...####      #" +
			"#      ##.......##      #" +
			"#    ####.......####    #" +
			"#    ####.......####    #" +
			"#    ...............    #" +
			"#    ####.......####    #" +
			"#    ####.......####    #" +
			"#      ##.......##      #" +
			"#      ###########      #" +
			"#      ###########      #" +
			"#                       #" +
			"#                       #" +
			"#      ##       ##      #" +
			"#      ##       ##      #" +
			"#########       #########" +
			"#########       #########" +
			"                         " +
			"                         " +
			"                         " +
			"                         "
		)
			.split("")
			.map(c => {
				switch (c) {
					case " ": return 0
					case "#": return 1
					case ".": return 2
				}
			})
	},
	units: [
		Unit.create("knight",  "player", false,    [ 11, 16 ]),
		Unit.create("knight",  "player", false,    [ 13, 16 ]),
		Unit.create("warrior", "player", false,    [ 10, 18 ]),
		Unit.create("rogue",   "player", false,    [ 12, 18 ]),
		Unit.create("warrior", "player", false,    [ 14, 18 ]),
		Unit.create("mage",    "player", false,    [ 11, 20 ]),
		Unit.create("mage",    "player", false,    [ 13, 20 ]),
		Unit.create("knight",  "enemy",  "defend", [ 12,  1 ]),
		Unit.create("warrior", "enemy",  "wait",   [ 10,  2 ]),
		Unit.create("warrior", "enemy",  "wait",   [ 14,  2 ]),
		Unit.create("knight",  "enemy",  "defend", [ 11,  4 ]),
		Unit.create("knight",  "enemy",  "defend", [ 12,  4 ]),
		Unit.create("knight",  "enemy",  "defend", [ 13,  4 ]),
		Unit.create("knight",  "enemy",  "defend", [  5,  9 ]),
		Unit.create("knight",  "enemy",  "defend", [ 19,  9 ]),
		Unit.create("warrior", "enemy",  "wait",   [ 13, 12 ]),
		Unit.create("rogue",   "enemy",  "wait",   [ 11, 11 ]),
		Unit.create("rogue",   "enemy",  "wait",   [ 12,  9 ]),
		Unit.create("warrior", "enemy",  "wait",   [ 13,  7 ]),
		Unit.create("mage",    "enemy",  "attack", [ 15, 10 ]),
		Unit.create("mage",    "enemy",  "attack", [  9,  7 ]),
		Unit.create("warrior", "enemy",  "attack", [  0, 23 ]),
		Unit.create("knight",  "enemy",  "attack", [  1, 21 ]),
		Unit.create("warrior", "enemy",  "attack", [ 24, 22 ]),
		Unit.create("knight",  "enemy",  "attack", [ 22, 23 ]),
		Unit.create("rogue",   "enemy",  "wait",   [  3, 13 ]),
		Unit.create("rogue",   "enemy",  "wait",   [ 21, 13 ]),
		Unit.create("warrior", "enemy",  "attack", [  2, 18 ]),
		Unit.create("mage",    "enemy",  "attack", [  4,  3 ]),
		Unit.create("rogue",   "enemy",  "attack", [  2,  4 ]),
		Unit.create("mage",    "enemy",  "attack", [ 22,  4 ]),
		Unit.create("rogue",   "enemy",  "attack", [ 20,  3 ]),
		Unit.create("rogue",   "enemy",  "wait",   [ 23, 14 ]),
	]
}

let phase = {
	faction: "player",
	pending: []
}

let game = {
	phase: phase,
	map: map
}

for (let i = 0; i < map.units.length; i++) {
	let unit = map.units[i]
	if (unit.faction === phase.faction) {
		phase.pending.push(unit)
	}
}

function main(spritesheet) {
	let sprites = disassemble(spritesheet)
	let view = View(256, 240, sprites)
	let canvas = view.context.canvas
	let selecting = false
	let strategy = null
	root.appendChild(canvas)
	loop()

	function loop() {
		View.render(view, game)
		View.update(view)
		if (view.cache.phase.faction === "player") {
			if (view.mouse) {
				let viewport = view.viewport
				if (view.mouse[0] <= 32 && viewport.position[0] >= 0) {
					let speed = Math.round((32 - view.mouse[0]) / 32 * 4)
					viewport.position[0] -= speed
				} else if (view.mouse[0] >= viewport.size[0] - 32 && viewport.position[0] + viewport.size[0] <= 400) {
					let speed = Math.round((32 - (viewport.size[0] - view.mouse[0])) / 32 * 4)
					viewport.position[0] += speed
				}
				if (view.mouse[1] <= 32 && viewport.position[1] >= 0) {
					let speed = Math.round((32 - view.mouse[1]) / 32 * 4)
					viewport.position[1] -= speed
				} else if (view.mouse[1] >= viewport.size[1] - 32 && viewport.position[1] + viewport.size[1] <= 400) {
					let speed = Math.round((32 - (viewport.size[1] - view.mouse[1])) / 32 * 4)
					viewport.position[1] += speed
				}
			}
			strategy = null
		} else {
			if (!strategy) {
				let enemies = map.units.filter(unit => unit.faction === "enemy")
				strategy = AI.analyze(map, "enemy")
				for (let i = 0; i < strategy.length; i++) {
					let actions = strategy[i]
					let unit = enemies[i]
					for (let action of actions) {
						let [ type, ...data ] = action
						if (type === "move") {
							let [ goal ] = data
							let range = Unit.range(map, unit)
							for (let enemy of enemies) {
								range.push(enemy.cell)
							}
							let path = pathfind(range, unit.cell, goal)
							view.anims.push(Anim("move", unit, Anims.move(path)))
							unit.cell = goal
						} else if (type === "attack") {
							let [ target ] = data
							if (!map.units.includes(target)) {
								continue
							}
							let hp = target.hp
							Unit.attack(unit, target)
							view.anims.push(Anim("attack", unit, Anims.attack(unit.cell, target.cell)))
							if (target.hp < hp) {
								view.anims.push(
									Anim("flinch", target, Anims.flinch())
								)
							}
							if (!target.hp) {
								map.units.splice(map.units.indexOf(target), 1)
								view.anims.push(
									Anim("fade", target, Anims.fade())
								)
							}
						}
					}
					Game.endTurn(game, unit)
				}
			}
		}
		requestAnimationFrame(loop)
	}

	window.addEventListener("mousemove", event => {
		if (event.target === canvas) {
			let viewport = view.viewport
			let cell = [
				Math.floor((event.offsetX + viewport.position[0]) / 16),
				Math.floor((event.offsetY + viewport.position[1]) / 16)
			]
			view.mouse = [ event.offsetX, event.offsetY ]
			view.cursor = cell
			let target = Map.unitAt(map, cell)
			if (target) {
				view.hover.target = target
			} else {
				view.hover.target = null
			}
			let unit = view.selection
			if (unit) {
				let prev = view.path[view.path.length - 1]
				let target = Map.unitAt(map, cell)
				if (Cell.equals(cell, unit.cell)) {
					view.path = [ unit.cell ]
				} else if (!Cell.equals(prev, cell)
				&& !(target && manhattan(prev, cell) <= Unit.rng(unit))
				&& view.cache.range.find(other => Cell.equals(other, cell))
				) {
					// check if the current cell is already in the path
					for (var i = 0; i < view.path.length; i++) {
						let other = view.path[i]
						if (Cell.equals(other, cell)) {
							break
						}
					}
					if (i < view.path.length) {
						// truncate the path up to the current cell
						view.path.splice(i + 1, view.path.length - i - 1)
						return
					}
					// filter out occupied cells
					let range = view.cache.range.slice()
					for (let i = 0; i < range.length; i++) {
						let cell = range[i]
						if (cell) {
							let other = Map.unitAt(map, cell)
							if (other && !Unit.allied(unit, other)) {
								range.splice(i--, 1)
							}
						}
					}
					let allies = map.units.filter(other => Unit.allied(unit, other))
					for (let ally of allies) {
						range.push(ally.cell)
					}
					let pathless = range.slice()
					for (let i = 0; i < pathless.length; i++) {
						let cell = pathless[i]
						for (let j = 0; j < view.path.length; j++) {
							let other = view.path[j]
							if (Cell.equals(cell, other)) {
								pathless.splice(i--, 1)
								break
							}
						}
					}
					let goal = cell
					if (target) {
						let neighbors = Cell.neighborhood(target.cell, Unit.rng(unit))
							.filter(neighbor => range.find(cell => Cell.equals(cell, neighbor)))
						if (neighbors.length) {
							goal = neighbors[0]
						}
					}
					if (allies.find(ally => Cell.equals(goal, ally.cell))) {
						return
					}
					let path = pathfind(pathless, prev, goal)
					if (path && view.path.length + path.length - 2 <= Unit.mov(unit)) {
						path.shift() // exclude duplicate start cell
						view.path.push(...path)
					} else {
						// path not found OR path was too long, recalculate
						view.path = pathfind(range, unit.cell, goal)
					}
				}
			}
		} else {
			view.cursor = null
			view.mouse = null
		}
	})

	canvas.addEventListener("mousedown", event => {
		if (!view.cursor) {
			let viewport = view.viewport
			view.cursor = [
				Math.floor((event.offsetX - viewport.position[0]) / 16),
				Math.floor((event.offsetY - viewport.position[1]) / 16)
			]
		}

		view.mouse = [ event.offsetX, event.offsetY ]

		if (!view.selection) {
			let unit = Map.unitAt(map, view.cursor)
			if (unit
			&& unit.faction === "player"
			&& phase.faction === "player"
			&& !view.anims.find(anim => anim.target.faction === "enemy")
			&& phase.pending.includes(unit)
			) {
				selecting = true
				view.selection = unit
				view.path = [ unit.cell ]

				view.anims.push(
					Anim("lift", unit, Anims.lift()),
					Anim("float", unit, Anims.float())
				)
			}
		}
	})

	canvas.addEventListener("mouseup", event => {
		if (!view.cursor) {
			let viewport = view.viewport
			view.cursor = [
				Math.floor((event.offsetX - viewport.position[0]) / 16),
				Math.floor((event.offsetY - viewport.position[1]) / 16)
			]
		}

		view.mouse = [ event.offsetX, event.offsetY ]

		let unit = view.selection
		if (unit) {
			if (Cell.equals(view.cursor, unit.cell)) {
				if (!selecting) {
					view.selection = null
					view.path = []
					Game.endTurn(game, unit)
					let height = null
					let anim = view.anims[0]
					if (anim && (anim.type === "lift" || anim.type === "float")) {
						height = anim.data.height
						view.anims.shift()
					}
					view.anims.push(
						Anim("drop", unit, Anims.drop(height)),
					)
				} else {
					selecting = false
				}
				return
			}
			if (view.cache.range.find(cell => Cell.equals(cell, view.cursor))) {
				selecting = false
				let unit = view.selection
				let target = Map.unitAt(map, view.cursor)
				if (target && Unit.allied(unit, target)) {
					return
				}

				if (view.anims[0].type === "float") {
					view.anims.shift()
				}

				let anim = Anim("move", unit, Anims.move(view.path))
				view.anims.push(anim)

				unit.cell = view.path[view.path.length - 1]
				if (target) {
					let hp = target.hp
					Unit.attack(unit, target)
					view.anims.push(
						Anim("attack", unit, Anims.attack(unit.cell, target.cell))
					)
					if (target.hp < hp) {
						view.anims.push(
							Anim("flinch", target, Anims.flinch())
						)
					}
					if (!target.hp) {
						map.units.splice(map.units.indexOf(target), 1)
						view.anims.push(
							Anim("fade", target, Anims.fade())
						)
					}
				}
				Game.endTurn(game, unit)
			} else {
				let height = null
				let anim = view.anims[0]
				if (anim && (anim.type === "lift" || anim.type === "float")) {
					height = anim.data.height
					view.anims.shift()
				}
				view.anims.push(
					Anim("drop", unit, Anims.drop(height)),
				)
			}
			if (!selecting) {
				view.selection = null
				view.path = []
			}
		}
	})
}
