import * as Menu from "./menu"
import * as Map from "../lib/map"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"
import pathfind from "../lib/pathfind"
import Canvas from "../lib/canvas"
import Anims from "./anims"
import Anim from "./anim"

const symbols = {
	warrior: "axe",
	knight: "shield",
	rogue: "dagger",
	mage: "hat"
}

export function create(width, height, sprites) {
	let canvas = document.createElement("canvas")
	canvas.width = width
	canvas.height = height

	return {
		sprites: sprites,
		context: canvas.getContext("2d"),
		state: {
			time: 0,
			anims: [],
			cursor: {
				cell: null,
				prev: null,
				selection: null,
				under: null
			},
			viewport: {
				size: [ width, height ],
				position: null,
				target: null
			}
		},
		cache: {
			map: null,
			selection: null,
			selected: null,
			moved: null,
			units: null,
			ranges: [],
			squares: [],
			dialogs: [],
			dialog: null
		}
	}
}

export function update(view) {
	let { cache, state } = view
	state.time++

	let cursor = state.cursor
	if (cursor.selection) {
		cursor.selection.time++
	} else if (cache.selection) {
		cache.selection.time++
	}

	let anims = view.state.anims
	let anim = anims[0]
	if (!anim) return
	if (anim.done) {
		anims.shift()
	} else {
		Anims[anim.type].update(anim)
	}
}

