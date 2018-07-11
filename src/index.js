import loadImage from "img-load"
import View from "./view"
import Anim from "./anim"
import Anims from "./anims"
import disassemble from "./sprites"
import pathfind from "../lib/pathfind"
import manhattan from "../lib/manhattan"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"
import * as Map from "../lib/map"
import * as Game from "../lib/game"

const root = document.querySelector("main")

loadImage("sprites.png")
	.then(main)

let map = {
	tiles: [
		{ name: "null", solid: false },
		{ name: "wall", solid: true }
	],
	layout: {
		size: [ 16, 16 ],
		data: [
			1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
			1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1,
			1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
			1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1,
			1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
			1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		]
	},
	units: [
		Unit.create("warrior", "player", [ 14, 10 ]),
		Unit.create("rogue",   "player", [  1,  0 ]),
		Unit.create("mage",    "player", [  8, 11 ]),
		Unit.create("knight",  "enemy",  [  6,  1 ]),
		Unit.create("warrior", "enemy",  [  4,  2 ]),
		Unit.create("warrior", "enemy",  [  8,  2 ]),
		Unit.create("mage",    "enemy",  [ 13,  1 ]),
		Unit.create("warrior", "enemy",  [ 12,  3 ]),
		Unit.create("knight",  "enemy",  [ 14,  5 ]),
		Unit.create("mage",    "enemy",  [ 11,  8 ])
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
	let view = View(sprites)
	let canvas = view.context.canvas
	let selecting = false
	root.appendChild(canvas)
	loop()

	function loop() {
		View.render(view, game)
		View.update(view)
		requestAnimationFrame(loop)
	}

	window.addEventListener("mousemove", event => {
		let cell = [
			Math.floor(event.offsetX / 16),
			Math.floor(event.offsetY / 16)
		]
		if (event.target === canvas) {
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
					// filter out already used cells
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
		}
	})

	canvas.addEventListener("mousedown", event => {
		if (!view.cursor) {
			view.cursor = [
				Math.floor(event.offsetX / 16),
				Math.floor(event.offsetY / 16)
			]
		}

		if (!view.selection) {
			let unit = Map.unitAt(map, view.cursor)
			if (unit
			&& phase.pending.includes(unit)
			&& unit.faction === phase.faction
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
			view.cursor = [
				Math.floor(event.offsetX / 16),
				Math.floor(event.offsetY / 16)
			]
		}

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
