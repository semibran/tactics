import * as Menu from "./menu"
import * as Unit from "../lib/unit"
import * as Map from "../lib/map"
import * as Cell from "../lib/cell"
import * as Game from "../lib/game"
import rgb from "../lib/rgb"
import rgba from "../lib/rgba"
import pathfind from "../lib/pathfind"
import lerp from "../lib/lerp"
import Canvas from "../lib/canvas"
import Anims from "./anims"
import Anim from "./anim"
import palette from "./palette"
import * as icons from "./icons"

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
				target: null,
				velocity: [ 0, 0 ],
				offset: [ 0, 0 ],
				shake: 0
			},
			ai: {
				strategy: null,
				index: 0,
				action: 0,
				moved: false,
				attacked: false
			},
			menu: null,
			paused: false,
			fusion: null,
			attacks: [],
			screens: [],
			log: []
		},
		cache: {
			map: null,
			units: null,
			cursor: null,
			selection: null,
			focused: null,
			target: null,
			moved: false,
			attack: null,
			phase: null,
			ranges: [],
			squares: [],
			effects: [],
			log: null,
			menu: {
				box: null,
				labels: []
			},
			boxes: {
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
	let { context, sprites, state, cache } = view
	let { time, cursor, viewport, anims, attacks, fusion, screens, log, ai } = state
	let { map } = game
	let canvas = context.canvas
	let anim = anims[0]
	let attack = attacks[0]
	let screen = screens[0]
	let order = [
		"floors",
		"squares",
		"shadows",
		"pieces",
		"arrows",
		"cursor",
		"selection",
		"walls",
		"effects",
		"ui"
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

	layers.floors.push({
		image: sprites.maps[map.id],
		position: [ 0, 0 ]
	})

	layers.walls.push({
		image: sprites.maps["test-tree"],
		position: [ 0, 0 ]
	})

	if (!cursor.cell) {
		let unit = map.units.find(unit => unit.faction === "player")
		cursor.cell = unit.cell.slice()
		cursor.prev = cursor.cell.slice()
	}

	if (!cache.log) {
		let box = sprites.ui.Box(viewport.size[0] - 16, 36)
		let element = {
			image: box,
			position: [ 8, viewport.size[1] ]
		}
		cache.log = {
			row: 0,
			col: 0,
			focus: 0,
			time: 0,
			interrupt: true,
			bookmark: 0,
			box: element,
			texts: [],
			surface: Canvas(box.width - 16, box.height - 16),
		}
	}

	let enemies = map.units.filter(unit => unit.faction === "enemy")
	let enemy = ai.strategy ? ai.allies[ai.index] : null
	let updated = !log.length
		|| cache.log.row === log.length - 1
		&& cache.log.col === log[log.length - 1].length - 1
	let visible = (!updated || !cache.log.interrupt && cache.log.time < 300)
		&& (attack || fusion || !cache.log.interrupt && !Cell.manhattan(cursor.cell, cursor.prev) > 1e-3)
		&& !(screen && screen.type === "pause")
	if (visible) {
		// log is not up to date, or up to date and log presence has not exceeded time delay
		let { box, surface } = cache.log
		if (cache.log.interrupt) {
			cache.log.interrupt = false
			cache.log.time = 0
			box.image
				.getContext("2d")
				.fillRect(8, 8, box.image.width - 16, box.image.height - 16)
		}

		let target = viewport.size[1] - box.image.height - 8
		box.position[1] += (target - box.position[1]) / 8
		if (Math.abs(target - box.position[1]) < 4) {
			if (cache.log.focus < cache.log.row && cache.log.row >= 2 && cache.log.row < log.length) {
				cache.log.focus += (cache.log.row - cache.log.focus) / 8
			}

			let content = log[cache.log.row].slice(0, cache.log.col + 1)
			let text = sprites.ui.Text(content)
			cache.log.texts[cache.log.row] = text
			surface.canvas.height = Math.max(0, (log.length - cache.log.bookmark) * 12 - 4)

			let visible = cache.log.row - cache.log.bookmark
			for (let i = cache.log.bookmark; i <= cache.log.row; i++) {
				let text = cache.log.texts[i]
				surface.drawImage(text, 0, (i - cache.log.bookmark) * 12)
			}

			let temp = Canvas(box.image.width - 16, box.image.height - 16)
			let offset = Math.max(0, (cache.log.focus - cache.log.bookmark - 1) * 12)
			temp.drawImage(cache.log.surface.canvas, 0, -Math.ceil(offset))

			let context = box.image.getContext("2d")
			context.fillRect(8, 8, box.image.width - 16, box.image.height - 16)
			context.drawImage(temp.canvas, 8, 8)

			if (cache.log.col !== log[cache.log.row].length - 1) {
				cache.log.col++
			} else if (cache.log.row !== log.length - 1) {
				cache.log.row++
				cache.log.col = 0
			} else {
				cache.log.time++
			}
		}
		layers.ui.push(box)
	} else {
		if (!cache.log.interrupt) {
			cache.log.interrupt = true
			cache.log.bookmark = cache.log.row + 1
		}
		let box = cache.log.box
		let target = viewport.size[1] + box.image.height
		if (box.position[1] < target) {
			box.position[1] += Math.min(8, target - box.position[1])
			layers.ui.push(box)
		}
	}

	if (!anims.length && !attack && updated || !cache.phase) {
		if (!cache.phase || cache.phase.faction !== game.phase.faction) {
			cursor.cell = game.phase.pending[0].cell.slice()
			anim = anims[0] = Anim("phase", game.phase.faction, Anims.phase())
		}
		cache.phase = {
			pending: game.phase.pending.slice(),
			faction: game.phase.faction,
			done: false
		}
	}

	let moving = anim && anim.type === "move"
	let attacking = anim && anim.type === "attack"
	let fusing = anim && anim.type === "fuse"
	let phasing = anim && anim.type === "phase"
	let forecasting = screen
		&& (screen.type === "combatForecast" || screen.type === "fusionForecast")

	let focus = null
	if (!phasing && !viewport.shake || !viewport.target) {
		if (fusion) {
			focus = fusion.target.cell
		} else if (attack) {
			focus = attack.target.cell
		} else if (game.phase.faction === "enemy" && enemy) {
			focus = enemy.cell
		} else if (moving) {
			focus = anim.data.cell
		} else if (forecasting) {
			let target = screen.menu.options[screen.menu.index]
			focus = target.cell
		} else {
			focus = cursor.cell
		}
	}

	if (!viewport.target) {
		viewport.target = []
	}

	if (focus) {
		viewport.target[0] = focus[0] * 16 + 8 - viewport.size[0] / 2
		viewport.target[1] = focus[1] * 16 + 8 - viewport.size[1] / 2
	}

	let width = map.layout.size[0] * 16
	let height = map.layout.size[1] * 16
	let priority = !phasing && (forecasting || attack || fusion || cache.phase.faction === "enemy")
	if (!priority) {
		let max = width - viewport.size[0]
		if (width >= viewport.size[0]) {
			if (viewport.target[0] < 0) {
				viewport.target[0] = 0
			} else if (viewport.target[0] > max) {
				viewport.target[0] = max
			}
		}
		let may = height - viewport.size[1]
		if (height >= viewport.size[1]) {
			if (viewport.target[1] < 0) {
				viewport.target[1] = 0
			} else if (viewport.target[1] > may) {
				viewport.target[1] = may
			}
		}
	}

	if (!viewport.position) {
		viewport.position = viewport.target.slice()
	} else {
		let disp = [
			viewport.target[0] - viewport.position[0],
			viewport.target[1] - viewport.position[1],
		]
		viewport.velocity[0] += (disp[0] / 16 - viewport.velocity[0]) / 4
		viewport.velocity[1] += (disp[1] / 16 - viewport.velocity[1]) / 4
		viewport.position[0] += viewport.velocity[0]
		viewport.position[1] += viewport.velocity[1]
	}

	if (cache.attack && cache.attack.connected && !cache.attack.shaken && attack.damage) {
		cache.attack.shaken = true
		viewport.shake = 30
	}

	if (cache.fusion && cache.fusion.connected && !cache.fusion.shaken) {
		cache.fusion.shaken = true
		viewport.shake = 30
	}

	if (viewport.shake) {
		viewport.shake--
		let period = 5
		let amplitude = (attack ? attack.power : 3) * 1.5
		let duration = 30
		let progress = 1 - (viewport.shake % period) / period
		let axis = attack
			? attack.attacker.cell[1] - attack.target.cell[1]
				? 1
				: 0
			: 1
		viewport.offset[axis] = Math.sin(progress * 2 * Math.PI) * amplitude * viewport.shake / duration
	} else {
		viewport.offset[0] = 0
		viewport.offset[1] = 0
	}

	let selection = cursor.selection || cache.selection
	if (selection && cache.phase.faction !== "enemy") {
		let unit = selection.unit
		let cached = cache.units.find(cached => cached.original === unit)
		let index = cache.units.indexOf(cached)
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
				// exclude "blue" cells
				for (var i = 0; i < range.move.length; i++) {
					if (Cell.equals(range.move[i], cell)) {
						break
					}
				}

				if (i === range.move.length) {
					squares.push({
						sprite: sprites.ui.squares.attack,
						cell: cell
					})
				}
			}

			for (let cell of range.fuse) {
				// exclude "blue" cells
				for (var i = 0; i < range.move.length; i++) {
					if (Cell.equals(range.move[i], cell)) {
						break
					}
				}

				if (i < range.move.length) {
					continue
				}

				for (var i = 0; i < range.attack.length; i++) {
					if (Cell.equals(range.attack[i], cell)) {
						break
					}
				}

				if (i === range.attack.length) {
					squares.push({
						sprite: sprites.ui.squares.fuse,
						cell: cell
					})
				}
			}
		}

		if (cursor.selection) {
			if (cursor.selection !== cache.selection) {
				cache.selection = selection
				cache.path = null
			}

			if (!anims.find(anim => anim.target === cached)) {
				anims.push(
					Anim("lift", cached, Anims.lift())
				)
			}
		}

		if (cache.selection && cache.selection !== cursor.selection) {
			if (anim && anim.type === "lift") {
				cache.moved = false
				cache.selection.time = time
				anim.done = true
				anims.push(
					Anim("drop", anim.target, Anims.drop(anim.data.height))
				)
			}
		}

		let moving = anim && anim.type === "move" && anim.target === cached
		let attacking = anim && anim.type === "attack" && anim.target === cached
		if (!cache.moved) {
			let radius = 0
			if (cursor.selection) {
				radius = time - selection.time
			} else {
				let max = 0
				for (let square of squares) {
					let steps = Cell.manhattan(unit.cell, square.cell)
					if (steps > max) {
						max = steps
					}
				}
				radius = Math.max(0, max - (time - selection.time))
			}
			if (radius) {
				squares = squares.filter(square => Cell.manhattan(unit.cell, square.cell) <= radius)
				renderSquares(layers, sprites.ui.squares, squares)
			}
		}

		let path = cache.path
		if (!cache.cursor || !Cell.equals(cache.cursor, cursor.cell)) {
			cache.cursor = cursor.cell.slice()
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
						path = cache.path = pathfind(map, unit.cell, cursor.cell, cells)
					} else {
						for (var i = 0; i < path.length; i++) {
							let cell = path[i]
							if (Cell.equals(cursor.cell, cell)) {
								break
							}
						}
						if (i < path.length - 1) {
							// cell is already in path
							// truncate the path up to the current cell
							path.splice(i + 1, path.length - i - 1)
						} else {
							// trace path from last cell to cursor
							let pathless = cells.filter(cell => !path.find(other => Cell.equals(cell, other)))
							let ext = pathfind(map, dest, cursor.cell, pathless)
							if (ext && path.length + ext.length - 2 <= Unit.mov(unit.type)) {
								// new path is usable
								ext.shift() // exclude duplicate start cell
								path.push(...ext)
							} else {
								// new path is too long, recalculate
								path = cache.path = pathfind(map, unit.cell, cursor.cell, cells)
							}
						}
					}
				} else if (target && !Unit.allied(unit, target)
				&& Cell.manhattan(dest, target.cell) > Unit.rng(unit.type)
				&& Map.walkable(map, target.cell, unit.cell)
				) {
					let neighbors = Cell.neighborhood(target.cell, Unit.rng(unit.type))
					if (path) {
						for (var i = path.length; i--;) {
							let cell = path[i]
							if (target) {
								if (neighbors.find(neighbor => Cell.equals(cell, neighbor))) {
									path.splice(i + 1, path.length - i - 1)
									break
								}
							}
						}
					}
					if (!path || i === -1) {
						let dest = null
						for (let i = 0; i < range.move.length; i++) {
							let cell = range.move[i]
							if (neighbors.find(neighbor => Cell.equals(cell, neighbor))) {
								dest = cell
								break
							}
						}
						path = cache.path = pathfind(map, unit.cell, dest, cells)
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

		if (cache.moved && !moving && !attacking && !screens.length) {
			let attackRange = Cell.neighborhood(cached.cell, Unit.rng(cached.type))
			let fuseRange = Cell.neighborhood(cached.cell)
			let allies = []
			let enemies = []
			for (let neighbor of attackRange) {
				let other = Map.unitAt(map, neighbor)
				if (other && !Unit.allied(other, unit)) {
					enemies.push(other)
				}
			}
			for (let neighbor of fuseRange) {
				let other = Map.unitAt(map, neighbor)
				if (other && Unit.allied(other, unit) && unit.type === other.type) {
					allies.push(other)
				}
			}

			cache.allies = allies
			cache.enemies = enemies

			let options = [ "wait" ]
			if (enemies.length) {
				options.unshift("attack")
			}
			if (allies.length) {
				options.unshift("fuse")
			}

			screens.unshift({
				type: "actions",
				time: time,
				menu: Menu.create(options),
			})

			if (cache.target) {
				let target = cache.target.unit
				if (Unit.allied(unit, target)) {
					let index = allies.indexOf(target)
					screens.unshift({
						type: "fusionForecast",
						time: time,
						menu: Menu.create(allies, index)
					})
				} else {
					let index = enemies.indexOf(target)
					screens.unshift({
						type: "combatForecast",
						time: time,
						menu: Menu.create(enemies, index)
					})
				}

				cursor.cell = target.cell.slice()
				cursor.prev = target.cell.slice()
			}
		}
	}

	if (view.state.paused) {
		if (!screens.length) {
			screens.unshift({
				type: "pause",
				time: time,
				menu: Menu.create([ "end turn" ])
			})
		} else {
			let pause = screen
			let menu = pause.menu
			if (menu.done) {
				let option = menu.options[menu.index]
				if (option === "end turn") {
					Game.nextPhase(game)
				}
				view.state.paused = false
				screens.shift()
			}
		}
	}

	let relative = free(cursor.cell[1]) - viewport.target[1]
	if (moving) {
		let path = anim.data.path
		let dest = path[path.length - 1]
		relative = free(dest[1]) - viewport.size[1] / 2
	}

	let below = relative >= viewport.size[1] / 2

	// primary box, for hovered units and selections
	let focused = cursor.selection && cursor.selection.unit
		|| attack && (attack.counter ? attack.target : attack.attacker)
		|| fusion && fusion.unit
		|| cursor.under

	if (focused && !(cache.focused && focused !== cache.focused.unit)
	&& !phasing && !(screen && screen.type === "pause")
	&& !(forecasting && cache.focused && cache.focused.boxes.name.position[1] === 8)
	&& (!cache.focused || forecasting || attack || fusion || (
		!(below && !forecasting && cache.focused.boxes.name.position[1] !== 8)
		&& !(!below && cache.focused.boxes.name.position[1] === 8)
		))
	) {
		let unit = focused
		let y1 = 0
		let y2 = 0
		if (forecasting && screen.type === "fusionForecast") {
			y2 = viewport.size[1] - 4 - cache.boxes.forecast.stats.image.height - 4 - 24 - 4
			y1 = y2 - 4 - 24
		} else if (attack || fusion || visible && !below) {
			y2 = viewport.size[1] - 4 - 36 - 4 - 24 - 4
			y1 = y2 - 4 - 24
		} else if (!below || forecasting) {
			y2 = viewport.size[1] - 4 - 24 - 4
			y1 = y2 - 4 - 24
		} else {
			y1 = 8
			y2 = 8 + 24 + 4
		}

		if (!cache.focused) {
			let { name, hp } = sprites.ui.UnitDetails(unit)
			let boxes = {
				name: {
					image: name,
					position: [ -name.width, y1 ]
				},
				hp: {
					image: hp,
					position: [ -hp.width, y2 ]
				}
			}
			cache.focused = {
				time: time,
				unit: unit,
				hp: unit.hp,
				boxes: boxes
			}
		}

		let { name, hp } = cache.focused.boxes
		name.position[1] += (y1 - name.position[1]) / 8
		hp.position[1]   += (y2 - hp.position[1]) / 8
		name.position[0] += (8 - name.position[0]) / 8
		hp.position[0] += (8 - hp.position[0]) / 12
		layers.ui.push(name, hp)
	} else if (cache.focused) {
		// move boxes out of view
		let { name, hp } = cache.focused.boxes
		if (name.position[0] > -name.image.width
		|| hp.position[0] > -hp.image.width
		) {
			name.position[0] -= 16
			hp.position[0] -= 16
		} else {
			cache.focused = null
		}
		layers.ui.push(name, hp)
	}

	// secondary box, for targets
	let target = null
	if (forecasting) {
		let forecast = screen
		let menu = forecast.menu
		target = menu.options[menu.index]
		cursor.cell = target.cell.slice()
	} else if (fusion) {
		target = fusion.target
	} else if (attack) {
		target = attack.counter
			? attack.attacker
			: attack.target
	} else if (cursor.selection && cursor.under
	&& cursor.under !== cursor.selection.unit
	) {
		target = cursor.under
	}

	if (target && !(cache.target && cache.target.unit !== target)
	&& !(screen && screen.type === "actions") && !phasing
	&& !(forecasting && cache.target && cache.target.boxes.name.position[1] === 8)
	) {
		let unit = target
		let y1 = 0
		let y2 = 0
		if (attack || fusion || visible) {
			y2 = viewport.size[1] - 4 - 36 - 4 - 24 - 4
			y1 = y2 - 4 - 24
		} else if (!below || forecasting) {
			y2 = viewport.size[1] - 4 - 24 - 4
			y1 = y2 - 4 - 24
		} else {
			y1 = 8
			y2 = 8 + 24 + 4
		}

		if (!cache.target) {
			cache.target = {
				time: time,
				unit: unit,
				hp: unit.hp,
				boxes: null
			}
		}

		if (!cache.target.boxes) {
			let { name, hp } = sprites.ui.UnitDetails(unit)
			cache.target.boxes = {
				name: {
					image: name,
					position: [ viewport.size[0], y1 ]
				},
				hp: {
					image: hp,
					position: [ viewport.size[0], y2 ]
				}
			}
		}

		let { name, hp } = cache.target.boxes
		name.position[1] += (y1 - name.position[1]) / 8
		hp.position[1]   += (y2 - hp.position[1]) / 8
		name.position[0] += ((viewport.size[0] - name.image.width - 8) - name.position[0]) / 8
		hp.position[0] += ((viewport.size[0] - hp.image.width - 8) - hp.position[0]) / 12
		layers.ui.push(name, hp)
	} else if (cache.target) {
		// move boxes out of view
		if (cache.target.boxes) {
			let { name, hp } = cache.target.boxes
			if (name.position[0] < viewport.size[0]
			|| hp.position[0] < viewport.size[0]
			) {
				name.position[0] += 16
				hp.position[0] += 16
			} else {
				cache.target = null
			}
			layers.ui.push(name, hp)
		} else {
			cache.target = null
		}
	}

	if (cache.target && cache.target.boxes) {
		let unit = cache.target.unit
		if (cache.target.hp !== unit.hp) {
			console.log("animate!")
		}
	}

	if (fusion && !phasing) {
		let { unit, target } = fusion
		let cached = cache.units.find(cached => cached.original === unit)
		if (!cache.fusion) {
			cache.fusion = {
				time: time,
				light: null,
				connected: false,
				shaken: false
			}
			log.push(`${target.name} fuses with ${unit.name}.`)
			if (cache.phase.faction === "player" && unit.faction === "player") {
				let anim = Anim("drop", cached, Anims.drop())
				anims.push(anim)
			}
		} else if (anim && anim.type === "drop" && anim.done) {
			let anim = Anim("fuse", cached, Anims.fuse(unit, target))
			anims.push(anim)
		}

		let light = cache.fusion.light
		if (anim && anim.type === "fuse") {
			if (anim.done) {
				cache.fusion.connected = time
				Unit.fuse(unit, target)
				Game.endTurn(game, unit)
				Game.endTurn(game, target)
				let index = map.units.indexOf(target)
				map.units.splice(index, 1)
				cursor.cell = unit.cell.slice()
				cached.cell = unit.cell.slice()
				log.push(`${unit.name} promoted to ${unit.type.toUpperCase()}!`)

				for (let stat in cache.delta) {
					let value = cache.delta[stat]
					if (value) {
						log.push(`${stat.toUpperCase()} increased by ${value}.`)
					}
				}

				// particles
				let origin = [ unit.cell[0] * 16 + 8, unit.cell[1] * 16 + 8 ]
				for (let i = 0; i < 32; i++) {
					let size = Math.random() < 0.25
						? "large"
						: "small"
					let sprite = sprites.effects.particles[size]
					let direction = 2 * Math.PI * i / 32
					let normal = [ Math.cos(direction), Math.sin(direction) ]
					let speed = Math.random() * 2
					let velocity = [ normal[0] * speed, normal[1] * speed ]
					let position = origin.slice()
					position[0] += normal[0] * 4
					position[1] += normal[1] * 4
					cache.effects.push({
						type: "particle",
						position: position,
						velocity: velocity,
						image: sprite,
						time: time
					})
				}

				cache.effects.push({
					type: "shockwave",
					position: [ origin[0] - 16, origin[1] - 12 ],
					time: time
				})
			}

			if (!light && anim.data.hovering) {
				light = cache.fusion.light = {
					width: 1,
					height: viewport.size[1] / 2,
					time: 0
				}
			}
		}

		if (light && light.width > 0 && light.height > 1) {
			let context = Canvas(light.width, light.height)
			context.fillStyle = "white"
			context.fillRect(0, 0, context.canvas.width, context.canvas.height)
			/*layers.effects.push({
				image: context.canvas,
				position: [
					free(target.cell[0]) - context.canvas.width / 2,
					free(target.cell[1]) - context.canvas.height
				]
			})*/
			if (light.width < 6) {
				light.width++
			} else {
				if (!light.time) {
					light.time = time
				}
				let t = (time - light.time) / 12
				if (t <= 1) {
					light.height = lerp(viewport.size[1], 1, t)
				}
			}
		}

		if (cache.fusion.connected) {
			if (cache.target) {
				let { hp, name } = cache.target.boxes
				let cached = cache.units.find(cached => cached.original === fusion.unit)
				let canvas = hp.image
				let context = canvas.getContext("2d")
				let t = time - cache.fusion.connected
				let damage = unit.hp - cached.hp
				if (t * 2 <= damage * 14) {
					context.fillStyle = "white"
					width = t * 2
				} else {
					context.fillStyle = "black"
					width = (t - damage * 7) * 2
				}
				if (width > 0 && width <= damage * 14) {
					let x = 31
					let y = 11
					context.fillRect(x + damage * 14 - width, y, width, 2)
				}
			}
		}

		if (time - cache.fusion.time >= 90 && updated) {
			let cached = cache.units.find(cached => cached.original === fusion.unit)
			cached.hp = unit.hp
			state.fusion = null
			cache.fusion = null
		}
	}

	// attack animation
	if (attack && !phasing) {
		let { attacker, target, power, damage } = attack
		let index = map.units.indexOf(attacker)
		let cached = cache.units[index]
		if (!cache.attack) {
			cache.attack = {
				countdown: 7,
				time: 0,
				connected: false,
				normal: null
			}
			if (cache.phase.faction === "player" && attacker.faction === "player") {
				let anim = Anim("drop", cached, Anims.drop())
				anims.push(anim)
			}
			if (!attack.counter) {
				log.push(`${attacker.name} attacks`)
			} else {
				log.push(`${attacker.name} counters -`)
			}
		} else if (cache.attack.countdown) {
			if (!--cache.attack.countdown) {
				let anim = Anim("attack", cached, Anims.attack(attacker.cell, target.cell))
				anims.push(anim)
				cache.attack.normal = anim.data.norm
				cache.attack.time = time
			}
		}

		if (anim && anim.type === "attack" && anim.data.connected) {
			if (!cache.attack.connected) {
				cache.attack.connected = true
				if (power === null) {
					let p = target.faction === "player"
						? "."
						: "!"
					log.push(`${target.name} dodges the attack${p}`)
				} else if (power === 0) {
					let p = target.faction === "player"
						? "."
						: "!"
					log.push(`${target.name} blocks the attack${p}`)
				} else {
					let p = damage === 3
						? "!!"
						: "."
					log.push(`${target.name} suffers ${damage} damage${p}`)
				}
				// particles
				if (power !== null) {
					let disp = [ target.cell[0] - attacker.cell[0], target.cell[1] - attacker.cell[1] ]
					let dist = Math.sqrt(disp[0] * disp[0] + disp[1] * disp[1])
					let norm = [ disp[0] / dist, disp[1] / dist ]
					let radians = Math.atan2(disp[1], disp[0])
					let origin = [ target.cell[0] * 16 + 8 - norm[0] * 4, target.cell[1] * 16 + 8 - norm[1] * 4 ]
					let total = (damage + 1) / 2 * 48
					for (let i = 0; i < total; i++) {
						let size = "small"
						if (Math.random() < 0.25) {
							size = "large"
						}
						let sprite = sprites.effects.particles[size]
						let normal = radians + Math.random() * 1 - 0.5
						let velocity = [
							-Math.cos(normal) * Math.random() * 2,
							-Math.sin(normal) * Math.random() * 2
						]
						cache.effects.push({
							type: "particle",
							position: origin.slice(),
							velocity: velocity,
							image: sprite,
							time: time
						})
					}
				}
			}
		}

		if (cache.attack && cache.attack.connected) {
			let t = time - cache.attack.time
			if (t >= 45 && !target.hp && map.units.includes(target)) {
				// remove dead unit from map
				let index = map.units.indexOf(target)
				map.units.splice(index, 1)

				if (target.faction === "player") {
					log.push(`${target.name} is defeated.`)
				} else if (target.faction === "enemy") {
					log.push(`Defeated ${target.name}.`)
				}
			}

			// visually decrease health
			let details = attack.counter
				? cache.focused.boxes
				: cache.target.boxes
			if (details) {
				let canvas = details.hp.image
				let context = canvas.getContext("2d")
				let width = 0
				if (t * 2 <= damage * 14) {
					width = Math.min(damage * 14, t * 2)
					context.fillStyle = rgba(palette.red)
				} else {
					width = t - damage * 14
					context.fillStyle = "black"
				}
				if (width > 0 && width <= damage * 14) {
					context.fillRect(31 + (target.hp + damage) * 14 - width, 11, width, 2)
				}
			}

			if (t >= 60 && target.hp || t >= 75) {
				attacks.shift()
				cache.attack = null
				if (target.hp) {
					let index = game.map.units.indexOf(target)
					let cached = cache.units[index]
					cached.hp = target.hp
				}
				if (!attack.counter && cache.phase.faction === "player") {
					Game.endTurn(game, attacker)
					cursor.cell = attacker.cell.slice()
					cursor.prev = attacker.cell.slice()
				}
			} else {
				if (t <= 45) {
					// battle result
					let value = cache.attack.value
					if (!value) {
						let color = palette.gray
						let content = null
						if (power === 3) {
							content = "3!"
						} else if (power === 0) {
							content = "0"
						} else if (power === null) {
							content = "MISS"
						} else {
							content = power.toString()
							color = palette.red
						}
						let animation = []
						let text = sprites.ui.Text(content)
						if (power === 3) {
							let red = sprites.ui.Text(content, palette.red)
							let a = Canvas(content.length * 8 + 1, 9)
							a.drawImage(red, 1, 1)
							a.drawImage(text, 0, 0)
							animation.push(a.canvas)
							/*
							let b = Canvas(content.length * 8 + 1, 9)
							b.drawImage(text, 1, 1)
							b.drawImage(red, 0, 0)
							animation.push(a.canvas, a.canvas, b.canvas, b.canvas)*/
						} else {
							let shadow = sprites.ui.Text(content, color)
							let context = Canvas(content.length * 8 + 1, 9)
							context.drawImage(shadow, 1, 1)
							context.drawImage(text, 0, 0)
							animation.push(context.canvas)
						}
						value = cache.attack.value = {
							offset: 0,
							velocity: -2,
							images: animation
						}
					} else {
						value.offset += value.velocity
						value.velocity += 0.25
						let min = 0
						if (value.offset > min) {
							value.offset = min
							value.velocity *= -1 / 3
						}
					}
					let index = t % value.images.length
					let image = value.images[index]
					layers.effects.push({
						image: image,
						position: [
							target.cell[0] * 16 + 8 - image.width / 2,
							target.cell[1] * 16 - 12 + value.offset
						]
					})
				}
			}
		}
	}

	let effects = cache.effects
	for (let i = 0; i < effects.length; i++) {
		let effect = effects[i]
		if (effect.type === "particle") {
			let particle = effect
			particle.position[0] += particle.velocity[0]
			particle.position[1] += particle.velocity[1]
			particle.velocity[0] *= 0.875
			particle.velocity[1] *= 0.875
			let p = Math.random()
			let t = time - particle.time
			if (p < t / 240) {
				effects.splice(i--, 1)
			} else {
				if (!fusion) {
					layers.effects.push(particle)
				} else {
					let layer = particle.velocity[1] < 0
						? "floors"
						: "effects"
					layers[layer].push(particle)
				}
			}
		} else if (effect.type === "shockwave") {
			let shockwave = effect
			let animation = sprites.effects.shockwave
			let t = time - shockwave.time
			let l = animation.front.length
			let d = 5
			if (t < l * d) {
				let frame = Math.floor(t / d)
				layers.floors.push({
					image: animation.back[frame],
					position: shockwave.position
				})
				layers.effects.push({
					image: animation.front[frame],
					position: [
						shockwave.position[0],
						shockwave.position[1] + 12
					]
				})
			} else {
				effects.splice(i--, 1)
			}
		}
	}

	if (screen && screen.type === "actions") {
		let actions = screen
		let menu = actions.menu
		if (menu.done) {
			let selection = menu.options[menu.index]
			if (selection === "wait") {
				let unit = cursor.selection.unit
				let index = map.units.indexOf(unit)
				let cached = cache.units[index]
				unit.cell = cached.cell
				cursor.selection = null
				cache.selection = null
				cache.squares.length = 0
				cache.ranges.length = 0
				cache.moved = false
				anim.done = true
				anims.push(
					Anim("drop", anim.target, Anims.drop(anim.data.height))
				)
				Game.endTurn(game, unit)
				cursor.cell = unit.cell.slice()
				cursor.prev = unit.cell.slice()
				screens.shift()
			} else if (selection === "attack") {
				screens.unshift({
					type: "combatForecast",
					time: time,
					menu: Menu.create(cache.enemies)
				})
			} else if (selection === "fuse") {
				screens.unshift({
					type: "fusionForecast",
					time: time,
					menu: Menu.create(cache.allies)
				})
			}

		}
	}

	let menu = view.state.menu
	if (screen && screen.type === "pause"
		|| screen && screen.type === "actions"
		|| forecasting && screen.menu.options.length > 1
	) {
		let data = screen.menu
		if (!menu) {
			menu = view.state.menu = {
				data: data,
				box: {
					size: [ 0, 0 ],
					targetSize: null,
					element: {
						image: null,
						position: [ 144, 48 ]
					}
				},
				cursor: null
			}
		}

		let box = menu.box
		if (menu.data !== data || !box.targetSize) {
			// menu contents have changed OR no target size is specified
			// reset contents and recalculate target size
			cache.menu.labels.length = 0
			menu.cursor = null
			menu.data = data
			let options = data.options
			if (forecasting) {
				options = options.map(unit => unit.name)
			}
			let widest = null
			for (let option of options) {
				let text = forecasting
					? option
					: option.toUpperCase()
				let image = sprites.ui.Text(text)
				if (!widest || image.width > widest.width) {
					widest = image
				}
				cache.menu.labels.push(image)
			}
			box.size = [ 0, 0 ]
			box.targetSize = [
				widest.width + 36,
				menu.data.options.length * 16 + 16
			]
		}
		// resize dialog box to target size
		box.size[0] += (box.targetSize[0] - box.size[0]) / 4
		box.size[1] += (box.targetSize[1] - box.size[1]) / 4
	} else {
		if (menu) {
			let box = menu.box
			// shrink box until it hits size [ 0, 0 ]
			if (box.size[0]) {
				box.size[0] -= Math.min(box.size[0], box.targetSize[0] / 5)
				box.size[1] -= Math.min(box.size[1], box.targetSize[1] / 5)
			}
		}
	}



	if (menu) {
		let box = menu.box
		if (box.size[0] && box.size[1]) {
			// only draw if side lengths are not 0
			let dist = box.targetSize[0] - box.size[0]
			box.element.image = sprites.ui.Box(...box.size.map(Math.round))
			cache.menu.box = box.element.image
			if (dist < 4) {
				// box is large enough. draw contents
				let context = box.element.image.getContext("2d")
				for (let i = 0; i < cache.menu.labels.length; i++) {
					let label = cache.menu.labels[i]
					context.drawImage(label, 24, 12 + i * 16)
				}

				let icon = null
				let option = menu.data.options[menu.data.index]
				if (screen && screen.type === "combatForecast") {
					icon = sprites.icons.sword
				} else if (screen && screen.type === "fusionForecast") {
					icon = sprites.icons.fuse
				} else if (option === "attack") {
					icon = sprites.icons.sword
				} else if (option === "fuse") {
					icon = sprites.icons.fuse
				} else if (option === "wait") {
					icon = sprites.icons.clock
				} else if (option === "end turn") {
					icon = sprites.icons.next
				}

				if (icon) {
					let frame = (time % 180) / 180
					let offset = Math.sin(2 * Math.PI * frame * 2)
					let y = 12 + menu.data.index * 16 - offset
					if (menu.cursor === null) {
						menu.cursor = y
					} else {
						menu.cursor += (y - menu.cursor) / 2
					}
					context.drawImage(icon, 12, menu.cursor)
				}
			}
			layers.ui.push(box.element)
		}
	}


	if (screen && screen.type === "combatForecast") {
		let forecast = screen
		let menu = forecast.menu
		let target = menu.options[menu.index]

		// title box
		if (!cache.boxes.forecast) {
			let text = sprites.ui.Text("COMBAT FORECAST")
			let box = sprites.ui.Box(text.width + 28, 24)
			let context = box.getContext("2d")
			let icon = sprites.icons.eye
			context.drawImage(icon, 8, 8)
			context.drawImage(text, 20, 8)
			cache.boxes.forecast = {
				title: {
					image: box,
					position: [ -box.width, 8 ]
				}
			}
		}

		let title = cache.boxes.forecast.title
		title.position[0] += (8 - title.position[0]) / 8
		layers.ui.push(title)

		let unit = cursor.selection.unit
		let index = map.units.indexOf(unit)
		let cached = view.cache.units[index]
		let neighbors = Cell.neighborhood(cached.cell, Unit.rng(unit.type))
		for (let neighbor of neighbors) {
			layers.squares.push({
				image: sprites.ui.squares.attack,
				position: [ neighbor[0] * 16, neighbor[1] * 16 ]
			})
		}

		let x = 31
		let y = 11
		let n = Math.floor(42 / 3)
		let d = 60
		let t = (time - screen.time) % d / d
		let p = Math.sin(t * Math.PI)
		let steps = Cell.manhattan(cached.cell, target.cell)

		let finisher = false
		if (cache.target) {
			let damage = Math.min(target.hp,
				steps <= Unit.rng(unit.type)
					? Number(Unit.dmg(unit, target))
					: 0
			)
			if (target.hp - damage <= 0) {
				finisher = true
			}
			if (damage) {
				let width = damage * n
				let hp = target.hp
				if (hp > 3) {
					hp -= 3
					if (hp < 3) {
						width = (3 - hp) * n
					}
				}

				if (width) {
					let color = hp >= 3
						? palette.pink
						: palette.black

					let r = lerp(color[0], 255, p)
					let g = lerp(color[1], 255, p)
					let b = lerp(color[2], 255, p)
					let context = Canvas(damage * n, 2)
					context.fillStyle = rgb(r, g, b)
					context.fillRect(0, 0, context.canvas.width, context.canvas.height)

					let box = cache.target.boxes.hp
					layers.ui.push({
						image: context.canvas,
						position: [
							box.position[0] + x + hp * n - damage * n,
							box.position[1] + y
						]
					})
				}
			}
		}

		if (!finisher) {
			if (cache.focused) {
				let damage = Math.min(unit.hp,
					steps <= Unit.rng(target.type)
						? Number(Unit.dmg(target, unit))
						: 0
				)
				if (damage) {
					let width = damage * n
					let hp = unit.hp
					if (hp > 3) {
						hp -= 3
						if (hp < 3) {
							width = (3 - hp) * n
						}
					}

					if (width) {
						let color = (unit.hp - damage) >= 3
							? palette.cyan
							: palette.black

						let r = lerp(color[0], 255, p)
						let g = lerp(color[1], 255, p)
						let b = lerp(color[2], 255, p)
						let context = Canvas(damage * n, 2)
						context.fillStyle = rgb(r, g, b)
						context.fillRect(0, 0, context.canvas.width, context.canvas.height)

						let box = cache.focused.boxes.hp
						layers.ui.push({
							image: context.canvas,
							position: [
								box.position[0] + x + hp * n - damage * n,
								box.position[1] + y
							]
						})
					}
				}
			}
		}

		if (menu.done) {
			unit.cell = cached.cell
			let power = Unit.dmg(unit, target)
			let damage = Math.min(target.hp, Number(power))
			Unit.attack(unit, target)
			attacks.push({
				attacker: unit,
				target: target,
				power: power,
				damage: damage,
			})
			if (!finisher && steps <= Unit.rng(target.type)) {
				let power = Unit.dmg(target, unit)
				let damage = Math.min(unit.hp, Number(power))
				Unit.attack(target, unit)
				attacks.push({
					attacker: target,
					target: unit,
					power: power,
					damage: damage,
					counter: true
				})
			}
			cache.squares.length = 0
			cache.ranges.length = 0
			cache.moved = false
			cursor.cell = unit.cell.slice()
			cursor.under = cursor.selection
			cursor.selection = null
			cache.selection = null
			screens.length = 0
			anim.done = true
		}
	} else if (screen && screen.type === "fusionForecast") {
		let forecast = screen
		let menu = forecast.menu
		let target = menu.options[menu.index]
		let unit = cursor.selection.unit

		// title box
		if (!cache.boxes.forecast) {
			let text = sprites.ui.Text("FUSION FORECAST")
			let title = sprites.ui.Box(text.width + 28, 24)
				.getContext("2d")
			title.drawImage(sprites.icons.fuse, 8, 8)
			title.drawImage(text, 20, 8)

			let delta = {}
			let stats = [ "atk", "def", "res", "hit", "avo", "mov", "rng" ]
			let promotion = Unit.promotions[unit.type]
			for (let stat of stats) {
				let value = Unit[stat](unit.type)
				let newValue = Unit[stat](promotion)
				delta[stat] = newValue - value
			}

			let statsBox = sprites.ui.UnitStats(unit, stats)
			let deltaBox = sprites.ui.StatsDelta(Object.values(delta))
			cache.delta = delta

			let icon = icons.units[target.type]
			let badge = sprites.ui.Box(32, 24)
				.getContext("2d")
			badge.drawImage(sprites.ui.Text("+"), 8, 8)
			badge.drawImage(sprites.icons[icon], 16, 8)

			cache.boxes.forecast = {
				title: {
					image: title.canvas,
					position: [ -title.canvas.width, 8 ]
				},
				stats: {
					image: statsBox,
					position: [ 8, viewport.size[1] + statsBox.height ]
				},
				delta: {
					image: deltaBox,
					position: [ 8 + statsBox.width + 4, viewport.size[1] + deltaBox.height ]
				},
				badge: {
					image: badge.canvas,
					position: cache.focused.boxes.name.position.slice()
				}
			}
		}

		let { title, stats, delta, badge } = cache.boxes.forecast
		title.position[0] += (8 - title.position[0]) / 8
		stats.position[1] += (viewport.size[1] - stats.image.height - 8 - stats.position[1]) / 8
		delta.position[1] += (viewport.size[1] - delta.image.height - 8 - delta.position[1]) / 8

		if (cache.focused && cache.focused.boxes.name.position[1] !== 8) {
			let a = 2
			let d = 120
			let t = (time - screen.time) % d / d
			let o = [
				Math.cos(2 * Math.PI * t) * a,
				Math.sin(2 * Math.PI * t) * a
			]
			let target = cache.focused.boxes.name
			badge.position[0] = target.position[0] + target.image.width - 12 + o[0]
			badge.position[1] = target.position[1] - 12 + o[1]
			layers.ui.push(badge)
		}

		layers.ui.push(title, stats, delta)

		let index = map.units.indexOf(unit)
		let cached = view.cache.units[index]
		let neighbors = Cell.neighborhood(cached.cell)
		for (let neighbor of neighbors) {
			layers.squares.push({
				image: sprites.ui.squares.fuse,
				position: [ neighbor[0] * 16, neighbor[1] * 16 ]
			})
		}

		let hp = unit.hp + target.hp
		let extra = hp > 3
		if (extra) {
			hp -= 3
		}

		let x = 31
		let y = 11
		let n = Math.floor(42 / 3)
		let t = (time - screen.time) % 60 / 60
		let p = Math.sin(Math.PI * t)
		let c = palette.black
		if (extra) {
			c = palette.blue
		}

		let r = lerp(c[0], 255, p)
		let g = lerp(c[1], 255, p)
		let b = lerp(c[2], 255, p)

		if (cache.delta) {
			let context = delta.image.getContext("2d")
			let y = 8
			for (let stat in cache.delta) {
				let value = cache.delta[stat]
				if (value) {
					let sign = value >= 0 ? "+" : "-"
					let color = palette.blue.map(x => lerp(x, 255, 1 - p))
					context.drawImage(sprites.ui.Text(sign + value, color), 8, y)
				}
				y += 8
			}
		}

		if (cache.focused && cache.focused.boxes.name.position[1] !== 8) {
			let context = Canvas(hp * n, 2)
			context.fillStyle = `rgb(${r}, ${g}, ${b})`
			context.fillRect(0, 0, context.canvas.width, context.canvas.height)

			let o = extra
				? 0
				: unit.hp * n

			let box = cache.focused.boxes.hp
			layers.ui.push({
				image: context.canvas,
				position: [
					box.position[0] + x + o,
					box.position[1] + y
				]
			})
		}

		if (cache.target && cache.target.boxes.name.position[1] !== 8) {
			let context = Canvas(target.hp * n, 2)
			context.fillStyle = `rgb(${p * 255}, ${p * 255}, ${p * 255})`
			context.fillRect(0, 0, context.canvas.width, context.canvas.height)
			let box = cache.target.boxes.hp
			layers.ui.push({
				image: context.canvas,
				position: [
					box.position[0] + x,
					box.position[1] + y
				]
			})
		}

		if (menu.done) {
			cache.squares.length = 0
			cache.ranges.length = 0
			cache.moved = false
			cursor.selection = null
			screens.length = 0
			unit.cell = cached.cell
			anim.done = true
			state.fusion = { unit, target }
		}
	} else {
		let box = cache.boxes.forecast
		if (box) {
			if (box.title) {
				let title = box.title
				let dest = -title.image.width
				if (title.position[0] > dest) {
					title.position[0] -= 16
					layers.ui.push(title)
				} else {
					box.title = null
				}
			}
			if (box.stats && box.delta) {
				let stats = box.stats
				let delta = box.delta
				let dest = viewport.size[1] + stats.image.height
				if (stats.position[1] < dest) {
					stats.position[1] += 16
					delta.position[1] += 16
					layers.ui.push(stats, delta)
				} else {
					box.stats = null
					box.delta = null
				}
			}
			if (!box.title && !box.stats && !box.delta) {
				cache.boxes.forecast = null
			}
		}
	}

	let objective = cache.boxes.objective
	if (!objective) {
		let title = sprites.ui.TextBox("OBJECTIVE")
		let body = sprites.ui.TextBox("Defeat Nergal")
		objective = cache.boxes.objective = {
			lastUpdate: null,
			time: 0,
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

	if (map.units.length !== objective.lastUpdate) {
		objective.body.image = sprites.ui.TextBox(`Defeat Nergal`)
		objective.lastUpdate = enemies.length
	}

	let { title, body } = objective
	if (!cursor.selection && !cursor.under
	&& !cache.attack && !(screen && screen.type === "pause")
	&& Cell.manhattan(cursor.cell, cursor.prev) < 1e-3
	&& (below === (title.position[1] === 8)
		|| title.position[0] === viewport.size[0]
		&& body.position[0] === viewport.size[0]
		)
	) {
		if (!objective.time) {
			objective.time = 1
		}
	} else {
		objective.time = 0
	}

	let idle = 150
	if (objective.time) {
		if (title.position[0] === viewport.size[0]) {
			if (below) {
				title.position[1] = 8
				body.position[1] = 36
			} else {
				title.position[1] = viewport.size[1] - title.image.height - 36
				body.position[1] = viewport.size[1] - body.image.height - 8
			}
		}
		if (++objective.time >= idle) {
			title.position[0] += ((viewport.size[0] - title.image.width - 8) - title.position[0]) / 8
		}
		if (objective.time >= idle + 4) {
			body.position[0] += ((viewport.size[0] - body.image.width - 8) - body.position[0]) / 8
		}
	}

	if (objective.time < idle) {
		if (title.position[0] < viewport.size[0]
		|| body.position[0] < viewport.size[0]
		) {
			title.position[0] += Math.min(16, viewport.size[0] - title.position[0])
			body.position[0] += Math.min(16, viewport.size[0] - body.position[0])
			objective.time = 0
		}
	}

	layers.ui.push(title, body)

	if (phasing) {
		let x = 0
		let data = anim.data
		let id = anim.target + "Phase"
		let text = sprites.ui.words[id]
		if (data.state === "enter") {
			let origin = -text.width
			let target = viewport.size[0] / 2 - text.width / 2 - 3
			x = data.text.x * (target - origin) + origin
		} else if (data.state === "pass") {
			let origin = viewport.size[0] / 2 - text.width / 2 - 3
			x = data.text.x * 6 + origin
		} else if (data.state === "exit") {
			let origin = viewport.size[0] / 2 - text.width / 2 + 3
			let target = viewport.size[0]
			x = data.text.x * (target - origin) + origin
		}

		let bg = Canvas(256 * (data.bg.width - data.bg.x), 2 + 10 * data.bg.height)
		bg.fillStyle = anim.target === "player"
			? rgba(palette.blue)
			: rgba(palette.red)
		bg.fillRect(0, 0, bg.canvas.width, bg.canvas.height)

		if (bg.canvas.width) {
			layers.ui.push({
				image: bg.canvas,
				position: [ data.bg.x * 256, viewport.size[1] / 2 - bg.canvas.height / 2 ]
			})
		}

		layers.ui.push({
			image: text,
			position: [ x, viewport.size[1] / 2 - text.height / 2 ]
		})
	}

	if (cache.attack && attack.power === 3 && cache.attack.connected && cache.attack.time <= 3) {
		context.fillStyle = "white"
		context.fillRect(0, 0, context.canvas.width, context.canvas.height)
	} else {
		if (cache.phase.faction === "player"
		&& !attack && !fusion && !phasing && !(screen && screen.type === "pause")
		&& (!(screen && screen.type === "actions") && !cache.moved || forecasting)
		) {
			renderCursor(layers, sprites.ui.cursor, cursor, view)
		}

		renderUnits(layers, sprites.pieces, game, view)
		renderLayers(layers, order, viewport, context)
	}
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

function renderUnits(layers, sprites, game, view) {
	let map = game.map
	let phase = game.phase
	let cache = view.cache
	let attacks = view.state.attacks
	let fusion = view.state.fusion
	let anims = view.state.anims
	let anim = anims[0]
	for (let i = 0; i < cache.units.length; i++) {
		let unit = cache.units[i]
		let real = unit.original
		let cell = unit.cell
		let x = cell[0] * 16
		let y = cell[1] * 16
		let z = 0
		if (!anim || anim.type !== "fuse") {
			if (map.units[i] === real) {
				if (unit.type !== real.type) {
					unit.type = real.type
				}
			}
		}
		if (!Unit.promotions[unit.type]) {
			z = 3
		}
		let sprite = sprites[unit.faction][unit.type]
		if (unit.faction === "player"
		&& cache.phase.faction === "player"
		&& cache.phase.pending
		&& !cache.phase.pending.includes(real)
		&& !(fusion && fusion.unit === real)
		&& !(attacks.length && attacks[0].target === real)
		&& !(anim && anim.target === unit
			&& (anim.type === "move" || anim.type === "attack" || anim.type === "fuse")
			)
		) {
			sprite = sprites.done[unit.faction][unit.type]
		}
		if (map.units[i] === real) {
			if (!Cell.equals(unit.cell, real.cell)
			&& cache.path
			&& !cache.moved
			&& !(anim && anim.type === "fuse")
			) {
				if (anim) anim.done = true
				anim = anims[0] = Anim("move", unit, Anims.move(cache.path))
				cache.moved = true
			}
		} else if (!anims.length) {
			if (anim) anim.done = true
			anim = anims[0] = Anim("fade", unit, Anims.fade())
		} else if (anim && anim.type === "fuse" && anim.data.target === real && anim.done) {
			cache.units.splice(i--, 1)
			cache.ranges.length = 0
			cache.squares.length = 0
		}
		if (anim && anim.target === unit) {
			if (anim.type === "lift" || anim.type === "drop") {
				z = anim.data.height
				if (!Unit.promotions[unit.type]) {
					z += 3
				}
			} else if (anim.type === "move" || anim.type === "attack") {
				x = anim.data.cell[0] * 16
				y = anim.data.cell[1] * 16
			} else if (anim.type === "fuse") {
				x = anim.data.cell[0] * 16
				y = anim.data.cell[1] * 16
				z = anim.data.height
			} else if (anim.type === "fade") {
				if (anim.done) {
					cache.units.splice(i--, 1)
					continue
				} else if (!anim.data.visible) {
					continue
				}
			}
			layers.selection.push({
				image: sprite,
				position: [ x, y - z ]
			})
		} else {
			let attack = attacks[0]
			if (cache.attack && !cache.attack.countdown) {
				if (attack.target === real) {
					let { connected, time, normal } = cache.attack
					let t = (view.state.time - time)
					if (connected) {
						if (attack.damage && t < 45 && t % 2) {
							if (Unit.promoted(unit.type)) {
								sprite = sprites.flashingStacked
								z = 3
							} else {
								sprite = sprites.flashing
							}
						}
						if (t < 20 && attack.power
						&& (!(unit.type === "knight" || unit.type === "general") || attack.damage === unit.hp)
						) {
							let steps = t
							if (t > 10) {
								steps = 20 - t
							}
							x += normal[0] * steps / 2 * attack.power / 2
							y += normal[1] * steps / 2 * attack.power / 2
						}
					}
					layers.pieces.unshift({
						image: sprite,
						position: [ x, y, z ]
					})
				}
			}
			if (!cache.attack || cache.attack.countdown || attack && attack.target !== real) {
				layers.pieces.push({
					image: sprite,
					position: [ x, y, z ]
				})
			}
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
	if (cursor.selection && !view.state.screens.length) {
		frame = 1
	} else if (d < 1e-3) {
		frame = Math.floor(time / 30) % 2
	}

	let x = cursor.prev[0] * 16
	let y = cursor.prev[1] * 16
	let sprite = sprites[view.cache.phase.faction][frame]
	layers.cursor.push({
		image: sprite,
		position: [ x, y ]
	})
}

function renderLayers(layers, order, viewport, context) {
	for (let name of order) {
		let layer = layers[name]
		if (name !== "ui") {
			layer.sort((a, b) => a.position[1] - b.position[1])
		}

		for (let element of layer) {
			let x = Math.round(element.position[0])
			let y = Math.round(element.position[1] - (element.position[2] || 0))
			if (name !== "ui") {
				x -= (viewport.position[0] + viewport.offset[0])
				y -= (viewport.position[1] + viewport.offset[1])
			}
			context.drawImage(element.image, x, y)
		}
	}
}