export function render(view, game) {
	let { context, sprites, cache } = view
	let { time, cursor, viewport, anims } = view.state
	let { map } = game
	let canvas = context.canvas
	let anim = anims[0]
	let order = [
		"floors",
		"squares",
		"shadows",
		"walls",
		"pieces",
		"arrows",
		"cursor",
		"selection",
		"dialogs"
	]

	let layers = {}
	for (let name of order) {
		layers[name] = []
	}

	context.beginPath()
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)

	if (!cache.units) {
		cache.units = map.units.map(unit => Object.assign({ original: unit }, unit))
	}

	if (!cache.map) {
		cache.map = drawMap(map, sprites.tiles)
	}

	layers.floors.push({
		image: cache.map.floors,
		position: [ 0, 0 ]
	})

	layers.walls.push({
		image: cache.map.walls,
		position: [ 0, 0 ]
	})

	if (!cursor.cell) {
		let unit = map.units.find(unit => unit.faction === "player")
		cursor.cell = unit.cell.slice()
		cursor.prev = cursor.cell.slice()
	}

	if (!viewport.target) {
		viewport.target = []
	}

	let focus = null
	if (!cursor.selection || !game.phase.pending.includes(cursor.selection.unit) || cache.moved) {
		focus = cursor.cell
	} else if (cursor.selection && game.phase.pending.includes(cursor.selection.unit)) {
		focus = cursor.selection.unit.cell
	}

	if (focus) {
		viewport.target[0] = focus[0] * 16 + 8 - viewport.size[0] / 2
		viewport.target[1] = focus[1] * 16 + 8 - viewport.size[1] / 2

		let max = Map.width(map) * 16 - viewport.size[0]
		if (viewport.target[0] < 0) {
			viewport.target[0] = 0
		} else if (viewport.target[0] > max) {
			viewport.target[0] = max
		}

		let may = Map.height(map) * 16 - viewport.size[1]
		if (viewport.target[1] < 0) {
			viewport.target[1] = 0
		} else if (viewport.target[1] > may) {
			viewport.target[1] = may
		}
	}

	if (!viewport.position) {
		viewport.position = viewport.target.slice()
	} else {
		viewport.position[0] += (viewport.target[0] - viewport.position[0]) / 16
		viewport.position[1] += (viewport.target[1] - viewport.position[1]) / 16
	}

	if (true) {
		let position = cursor.cell.map(free)
		let relative = [
			position[0] - viewport.position[0],
			position[1] - viewport.position[1]
		]

		// console.log(relative.map(snap))
	}

	let selection = cursor.selection || cache.selection
	if (selection) {
		let unit = selection.unit
		let time = selection.time
		let index = map.units.indexOf(unit)
		let cached = cache.units[index]
		let range = cache.ranges[index]
		if (!range) {
			range = cache.ranges[index] = Unit.range(map, unit)
		}

		let squares = cache.squares[index]
		if (!squares) {
			cache.squares[index] = squares = []
			for (let cell of range.move) {
				squares.push({
					sprite: sprites.ui.squares.move,
					cell: cell
				})
			}
			for (let cell of range.attack) {
				let valid = true
				for (let other of range.move) {
					if (Cell.equals(cell, other)) {
						valid = false
						break
					}
				}
				if (valid) {
					squares.push({
						sprite: sprites.ui.squares.attack,
						cell: cell
					})
				}
			}
		}

		if (cursor.selection && cache.selection !== cursor.selection) {
			cache.selection = selection
			cache.path = null
		}

		if (cursor.selection && !anims.find(anim => anim.target === cached)) {
			anims.push(Anim("lift", cached, Anims.lift()))
		}

		if (cache.selection && cache.selection !== cursor.selection) {
			cache.moved = false
			cache.menu = null
			if (anim && anim.type === "lift") {
				anim.done = true
				anims.push(
					Anim("drop", anim.target, Anims.drop(anim.data.height))
				)
				cache.selection.time = 0
			}
		}

		let moving = anim && anim.type === "move" && anim.target === cached
		if (!cache.moved && moving) {
			cache.moved = true
		}

		if (!cache.moved) {
			let radius = 0
			if (cursor.selection) {
				radius = selection.time
			} else {
				let max = 0
				for (let square of squares) {
					let steps = Cell.manhattan(unit.cell, square.cell)
					if (steps > max) {
						max = steps
					}
				}
				radius = Math.max(0, max - selection.time)
			}
			if (radius) {
				squares = squares.filter(square => Cell.manhattan(unit.cell, square.cell) <= radius)
				renderSquares(layers, sprites.ui.squares, squares)
			}
		}

		let path = cache.path
		if (Cell.equals(cursor.cell, unit.cell)) {
			if (path) {
				path.length = 1
			}
		} else if (game.phase.pending.includes(unit)
		&& cursor.selection
		&& range.move.find(cell => Cell.equals(cursor.cell, cell))
		&& !Map.unitAt(map, cursor.cell)
		) {
			let cells = range.move.slice()
			let allies = map.units.filter(other => Unit.allied(unit, other))
			for (let ally of allies) {
				cells.push(ally.cell)
			}

			if (!path) {
				path = cache.path = pathfind(cells, unit.cell, cursor.cell)
			} else {
				for (var i = 0; i < path.length; i++) {
					let cell = path[i]
					if (Cell.equals(cursor.cell, cell)) {
						break
					}
				}
				if (i < path.length - 1) {
					// truncate the path up to the current cell
					path.splice(i + 1, path.length - i - 1)
				} else {
					let pathless = cells.filter(cell => !path.find(other => Cell.equals(cell, other)))
					let prev = path[path.length - 1]
					let ext = pathfind(pathless, prev, cursor.cell)
					if (ext && path.length + ext.length - 2 <= Unit.mov(unit)) {
						ext.shift() // exclude duplicate start cell
						path.push(...ext)
					} else {
						path = cache.path = pathfind(cells, unit.cell, cursor.cell)
					}
				}
			}
		}

		if (path && (cursor.selection && !cache.moved || moving && time % 2)) {
			let arrow = sprites.ui.Arrow(path)
			layers.arrows.push(...arrow.map(sprite => ({
				image: sprite.image,
				position: [ sprite.position[0] * 16, sprite.position[1] * 16 ]
			})))
		}

		if (cache.moved && !moving && !cache.menu) {
			let options = null
			let neighbors = Cell.neighborhood(cached.cell, cached.equipment.weapon.rng)
			let enemy = null
			for (let neighbor of neighbors) {
				let other = Map.unitAt(map, neighbor)
				if (other && !Unit.allied(unit, other)) {
					enemy = other
					break
				}
			}
			if (enemy) {
				options = [ "attack", "wait" ]
			} else {
				options = [ "wait" ]
			}
			cache.menu = {
				data: Menu.create(options),
				box: null,
				size: [ 16, 16 ],
				targetSize: null
			}
		}
	}

	let selected = cursor.selection || cursor.under
	if (selected && !(cache.selected && selected !== cache.selected)) {
		if (!cache.selected) {
			cache.selected = selected
		}
		let unit = selected.unit
		let index = map.units.indexOf(unit)
		if (!cache.dialogs[index]) {
			let nameDialog = sprites.ui.Box((unit.name.length + 1) * 8 + 20, 24)
			let name = sprites.ui.Text(unit.name)
			let symbol = sprites.pieces.symbols[symbols[unit.type]]
			let context = nameDialog.getContext("2d")
			context.drawImage(symbol, 8, 8)
			context.drawImage(name, 20, 8)

			let hpDialog = sprites.ui.Box(84, 24)
			let bar = sprites.ui.HealthBar(unit.hp / 3, unit.faction)
			let label = sprites.ui.Text("HP")
			// let value = sprites.ui.Text(`${unit.hp}/3`)
			context = hpDialog.getContext("2d")
			context.drawImage(label, 8, 8)
			context.drawImage(bar, 28, 8)
			// context.drawImage(value, 80, 8)

			let y = viewport.size[1] - 68
			if (unit.cell[1] > Map.height(map) - viewport.size[1] / 32) {
				y = 0
			}

			cache.dialogs[index] = {
				name: {
					canvas: nameDialog,
					x: -nameDialog.width,
					y: y + 8
				},
				hp: {
					canvas: hpDialog,
					x: -hpDialog.width,
					y: y + 36
				}
			}
		}

		let dialogs = cache.dialogs[index]
		if (selected) {
			if (selected.time >= 12) {
				dialogs.name.x += (8 - dialogs.name.x) / 8
			}
			if (selected.time >= 16) {
				dialogs.hp.x += (8 - dialogs.hp.x) / 8
			}
		}

		layers.dialogs.push({
			image: dialogs.name.canvas,
			position: [ dialogs.name.x, dialogs.name.y ]
		})

		layers.dialogs.push({
			image: dialogs.hp.canvas,
			position: [ dialogs.hp.x, dialogs.hp.y ]
		})
	} else if (cache.selected) {
		let unit = cache.selected.unit
		let index = map.units.indexOf(unit)
		let dialogs = cache.dialogs[index]
		// move dialogs out of view
		if (dialogs.name.x > -dialogs.name.canvas.width
		|| dialogs.hp.x > -dialogs.hp.canvas.width
		) {
			dialogs.name.x -= 16
			dialogs.hp.x -= 16
		} else {
			cache.selected = null
		}

		layers.dialogs.push({
			image: dialogs.name.canvas,
			position: [ dialogs.name.x, dialogs.name.y ]
		})

		layers.dialogs.push({
			image: dialogs.hp.canvas,
			position: [ dialogs.hp.x, dialogs.hp.y ]
		})
	}

	let menu = cache.menu
	if (menu) {
		if (menu.data.selection) {
			let unit = cursor.selection.unit
			let index = map.units.indexOf(unit)
			let cached = cache.units[index]
			unit.cell = cached.cell
			cursor.selection = null
			cache.selection = null
			cache.squares.length = 0
			cache.ranges.length = 0
			cache.menu = null
			cache.moved = false
			anim.done = true
			anims.push(
				Anim("drop", anim.target, Anims.drop(anim.data.height))
			)
			let jndex = game.phase.pending.indexOf(unit)
			game.phase.pending.splice(jndex, 1)
		} else {
			if (!menu.targetSize) {
				let longest = ""
				for (let text of menu.data.options) {
					if (text.length > longest.length) {
						longest = text
					}
				}
				menu.targetSize = [
					longest.length * 8 + 36,
					menu.data.options.length * 16 + 16
				]
			}
			menu.size[0] += (menu.targetSize[0] - menu.size[0]) / 4
			menu.size[1] += (menu.targetSize[1] - menu.size[1]) / 4
			let box = sprites.ui.Box(...menu.size.map(Math.round))
			if (menu.targetSize[0] - menu.size[0] < 4) {
				let context = box.getContext("2d")
				for (let i = 0; i < menu.data.options.length; i++) {
					let text = menu.data.options[i]
					let label = sprites.ui.Text(text.toUpperCase())
					context.drawImage(label, 24, 12 + i * 16)
				}

				let symbol = null
				let option = menu.data.options[menu.data.index]
				if (option === "attack") {
					symbol = sprites.pieces.symbols.sword
				} else if (option === "wait") {
					symbol = sprites.pieces.symbols.clock
				}

				let frame = (time % 180) / 180
				context.drawImage(symbol, 12, 12 + menu.data.index * 16 - Math.sin(2 * Math.PI * frame * 2))
			}

			layers.dialogs.push({
				image: box,
				position: [ 144, 32 ]
			})
		}
	}

	if (!menu && !cache.moved) {
		renderCursor(layers, sprites.ui.cursor, cursor, view)
	}

	renderUnits(layers, sprites.pieces, game, view)
	renderLayers(layers, order, viewport, context)
}

