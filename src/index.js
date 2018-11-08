import loadImage from "img-load"
import disassemble from "./sprites"
import * as maps from "./maps"
import * as Game from "../lib/game"
import * as View from "./view"
import * as Cursor from "./cursor"
import * as Keys from "./keys"
import * as Menu from "./menu"

loadImage("sprites.png").then(main)

let game = Game.create(maps.castle)
let keys = Keys.create(window)

function main(spritesheet) {
	let sprites = disassemble(spritesheet)
	let view = View.create(256, 240, sprites)
	let canvas = view.context.canvas
	document.querySelector("main").appendChild(canvas)
	loop()

	function loop() {
		View.render(view, game)
		View.update(view)

		let cursor = view.state.cursor
		let menu = view.cache.menu
		if (menu) {
			Menu.update(menu.data, keys)
		} else {
			Cursor.update(cursor, keys, game, view)
		}

		let { held, prev } = keys
		if (held.cancel && !prev.cancel) {
			if (menu) {
				let unit = view.state.cursor.selection.unit
				view.cache.units[game.map.units.indexOf(unit)].cell = unit.cell
				view.cache.menu = null
				view.cache.moved = null
			} else {
				Cursor.deselect(cursor)
			}
		}

		Keys.update(keys)
		requestAnimationFrame(loop)
	}
}

window.addEventListener("keydown", event => {
	if (event.code === "Tab") {
		event.preventDefault()
	}
})
