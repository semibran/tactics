import loadImage from "img-load"
import disassemble from "./sprites"
import * as maps from "./maps"
import * as Game from "../lib/game"
import * as View from "./view"
import * as Cursor from "./cursor"
import * as Keys from "./keys"
import * as Menu from "./menu"
import * as Forecast from "./forecast"

loadImage("sprites.png").then(main)

let map = maps.test
let game = Game.create(map)
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

		let { held, prev } = keys
		let cursor = view.state.cursor
		let anims = view.state.anims
		let dialogs = view.state.dialogs
		let dialog = dialogs[0]
		if (dialog) {
			Menu.update(dialog.menu, keys)
		} else if (!view.cache.attack
		&& !view.cache.moved
		&& !(anims.length && anims[0].type === "phase")
		) {
			Cursor.update(cursor, keys, game, view)
		}

		if (held.cancel && !prev.cancel) {
			let anim = view.state.anims[0]
			if (!anim || anim.type !== "move") {
				if (dialog) {
					if (dialog.type === "actions") {
						let unit = view.state.cursor.selection.unit
						let index = game.map.units.indexOf(unit)
						view.cache.units[index].cell = unit.cell
						view.cache.moved = null
					}
					dialogs.shift()
					if (dialogs.length) {
						dialog = dialogs[0]
						if (dialog.type === "actions") {
							dialog.menu.done = false
						}
					}
				} else {
					Cursor.deselect(cursor)
				}
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
