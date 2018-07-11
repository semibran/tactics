import Anim from "./anim"
import Anims from "./anims"
import range from "../lib/range"
import * as Map from "../lib/map"
import * as Unit from "../lib/unit"
import * as Cell from "../lib/cell"

function View() {
	let canvas = document.createElement("canvas")
	return {
		context: canvas.getContext("2d"),
		anims: [],
		path: [],
		cursor: null,
		cache: {
			phase: {
				faction: "player",
				pending: []
			},
			units: [],
			range: null,
			selection: null
		}
	}
}

function render(view, game) {
	let { context, anims, cursor, cache } = view
	let { map, phase } = game
	let [ width, height ] = map.layout.size
	let canvas = context.canvas
	let anim = anims[0]

	if (!cache.units.length) {
		cache.units = map.units.slice()
	}

	if (cache.phase.pending.length < phase.pending.length && !anims.length) {
		cache.phase.pending = phase.pending.slice()
	}

	if (cache.phase.faction !== phase.faction
	&& !anims.length
	) {
		cache.phase.faction = phase.faction
	}

	canvas.width = width * 32
	canvas.height = height * 32

	context.beginPath()
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)

	let unit = view.selection
	if (unit) {
		if (cache.selection !== unit) {
			cache.range = range(map, unit)
			cache.selection = unit
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
			if (type === "move") {
				context.fillStyle = "navy"
			} else if (type === "attack") {
				context.fillStyle = "maroon"
			}
			context.fillRect(x * 32 + 1, y * 32 + 1, 29, 29)
		}
	} else {
		cache.range = null
		cache.selection = null
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			context.beginPath()
			context.strokeStyle = "navy"
			context.strokeRect(x * 32 - 0.5, y * 32 - 0.5, 32, 32)
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let tile = Map.tileAt(map, [ x, y ])
			if (tile.name === "wall") {
				context.beginPath()
				context.fillStyle = cache.phase.faction === "player"
					? "blue"
					: "maroon"
				context.fillRect(x * 32, y * 32, 32, 32)
			}
		}
	}

	if (cursor) {
		let [ x, y ] = cursor
		context.beginPath()
		context.strokeStyle = "cyan"
		context.lineWidth = 2
		context.strokeRect(x * 32 + 3, y * 32 + 3, 25, 25)
	}

	for (let i = 0; i < cache.units.length; i++) {
		let unit = cache.units[i]
		let cell = unit.cell
		if (anim && unit === anim.target) {
			if (anim.type === "move" || anim.type === "attack") {
				cell = anim.data.cell
			} else if (anim.type === "flinch") {
				cell = [
					unit.cell[0] + anim.data.offset[0] / 16,
					unit.cell[1] + anim.data.offset[1] / 16
				]
			} else if (anim.type === "fade") {
				if (anim.done) {
					cache.units.splice(i--, 1)
					continue
				} else if (!anim.data.visible) {
					continue
				}
			}
		} else if (cache.phase.pending.includes(unit)
		&& !phase.pending.includes(unit)
		&& !anims.length // find(anim => anim.target === unit)
		) {
			cache.phase.pending.splice(cache.phase.pending.indexOf(unit), 1)
		}

		let [ x, y ] = cell
		let color = unit.faction === "player" ? "lime" : "red"
		if (unit.faction === cache.phase.faction
		&& !cache.phase.pending.includes(unit)
		&& !(anim && unit === anim.target)
		) {
			color = unit.faction === "player" ? "teal" : "purple"
		}
		context.beginPath()
		context.arc((x + 0.5) * 32, (y + 0.5) * 32, 8, 0, 2 * Math.PI)
		context.fillStyle = color
		context.fill()
	}

	if (view.path.length) {
		for (let i = 0; i < view.path.length; i++) {
			let cell = view.path[i]
			let x = (cell[0] + 0.5) * 32
			let y = (cell[1] + 0.5) * 32
			if (!i) {
				context.beginPath()
				context.moveTo(x, y)
			} else {
				context.lineTo(x, y)
			}
		}
		context.strokeStyle = "cyan"
		context.lineWidth = 2
		context.stroke()
	}
}

function update(view) {
	let anims = view.anims
	let anim = anims[0]
	if (!anim) return
	if (anim.done) {
		anims.shift()
	} else {
		Anims[anim.type].update(anim)
	}
}

View.render = render
View.update = update
export default View
