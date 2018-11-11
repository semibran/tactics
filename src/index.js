import loadImage from "img-load"
import disassemble from "./sprites"
import * as maps from "./maps"
import * as Game from "../lib/game"
import * as View from "./view"
import * as Cursor from "./cursor"
import * as Keys from "./keys"
import * as Menu from "./menu"
import * as Cell from "../lib/cell"
import * as AI from "../lib/ai"
import * as Unit from "../lib/unit"
import pathfind from "../lib/pathfind"
import Anims from "./anims"
import Anim from "./anim"

loadImage("sprites.png").then(main)

let map = maps.hideout
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
		} else if (game.phase.faction === "player"
		&& !view.state.attacks.length
		&& !view.cache.moved
		&& !(anims.length && anims[0].type === "phase")
		) {
			Cursor.update(cursor, keys, game, view)
		}

		let ai = view.state.ai
		if (view.cache.phase.faction === "enemy" && !view.cache.phase.done) {
			if (!ai.strategy) {
				let enemies = game.map.units.filter(unit => unit.faction === "enemy")
				let allies  = game.map.units.filter(unit => unit.faction === "player")
				if (allies.length) {
					ai.strategy = AI.analyze(game.map, "enemy")
					ai.allies = enemies
					cursor.selection = null
					cursor.under = null
				}
			} else {
				let turn = ai.strategy[ai.index]
				let unit = ai.allies[ai.index]
				let index = game.map.units.indexOf(unit)
				let cached = view.cache.units[index]
				let action = turn && turn[ai.action]
				if (action) {
					let [ type, target ] = action
					if (type === "move") {
						if (!anims.length) {
							if (!ai.moved) {
								ai.moved = true
								let range = Unit.range(game.map, unit)
								let cells = range.move.slice()
								for (let enemy of ai.allies) {
									cells.push(enemy.cell)
								}
								let path = pathfind(cells, unit.cell, target)
								view.cache.path = path
								view.cache.moved = false
								unit.cell = target.slice()
							} else {
								ai.action++
								view.cache.moved = false
								cached.cell = target.slice()
							}
						}
					} else if (type === "attack") {
						let power = Unit.dmg(unit, target)
						let damage = Math.min(target.hp, Number(power))
						if (!view.state.attacks.length) {
							if (!ai.attacked) {
								ai.attacked = true
								Unit.attack(unit, target)
								view.cache.target = { unit: target, time: 0 }
								view.state.attacks.push({
									attacker: unit,
									target: target,
									power: power,
									damage: damage,
								})
								if (target.hp && Cell.manhattan(target.cell, unit.cell) <= Unit.rng(target)) {
									let power = Unit.dmg(target, unit)
									let damage = Math.min(unit.hp, Number(power))
									Unit.attack(target, unit)
									view.state.attacks.push({
										attacker: target,
										target: unit,
										power: power,
										damage: damage,
										counter: true
									})
									if (!target.hp) {
										ai.casualties++
									}
								}
								cursor.selection = { unit, time: 0 }
								cursor.under = unit
							} else {
								ai.action++
								cursor.selection = null
								cursor.under = null
							}
						}
					}
				} else {
					ai.moved = false
					ai.attacked = false
					ai.index++
					ai.action = 0
					if (unit) {
						Game.endTurn(game, unit)
					}
					if (ai.index === ai.strategy.length) {
						ai.index = 0
						ai.strategy = null
						view.cache.phase.done = true
						let unit = game.map.units.find(unit => unit.faction === "player")
						if (unit) {
							cursor.cell = unit.cell.slice()
							cursor.prev = unit.cell.slice()
							cursor.selection = null
							cursor.under = null
						}
					}
				}
			}
		} else {
			ai.strategy = null
		}

		if (held.cancel && !prev.cancel) {
			let anim = view.state.anims[0]
			if (!anim || anim.type !== "move") {
				if (dialog) {
					if (dialog.type === "pause") {
						view.state.paused = false
					} else if (dialog.type === "actions") {
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
					if (cursor.selection) {
						Cursor.deselect(cursor)
					} else if (!view.state.attacks.length
					&& !(anim && anim.type === "phase")
					) {
						view.state.paused = true
					}
				}
			}
		}

		Keys.update(keys)
		requestAnimationFrame(loop)
		// setTimeout(loop, 1000 / 30)
	}
}

window.addEventListener("keydown", event => {
	if (event.code === "Tab") {
		event.preventDefault()
	}
})
