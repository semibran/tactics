import Anim from "./anim"
import Anims from "./anims"
import range from "../lib/range"
import Canvas from "../lib/canvas"
import * as Map from "../lib/map"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"
import * as Game from "../lib/game"

function View(sprites) {
	let canvas = document.createElement("canvas")
	return {
		sprites: sprites,
		context: canvas.getContext("2d"),
		anims: [],
		path: [],
		cursor: null,
		target: null,
		selection: null,
		hover: {
			time: 0,
			target: null,
			dialog: null,
			entering: false
		},
		cache: {
			time: 0,
			phase: {
				faction: "player",
				next: "player",
				pending: []
			},
			units: [],
			hover: { target: null, last: null },
			range: null,
			selection: null,
			moving: false
		}
	}
}

function render(view, game) {
	let { sprites, context, anims, cursor, cache } = view
	let { map, phase } = game
	let [ width, height ] = map.layout.size
	let canvas = context.canvas
	let anim = anims[0]
	let order = [
		"tiles",
		"shadows",
		"walls",
		"squares",
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

	if (!cache.units.length) {
		cache.units = map.units.map(unit => Object.assign({ original: unit }, unit))
	}

	if (cache.phase.pending.length < phase.pending.length && !anims.find(anim => anim.target.faction === cache.phase.faction)) {
		cache.phase.pending = phase.pending.slice()
	}

	if (cache.phase.faction !== cache.phase.next) {
		let anim = anims.find(anim => anim.target.faction === cache.phase.faction)
		if (!anim || anims.indexOf(anim) > 0) {
			cache.phase.faction = cache.phase.next
		}
	}

	if (cache.phase.next !== phase.faction && cache.phase.faction === cache.phase.next) {
		cache.phase.next = phase.faction
	}

	canvas.width = width * 16
	canvas.height = height * 16

	context.beginPath()
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)

	let dialog = view.hover.dialog
	if (cache.hover.target !== view.hover.target) {
		cache.hover.target = view.hover.target
		let unit = view.hover.target
		if (view.hover.entering !== !!unit) {
			view.hover.entering = !!unit
		}
		if (unit) {
			cache.hover.last = unit
			let symbol = sprites.pieces.symbols[Game.equipment[unit.type]]
			dialog = view.hover.dialog = sprites.ui.TextBox([
				`  ${ unit.type.toUpperCase() }`,
				``,
				`HP  ${ unit.hp }/3`,
				`STR ${ Unit.str(unit) }`,
				`INT ${ Unit.int(unit) }`,
				`AGI ${ Unit.agi(unit) }`,
				`MOV ${ Unit.mov(unit) }`
			])

			dialog.getContext("2d")
				.drawImage(symbol, 16, 16)
		}
	}

	let unit = view.hover.target || cache.hover.last
	if (unit) {
		let origin = unit.cell[0] >= 8
			? -dialog.width
			: context.canvas.width

		let target = unit.cell[0] >= 8
			? 8
			: context.canvas.width - dialog.width - 8

		let x = origin + ((target - origin) / 8) * view.hover.time
		let y = context.canvas.height - dialog.height - 8

		if (view.hover.entering && ++view.hover.time > 8) {
			view.hover.time = 8
		} else if (!view.hover.entering && --view.hover.time < 0) {
			view.hover.time = 0
		}

		layers.dialogs.push({
			image: dialog,
			position: [ x, y ]
		})
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			context.drawImage(sprites.tiles.floor, x * 16, y * 16)
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let tile = Map.tileAt(map, [ x, y ])
			if (tile.name === "wall") {
				let sprite = sprites.tiles.wall
				if (Map.tileAt(map, [ x, y + 1 ]) !== tile) {
					sprite = sprites.tiles["wall-base"]
				}
				layers.walls.push({
					image: sprite,
					position: [ x * 16, y * 16 ]
				})
			}
		}
	}

	unit = view.selection
	if (unit) {
		if (cache.selection !== unit) {
			cache.range = range(map, unit)
			cache.selection = unit
			cache.selected = unit
		}

		for (let cell of cache.range) {
			let [ x, y ] = cell
			let type = "move"
			for (let other of map.units) {
				if (Cell.equals(cell, other.cell)) {
					if (!Unit.allied(unit, other)) {
						type = "attack"
					} else {
						type = "ally"
					}
					break
				}
			}
			if (type !== "move" && type !== "attack") {
				continue
			}
			let sprite = sprites.ui.squares[type]
			layers.squares.push({
				image: sprite,
				position: [ x * 16, y * 16 ]
			})
		}
	} else {
		if (cache.selection && anim && anim.type === "move" && anim.target === cache.selection) {
			cache.moving = true
		}
		cache.range = null
		cache.selection = null
	}

	for (let i = 0; i < cache.units.length; i++) {
		let unit = cache.units[i]
		let symbol = {
			warrior: "axe",
			knight: "shield",
			rogue: "dagger",
			mage: "hat"
		}[unit.type]

		let sprite = sprites.pieces[unit.faction][symbol]
		let cell = unit.cell
		let offset = 0
		if (anim && unit.original === anim.target) {
			if (anim.type === "lift" || anim.type === "float" || anim.type === "drop") {
				offset = -anim.data.height
			} else if (anim.type === "move") {
				cell = anim.data.cell
				if (anim.done) {
					unit.cell = anim.data.cell
					cache.moving = false
				}
			} else if (anim.type === "attack") {
				cell = anim.data.cell
			} else if (anim.type === "flinch") {
				if (anim.data.flashing) {
					sprite = sprites.pieces.flashing
				}
			} else if (anim.type === "fade") {
				if (anim.done) {
					cache.units.splice(i--, 1)
					continue
				} else if (!anim.data.visible) {
					continue
				}
			}
		} else if (cache.phase.pending.includes(unit.original)
		&& !phase.pending.includes(unit.original)
		&& !anims.length // find(anim => anim.target === unit)
		) {
			cache.phase.pending.splice(cache.phase.pending.indexOf(unit.original), 1)
		}

		let [ x, y ] = cell
		if (unit.faction === cache.phase.faction
		&& !cache.phase.pending.includes(unit.original)
		&& !anims.find(anim => anim.target === unit.original)
		) {
			sprite = sprites.pieces.done[unit.faction][symbol]
		}
		let layer = "pieces"
		if (unit.original === view.selection
		|| anims.find(anim => [ "lift", "float", "drop", "attack" ].includes(anim.type) && anim.target === unit.original)
		) {
			layer = "selection"
		}
		layers[layer].push({
			image: sprite,
			position: [ x * 16, y * 16 + offset ]
		})
		layers.shadows.push({
			image: sprites.pieces.shadow,
			position: [ x * 16 + 1, y * 16 + 4 ]
		})
	}

	if (view.path.length) {
		let arrow = Arrow(view.path, sprites.ui.arrows)
		layers.arrows.push(...arrow)
	}

	if (cursor && (!cache.moving || cache.moving && cache.time % 2)) {
		let [ x, y ] = cursor
		let frame = Math.floor(cache.time / 30) % sprites.ui.cursor.length
		layers.cursor.push({
			image: sprites.ui.cursor[frame],
			position: [ x * 16, y * 16 ]
		})
	}

	for (let name of order) {
		let layer = layers[name]
		layer.sort((a, b) => a.position[1] - b.position[1])

		for (let element of layer) {
			let [ x, y, z ] = element.position
			context.drawImage(element.image, Math.round(x), Math.round(y))
		}
	}
}