function free(col) {
	return (col + 0.5) * 16
}

function snap(x) {
	return Math.floor(x / 16)
}

function renderSquares(layers, sprites, squares) {
	for (let square of squares) {
		let sprite = square.sprite
		let x = square.cell[0] * 16
		let y = square.cell[1] * 16
		layers.squares.push({
			image: sprite,
			position: [ x, y ]
		})
	}
}

function drawMap(map, sprites) {
	let cols = Map.width(map)
	let rows = Map.height(map)
	let floors = Canvas(cols * 16, rows * 16)
	let walls = Canvas(cols * 16, rows * 16)
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			let x = col * 16
			let y = row * 16
			let tile = Map.tileAt(map, [ col, row ])
			let sprite = null
			if (tile.name === "wall") {
				if (row + 1 < rows && Map.tileAt(map, [ col, row + 1 ]).name !== "wall") {
					sprite = sprites["wall-base"]
				} else {
					sprite = sprites.wall
				}
				walls.drawImage(sprite, x, y)
			} else if (tile.name === "grass") {
				if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall"
				&& row - 1 >= 0 && Map.tileAt(map, [ col - 1, row - 1 ]).name !== "wall"
				) {
					sprite = sprites["grass-base-corner"]
				} else if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall") {
					sprite = sprites["grass-base"]
				} else {
					sprite = sprites.grass
				}
				floors.drawImage(sprite, x, y)
			} else if (tile.name === "floor") {
				if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall"
				&& row - 1 >= 0 && Map.tileAt(map, [ col - 1, row - 1 ]).name !== "wall"
				) {
					sprite = sprites["floor-base-corner"]
				} else if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall") {
					sprite = sprites["floor-base"]
				} else {
					sprite = sprites.floor
				}
				floors.drawImage(sprite, x, y)
			} else {
				sprite = sprites[tile.name]
				floors.drawImage(sprite, x, y)
			}
		}
	}
	return {
		floors: floors.canvas,
		walls: walls.canvas
	}
}

