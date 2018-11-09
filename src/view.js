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
				offset: [ 0, 0 ],
				target: null,
				shake: 0
			},
			dialogs: []
		},
		cache: {
			map: null,
			selection: null,
			selected: null,
			target: null,
			moved: false,
			attack: null,
			units: null,
			ranges: [],
			squares: [],
			dialogs: {
				objective: null,
				selection: null,
				target: null
			}
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

	if (cache.target) {
		cache.target.time++
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
	let { time, cursor, viewport, anims, dialogs } = view.state
	let { map } = game
	let canvas = context.canvas
	let anim = anims[0]
	let dialog = dialogs[0]
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
	if (dialog && dialog.type === "forecast" && !cache.moved) {
		let target = dialog.targets[dialog.index]
		focus = target.cell
	} else if (!cursor.selection || !game.phase.pending.includes(cursor.selection.unit) || cache.moved) {
		focus = cursor.cell
	} else if (cursor.selection && game.phase.pending.includes(cursor.selection.unit)) {
		focus = cursor.selection.unit.cell
	}

	if (focus) {
		let width = Map.width(map) * 16
		if (width > viewport.size[0] || dialog && dialog.type === "forecast") {
			viewport.target[0] = focus[0] * 16 + 8 - viewport.size[0] / 2
			let max = width - viewport.size[0]
			if (width > viewport.size[0]) {
				if (viewport.target[0] < 0) {
					viewport.target[0] = 0
				} else if (viewport.target[0] > max) {
					viewport.target[0] = max
				}
			}
		} else {
			viewport.target[0] = width / 2 - viewport.size[0] / 2
		}

		let height = Map.height(map) * 16
		if (height > viewport.size[1] || dialog && dialog.type === "forecast") {
			viewport.target[1] = focus[1] * 16 + 8 - viewport.size[1] / 2
			let may = height - viewport.size[1]
			if (height > viewport.size[1]) {
				if (viewport.target[1] < 0) {
					viewport.target[1] = 0
				} else if (viewport.target[1] > may) {
					viewport.target[1] = may
				}
			}
		} else {
			viewport.target[1] = height / 2 - viewport.size[1] / 2
		}
	}

	if (!viewport.position) {
		viewport.position = viewport.target.slice()
	} else {
		viewport.position[0] += (viewport.target[0] - viewport.position[0]) / 16
		viewport.position[1] += (viewport.target[1] - viewport.position[1]) / 16
	}

	if (anim && anim.type === "attack") {
		if (anim.data.time === 7) {
			viewport.shake = 30
		}
	}

	if (viewport.shake) {
		viewport.shake--
		let period = 5
		let amplitude = 3
		let duration = 30
		let progress = 1 - (viewport.shake % period) / period
		viewport.offset[1] = Math.sin(progress * 2 * Math.PI) * amplitude * viewport.shake / duration
	} else {
		viewport.offset[1] = 0
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
		let attacking = anim && anim.type === "attack" && anim.target === cached
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
		let target = Map.unitAt(map, cursor.cell)
		if (Cell.equals(cursor.cell, unit.cell)) {
			if (path) {
				path.length = 1
			}
		} else if (game.phase.pending.includes(unit)
		&& cursor.selection
		) {
			let cells = range.move.slice()
			let allies = map.units.filter(other => Unit.allied(unit, other))
			for (let ally of allies) {
				cells.push(ally.cell)
			}

			let dest = unit.cell
			if (path && path.length) {
				dest = path[path.length - 1]
			}

			if (range.move.find(cell => Cell.equals(cursor.cell, cell))) {
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
			} else if (target && !Unit.allied(unit, target)
			&& Cell.manhattan(dest, target.cell) > unit.equipment.weapon.rng
			) {
				let neighbors = Cell.neighborhood(target.cell, unit.equipment.weapon.rng)
				for (var i = path.length; i--;) {
					let cell = path[i]
					if (target) {
						if (neighbors.find(neighbor => Cell.equals(cell, neighbor))) {
							path.splice(i + 1, path.length - i - 1)
							break
						}
					}
				}
				if (i === -1) {
					let dest = null
					for (let i = 0; i < range.move.length; i++) {
						let cell = range.move[i]
						if (neighbors.find(neighbor => Cell.equals(cell, neighbor))) {
							dest = cell
							break
						}
					}
					path = cache.path = pathfind(cells, unit.cell, dest)
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

		if (cache.moved && !moving && !attacking && !dialogs.length) {
			let options = null
			let neighbors = Cell.neighborhood(cached.cell, cached.equipment.weapon.rng)
			let enemies = []
			for (let neighbor of neighbors) {
				let other = Map.unitAt(map, neighbor)
				if (other && !Unit.allied(unit, other)) {
					enemies.push(other)
				}
			}
			if (enemies.length) {
				options = [ "attack", "wait" ]
			} else {
				options = [ "wait" ]
			}
			dialogs.push({
				type: "actions",
				data: Menu.create(options),
				enemies: enemies,
				box: null,
				size: [ 16, 16 ],
				targetSize: null
			})
			if (cache.target) {
				let target = cache.target.unit
				dialogs.unshift({
					type: "forecast",
					index: enemies.indexOf(target),
					targets: enemies
				})
				cursor.cell = target.cell.slice()
				cursor.prev = target.cell.slice()
			}
		}
	}

	let selected = cursor.selection || (cache.attack && cache.attack.attacker) || cursor.under
	if (selected && !(cache.selected && selected !== cache.selected)
	&& !(dialog && dialog.type === "forecast" && cache.dialogs.selection && cache.dialogs.selection.name.position[1] === 8)
	) {
		if (!cache.selected) {
			cache.selected = selected
		}
		let unit = selected.unit
		let below = unit.cell[1] * 16 + 8 - viewport.position[1] >= viewport.size[1] / 2
		if (!cache.dialogs.selection) {
			let y = viewport.size[1] - 68
			if (below && !(dialog && dialog.type === "forecast")) {
				y = 0
			}

			let details = sprites.ui.UnitDetails(unit)
			cache.dialogs.selection = {
				name: {
					image: details.name,
					position: [ -details.name.width, y + 8 ]
				},
				hp: {
					image: details.hp,
					position: [ -details.hp.width, y + 36 ]
				}
			}
		}

		let details = cache.dialogs.selection
		if (selected) {
			if (selected.time >= 12) {
				details.name.position[0] += (8 - details.name.position[0]) / 8
			}
			if (selected.time >= 16) {
				details.hp.position[0] += (8 - details.hp.position[0]) / 8
			}
		}
		layers.dialogs.push(details.name, details.hp)
	} else if (cache.selected) {
		let unit = cache.selected.unit
		let details = cache.dialogs.selection
		// move details out of view
		if (details.name.position[0] > -details.name.image.width
		|| details.hp.position[0] > -details.hp.image.width
		) {
			details.name.position[0] -= 16
			details.hp.position[0] -= 16
		} else {
			cache.dialogs.selection = null
			cache.selected = null
		}
		layers.dialogs.push(details.name, details.hp)
	}

	let target = null
	if (dialog && dialog.type === "forecast") {
		target = dialog.targets[dialog.index]
		if (!cache.target) {
			target = cache.target = { unit: target, time: 0 }
		} else if (cache.target.unit !== target) {
			target = { unit: target, time: 0 }
		} else {
			target = cache.target
		}
		cursor.cell = target.unit.cell.slice()
	} else if (cache.attack) {
		target = cache.target
	} else if (cursor.selection && cursor.under && cursor.selection !== cursor.under && !Unit.allied(cursor.selection.unit, cursor.under.unit)) {
		target = cursor.under
	}

	if (target && !(cache.target && target !== cache.target)
	&& !(dialog && dialog.type === "actions")
	&& !(dialog && dialog.type === "forecast" && cache.dialogs.target && cache.dialogs.target.name.position[1] === 8)
	) {
		if (!cache.target) {
			cache.target = target
		}
		let unit = target.unit
		let below = unit.cell[1] * 16 + 8 - viewport.position[1] >= viewport.size[1] / 2
		if (!cache.dialogs.target) {
			let y = viewport.size[1] - 68
			if (below && !(dialog && dialog.type === "forecast")) {
				y = 0
			}

			let details = sprites.ui.UnitDetails(unit)
			cache.dialogs.target = {
				name: {
					image: details.name,
					position: [ viewport.size[0], y + 8 ]
				},
				hp: {
					image: details.hp,
					position: [ viewport.size[0], y + 36 ]
				}
			}
		}
		let details = cache.dialogs.target
		if (target) {
			if (target.time >= 12) {
				let box = details.name
				box.position[0] += (viewport.size[0] - box.image.width - 8 - box.position[0]) / 8
			}
			if (target.time >= 16) {
				let box = details.hp
				box.position[0] += (viewport.size[0] - box.image.width - 8 - box.position[0]) / 8
			}
		}
		layers.dialogs.push(details.name, details.hp)
	} else if (cache.target) {
		let unit = cache.target.unit
		let details = cache.dialogs.target
		// move details out of view
		if (details.name.position[0] < viewport.size[0]
		|| details.hp.position[0] < viewport.size[0]
		) {
			details.name.position[0] += 16
			details.hp.position[0] += 16
		} else {
			cache.dialogs.target = null
			cache.target = null
		}
		layers.dialogs.push(details.name, details.hp)
	}

	if (cache.attack) {
		if (!viewport.shake && !(anim && anim.type === "attack")) {
			cursor.cell = cache.attack.attacker.unit.cell.slice()
			cursor.prev = cursor.cell.slice()
			cache.attack = null
		} else if (viewport.shake) {
			let attacker = cache.attack.attacker.unit
			let target = cache.attack.target.unit
			let canvas = cache.dialogs.target.hp.image
			let context = canvas.getContext("2d")
			let damage = Unit.dmg(attacker, target)
			let progress = 1 - Math.max(0, viewport.shake - 10) / 20
			let width = 0
			if (progress < 0.5) {
				width = damage * 14 * progress * 2
				context.fillStyle = "white"
			} else {
				width = damage * 14 * (progress * 2 - 1)
				context.fillStyle = "black"
			}
			context.fillRect(31 + (target.hp + damage) * 14 - width, 11, width, 2)
		}
	}

	if (dialog && dialog.type === "actions") {
		let menu = dialog
		let selection = menu.data.selection
		if (selection) {
			if (selection === "wait") {
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
				dialogs.shift()
			} else if (selection === "attack") {
				dialogs.unshift({
					type: "forecast",
					index: 0,
					targets: menu.enemies
				})
			}
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
					symbol = sprites.ui.symbols.sword
				} else if (option === "wait") {
					symbol = sprites.ui.symbols.clock
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

	if (dialog && dialog.type === "forecast") {
		let target = dialog.targets[dialog.index]
		if (!cache.dialogs.forecast) {
			let text = sprites.ui.Text("COMBAT FORECAST")
			let box = sprites.ui.Box(text.width + 28, 24)
			let context = box.getContext("2d")
			let symbol = sprites.ui.symbols.sword
			context.drawImage(symbol, 8, 8)
			context.drawImage(text, 20, 8)
			cache.dialogs.forecast = {
				title: {
					image: box,
					position: [ -box.width, 8 ]
				}
			}
		}
		let title = cache.dialogs.forecast.title
		title.position[0] += (8 - title.position[0]) / 8
		layers.dialogs.push(title)

		let unit = cursor.selection.unit
		let index = map.units.indexOf(unit)
		let cached = view.cache.units[index]
		let neighbors = Cell.neighborhood(cached.cell, unit.equipment.weapon.rng)
		for (let neighbor of neighbors) {
			layers.squares.push({
				image: sprites.ui.squares.attack,
				position: [ neighbor[0] * 16, neighbor[1] * 16 ]
			})
		}

		if (dialog.time === undefined) {
			dialog.time = 0
		} else {
			dialog.time++
		}

		let x = 31
		let y = 11
		let n = Math.floor(42 / 3)
		let a = Math.sin(dialog.time % 60 / 60 * Math.PI) * 255
		let steps = Cell.manhattan(cached.cell, target.cell)

		let finisher = false
		let targetDialog = cache.dialogs.target
		if (targetDialog) {
			let damage = steps <= unit.equipment.weapon.rng
				? Unit.dmg(unit, target)
				: 0
			if (damage) {
				if (target.hp - damage <= 0) {
					finisher = true
				}
				let context = Canvas(damage * n, 2)
				context.fillStyle = `rgb(${a}, ${a}, ${a})`
				context.fillRect(0, 0, context.canvas.width, context.canvas.height)
				layers.dialogs.push({
					image: context.canvas,
					position: [
						targetDialog.hp.position[0] + x + (target.hp - damage) * n,
						targetDialog.hp.position[1] + y
					]
				})
			}
		}

		if (!finisher) {
			let unitDialog = cache.dialogs.selection
			if (unitDialog) {
				let damage = steps <= target.equipment.weapon.rng
					? Unit.dmg(target, unit)
					: 0
				if (damage) {
					let context = Canvas(damage * n, 2)
					context.fillStyle = `rgb(${a}, ${a}, ${a})`
					context.fillRect(0, 0, context.canvas.width, context.canvas.height)
					layers.dialogs.push({
						image: context.canvas,
						position: [
							unitDialog.hp.position[0] + x + (unit.hp - damage) * n,
							unitDialog.hp.position[1] + y
						]
					})
				}
			}
		}

		if (dialog.done) {
			unit.cell = cached.cell
			Unit.attack(unit, target)
			cache.squares.length = 0
			cache.ranges.length = 0
			cache.moved = false
			cache.attack = { attacker: cache.selected, target: cache.target }
			cursor.selection = null
			cache.selection = null
			dialogs.length = 0
			anim.done = true
			anims.push(Anim("attack", cached, Anims.attack(unit.cell, target.cell)))
			let jndex = game.phase.pending.indexOf(unit)
			game.phase.pending.splice(jndex, 1)
		}
	} else {
		cache.dialogs.forecast = null
	}

	let objective = cache.dialogs.objective
	if (!objective) {
		let title = sprites.ui.TextBox("OBJECTIVE")
		let body = sprites.ui.TextBox("Rout the enemy")
		objective = cache.dialogs.objective = {
			flipped: false,
			title: {
				image: title,
				position: [ viewport.size[0], viewport.size[1] - title.height - 36 ]
			},
			body: {
				image: body,
				position: [ viewport.size[0], viewport.size[1] - body.height - 8 ]
			}
		}
	}

	let { title, body } = objective
	if (!cursor.selection) {
		title.position[0] += ((viewport.size[0] - title.image.width - 8) - title.position[0]) / 8
		body.position[0] += ((viewport.size[0] - body.image.width - 8) - body.position[0]) / 8
	} else if (title.position[0] < viewport.size[0]
	|| body.position[0] < viewport.size[0]
	) {
		title.position[0] += Math.min(16, viewport.size[0] - title.position[0])
		body.position[0] += Math.min(16, viewport.size[0] - body.position[0])
	}

	/*let threshold = Map.height(map) - viewport.size[1] / 32
	if (cursor.cell[1] > threshold) {
		if (!objective.flipped && title.position[1] > viewport.size[1] / 2) {
			title.position[0] += Math.min(16, viewport.size[0] - title.position[0])
			body.position[0] += Math.min(16, viewport.size[0] - body.position[0])
			if (title.position[0] >= viewport.size[0]) {
				objective.flipped = true
				title.position[1] = 8
				body.position[1] = 36
			}
		}
	} else {

	}*/

	// layers.dialogs.push(title, body)

	if (!cache.attack
	&& (!(dialog && dialog.type === "actions") && !cache.moved
	|| (dialog && dialog.type === "forecast"))
) {
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
			} else {
				let shadow = null
				if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall"
				&& row - 1 >= 0 && Map.tileAt(map, [ col - 1, row - 1 ]).name !== "wall"
				) {
					shadow = sprites["shadow-corner"]
				} else if (col - 1 >= 0 && Map.tileAt(map, [ col - 1, row ]).name === "wall") {
					shadow = sprites["shadow-edge"]
				}
				sprite = sprites[tile.name]
				floors.drawImage(sprite, x, y)
				if (shadow) {
					floors.drawImage(shadow, x, y)
				}
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
		&& !(anim && anim.target === unit && (anim.type === "move" || anim.type === "attack"))
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
			if (anim.type === "lift" || anim.type === "drop") {
				z = anim.data.height
			} else if (anim.type === "move" || anim.type === "attack") {
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
	if (cursor.selection && !view.state.dialogs.length) {
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
				x -= (viewport.position[0] + viewport.offset[0])
				y -= (viewport.position[1] + viewport.offset[1])
			}
			context.drawImage(element.image, x, y)
		}
	}
}