function update(view) {
	view.cache.time++
	let anims = view.anims
	let anim = anims[0]
	if (!anim) return
	if (anim.done) {
		anims.shift()
	} else {
		Anims[anim.type].update(anim)
	}
}

function Arrow(path, sprites) {
	let arrow = []
	for (let i = 0; i < path.length; i++) {
		let [ x, y ] = path[i]
		let l = false
		let r = false
		let u = false
		let d = false

		let prev = path[i - 1]
		if (prev) {
			let dx = x - prev[0]
			let dy = y - prev[1]
			if (dx === 1) {
				l = true
			} else if (dx === -1) {
				r = true
			}

			if (dy === 1) {
				u = true
			} else if (dy === -1) {
				d = true
			}
		}

		let next = path[i + 1]
		if (next) {
			let dx = next[0] - x
			let dy = next[1] - y
			if (dx === -1) {
				l = true
			} else if (dx === 1) {
				r = true
			}

			if (dy === -1) {
				u = true
			} else if (dy === 1) {
				d = true
			}
		}

		if (l || r || u || d) {
			let direction = null
			if (l && r) {
				direction = "horiz"
			} else if (u && d) {
				direction = "vert"
			} else if (u && l) {
				direction = "upLeft"
			} else if (u && r) {
				direction = "upRight"
			} else if (d && l) {
				direction = "downLeft"
			} else if (d && r) {
				direction = "downRight"
			} else if (l && !i) {
				direction = "leftStub"
			} else if (r && !i) {
				direction = "rightStub"
			} else if (u && !i) {
				direction = "upStub"
			} else if (d && !i) {
				direction = "downStub"
			} else if (l) {
				direction = "left"
			} else if (r) {
				direction = "right"
			} else if (u) {
				direction = "up"
			} else if (d) {
				direction = "down"
			}

			if (direction) {
				arrow.push({
					image: sprites[direction],
					position: [ x * 16, y * 16 ]
				})
			}
		}
	}
	return arrow
}

View.render = render
View.update = update
export default View