function renderUnits(layers, sprites, game, view) {
	let map = game.map
	let phase = game.phase
	let cache = view.cache
	let anims = view.state.anims
	let anim = anims[0]
	for (let i = 0; i < cache.units.length; i++) {
		let unit = cache.units[i]
		let real = map.units[i]
		let cell = unit.cell
		let x = cell[0] * 16
		let y = cell[1] * 16
		let z = 0
		let sprite = sprites[unit.faction][symbols[unit.type]]
		if (!game.phase.pending.includes(real)
		&& game.phase.faction === unit.faction
		) {
			sprite = sprites.done[unit.faction][symbols[unit.type]]
		}
		if (!Cell.equals(unit.cell, real.cell)
		&& !cache.moved
		) {
			anim.done = true
			anim = anims[0] = Anim("move", unit, Anims.move(cache.path))
		}
		if (anim && anim.target === unit) {
			if ([ "lift", "drop" ].includes(anim.type)) {
				z = anim.data.height
			} else if (anim.type === "move") {
				x = anim.data.cell[0] * 16
				y = anim.data.cell[1] * 16
			}
			layers.selection.push({
				image: sprite,
				position: [ x, y - z ]
			})
		} else {
			layers.pieces.push({
				image: sprite,
				position: [ x, y ]
			})
		}
		layers.shadows.push({
			image: sprites.shadow,
			position: [ x + 1, y + 4 ]
		})
	}
}

function renderCursor(layers, sprites, cursor, view) {
	let time = view.state.time
	let cache = view.cache
	let dx = cursor.cell[0] - cursor.prev[0]
	let dy = cursor.cell[1] - cursor.prev[1]
	let d = Math.abs(dx) + Math.abs(dy)
	cursor.prev[0] += dx / 4
	cursor.prev[1] += dy / 4

	let frame = 0
	if (cursor.selection) {
		frame = 1
	} else if (d < 1e-3) {
		frame = Math.floor(time / 30) % 2
	}

	let x = cursor.prev[0] * 16
	let y = cursor.prev[1] * 16
	let sprite = sprites[frame]
	layers.cursor.push({
		image: sprite,
		position: [ x, y ]
	})
}

function renderLayers(layers, order, viewport, context) {
	for (let name of order) {
		let layer = layers[name]
		layer.sort((a, b) => a.position[1] - b.position[1])

		for (let element of layer) {
			let x = Math.round(element.position[0])
			let y = Math.round(element.position[1] - (element.position[2] || 0))
			if (name !== "dialogs") {
				x -= viewport.position[0]
				y -= viewport.position[1]
			}
			context.drawImage(element.image, x, y)
		}
	}
}
