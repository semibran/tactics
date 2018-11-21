import sourcemap from "../dist/tmp/sprites.json"
import extract from "../lib/img-extract"
import pixels from "../lib/pixels"
import Canvas from "../lib/canvas"
import * as Unit from "../lib/unit"
import rgba from "../lib/rgba"
import palette from "./palette"
import * as icons from "./icons"

export default function normalize(spritesheet) {
	let sprites = disassemble(spritesheet, sourcemap)
	return {
		pieces:  pieces(sprites),
		ui:      ui(sprites),
		effects: effects(sprites),
		icons: sprites.icons,
		maps: sprites.maps
	}
}

function disassemble(spritesheet, sourcemap) {
	let sprites = {}
	for (let id in sourcemap) {
		if (Array.isArray(sourcemap[id])) {
			let [ x, y, w, h ] = sourcemap[id]
			sprites[id] = extract(spritesheet, x, y, w, h)
		} else {
			sprites[id] = disassemble(spritesheet, sourcemap[id])
		}
	}

	return sprites
}

function effects(sprites) {
	return {
		shockwave: shockwave(sprites.effects.shockwave),
		particles: particles()
	}
}

function shockwave(sprites) {
	let length = sprites.width / 32
	let front = new Array(length)
	let back = new Array(length)
	for (let i = 0; i < length; i++) {
		back[i] = extract(sprites, i * 32, 0, 32, 12)
		front[i]  = extract(sprites, i * 32, 12, 32, 12)
	}
	return { front, back }
}

function particles() {
	let small = Canvas(1, 1)
	small.fillStyle = "white"
	small.fillRect(0, 0, 1, 1)

	let large = Canvas(2, 2)
	large.fillStyle = "white"
	large.fillRect(0, 0, 2, 2)

	return {
		small: small.canvas,
		large: large.canvas
	}
}

function pieces(sprites) {
	let pieces = {
		player: {},
		enemy: {},
		ally: {},
		done: {
			player: {},
			enemy: {},
			ally: {}
		},
		flashing: null,
		flashingStacked: null,
		shadow: sprites.piece.shadow
	}

	let palettes = {
		player: [ palette.cyan, palette.blue, palette.navy ],
		enemy:  [ palette.pink, palette.red, palette.purple ],
		ally:   [ palette.lime, palette.green, palette.teal ]
	}

	for (let faction in palettes) {
		let colors = palettes[faction]
		for (let type in icons.units) {
			let name = icons.units[type]
			let icon = sprites.icons[name]
			let piece = Piece(icon, colors)
			let done = Piece(icon, [
				colors[1],
				colors[2],
				palette.black
			])
			if (!Unit.promoted(type)) {
				pieces[faction][type] = piece
				pieces.done[faction][type] = done
			} else {
				let stackedPiece = Canvas(piece.width, piece.height + 3)
				stackedPiece.drawImage(piece, 0, 3)
				stackedPiece.drawImage(piece, 0, 0)

				let stackedDone = Canvas(piece.width, piece.height + 3)
				stackedDone.drawImage(done, 0, 3)
				stackedDone.drawImage(done, 0, 0)

				pieces[faction][type] = stackedPiece.canvas
				pieces.done[faction][type] = stackedDone.canvas
			}
		}
	}

	let base = sprites.piece.base
		.getContext("2d")
		.getImageData(0, 0, 16, 16)

	pixels.replace(base, palette.black, palette.white)

	let flashing = Canvas(base.width, base.height)
	flashing.putImageData(base, 0, 0)
	pieces.flashing = flashing.canvas

	let flashingStacked = Canvas(base.width, base.height + 3)
	flashingStacked.putImageData(base, 0, 3)
	flashingStacked.drawImage(flashingStacked.canvas, 0, -3)
	pieces.flashingStacked = flashingStacked.canvas

	return pieces

	function Piece(icon, colors) {
		let base = sprites.piece.base
			.getContext("2d")
			.getImageData(0, 0, 16, 16)

		pixels.replace(base, palette.white, colors[1])
		pixels.replace(base, palette.black, colors[2])

		let piece = Canvas(base.width, base.height)
		piece.putImageData(base, 0, 0)

		let tmp = Canvas(8, 8)
		let template = icon.getContext("2d")
			.getImageData(0, 0, icon.width, icon.height)

		pixels.replace(template, palette.white, colors[0])
		tmp.putImageData(template, 0, 0)
		piece.drawImage(tmp.canvas, 4, 4)

		pixels.replace(template, colors[0], colors[2])
		tmp.putImageData(template, 0, 0)
		piece.drawImage(tmp.canvas, 4, 3)

		return piece.canvas
	}
}

function ui(sprites) {
	let ui = {
		cursor:    cursor(sprites.ui.cursor),
		typeface:  typeface(sprites.ui.typeface),
		healthbar: sprites.ui.healthbar,
		words:     words(sprites.ui.words),
		box:       box(sprites.ui.box),
		squares:   squares(sprites.ui.squares),
		arrows:    arrows(sprites.ui.arrows)
	}

	let coloredTypefaces = {}

	ui.Text = Text
	ui.Box = Box
	ui.TextBox = TextBox
	ui.HealthBar = HealthBar
	ui.UnitDetails = UnitDetails
	ui.UnitStats = UnitStats
	ui.StatsDelta = StatsDelta
	ui.Arrow = Arrow

	return ui

	function arrows(sheet) {
		return {
			left:      extract(sheet,  0,  0, 16, 16),
			right:     extract(sheet, 16,  0, 16, 16),
			up:        extract(sheet, 32,  0, 16, 16),
			down:      extract(sheet, 48,  0, 16, 16),
			leftStub:  extract(sheet,  0, 16, 16, 16),
			rightStub: extract(sheet, 16, 16, 16, 16),
			upStub:    extract(sheet, 32, 16, 16, 16),
			downStub:  extract(sheet, 48, 16, 16, 16),
			upLeft:    extract(sheet,  0, 32, 16, 16),
			upRight:   extract(sheet, 16, 32, 16, 16),
			downLeft:  extract(sheet, 32, 32, 16, 16),
			downRight: extract(sheet, 48, 32, 16, 16),
			horiz:     extract(sheet,  0, 48, 16, 16),
			vert:      extract(sheet, 16, 48, 16, 16)
		}
	}

	function squares(sheet) {
		return {
			move: square(palette.blue),
			attack: square(palette.red),
			fuse: square(palette.yellow)
		}

		function square(color) {
			let context = Canvas(16, 16)
			context.fillStyle = rgba(color)
			context.globalAlpha = 0.66
			context.fillRect(0, 0, 15, 15)
			return context.canvas
		}
	}

	function box(sheet) {
		return {
			topLeft:     extract(sheet,  0,  0, 16, 16),
			top:         extract(sheet, 16,  0, 16, 16),
			topRight:    extract(sheet, 32,  0, 16, 16),
			left:        extract(sheet,  0, 16, 16, 16),
			center:      extract(sheet, 16, 16, 16, 16),
			right:       extract(sheet, 32, 16, 16, 16),
			bottomLeft:  extract(sheet,  0, 32, 16, 16),
			bottom:      extract(sheet, 16, 32, 16, 16),
			bottomRight: extract(sheet, 32, 32, 16, 16)
		}
	}

	function words(sprites) {
		let playerPhase = Canvas(188, 18)
		render(playerPhase, sprites.player, palette.blue, 0)
		render(playerPhase, sprites.phase, palette.blue, 104)

		let enemyPhase = Canvas(170, 18)
		render(enemyPhase, sprites.enemy, palette.red, 0)
		render(enemyPhase, sprites.phase, palette.red, 90)

		return {
			playerPhase: playerPhase.canvas,
			enemyPhase: enemyPhase.canvas
		}

		function render(context, word, color, x) {
			let shadow = word
				.getContext("2d")
				.getImageData(0, 0, word.width, word.height)

			pixels.replace(shadow, palette.white, color)

			let temp = Canvas(word.width, word.height)
			temp.putImageData(shadow, 0, 0)

			context.drawImage(temp.canvas, x + 2, 2)
			context.drawImage(word, x, 0)
		}
	}

	function Text(content, color) {
		let width = 0
		for (let i = 0; i < content.length; i++) {
			let char = content[i]
			if (char === " ") {
				width += 4
			} else {
				width += 8
			}
		}

		let canvas = document.createElement("canvas")
		canvas.width = width
		canvas.height = 8

		let context = canvas.getContext("2d")
		for (let i = 0, x = 0; i < content.length; i++) {
			let char = content[i]
			if (char === " ") {
				x += 4
			} else {
				let sprite = Char(char, color)
				context.drawImage(sprite, x, 0)
				x += 8
			}
		}

		return canvas
	}

	function Char(char, color) {
		if (!color) {
			return ui.typeface[char]
		}

		if (coloredTypefaces[color]) {
			return coloredTypefaces[color][char]
		}

		let sprite = sprites.ui.typeface
		let image = sprite
			.getContext("2d")
			.getImageData(0, 0, sprite.width, sprite.height)

		pixels.replace(image, palette.white, color)

		let context = Canvas(sprite.width, sprite.height)
		context.putImageData(image, 0, 0)

		let chars = typeface(context.canvas)
		coloredTypefaces[color] = chars
		return chars[char]
	}

	function Box(width, height) {
		const cols = Math.ceil(width / 16)
		const rows = Math.ceil(height / 16)

		let canvas = document.createElement("canvas")
		let context = canvas.getContext("2d")
		canvas.width = width
		canvas.height = height

		for (let x = 1; x < cols - 1; x++) {
			context.drawImage(ui.box.top,    x * 16,           0)
			context.drawImage(ui.box.bottom, x * 16, height - 16)
		}

		for (let y = 1; y < rows - 1; y++) {
			// for (let x = 1; x < cols - 1; x++) {
			// 	context.drawImage(ui.box.center, x * 16, y * 16)
			// }
			context.drawImage(ui.box.left,           0, y * 16)
			context.drawImage(ui.box.right, width - 16, y * 16)
		}

		context.fillRect(4, 4, canvas.width - 8, canvas.height - 8)
		context.drawImage(ui.box.topLeft,                     0,                  0)
		context.drawImage(ui.box.topRight,    canvas.width - 16,                  0)
		context.drawImage(ui.box.bottomLeft,                  0, canvas.height - 16)
		context.drawImage(ui.box.bottomRight, canvas.width - 16, canvas.height - 16)

		return canvas
	}

	function TextBox(content) {
		let width = 0
		let height = 0
		let text = null
		if (Array.isArray(content)) {
			text = content.map(line => Text(line))
			let lengths = content.map(line => line.width)
			let longest = Math.max(...lengths)
			width = longest
			height = content.length * 8
		} else {
			text = Text(content)
			width = text.width
			height = 8
		}

		let box = Box(width + 16, height + 16)
		let context = Canvas(width, height)

		if (Array.isArray(content)) {
			for (let y = 0; y < text.length; y++) {
				let line = text[y]
				context.drawImage(line, 0, y * 8)
			}
		} else {
			context.drawImage(text, 0, 0)
		}

		if (context.canvas.width) {
			box.getContext("2d")
				.drawImage(context.canvas, 8, 8)
		}

		return box
	}

	function HealthBar(content, faction) {
		let colors = {
			player: { default: palette.cyan, dark: palette.blue  },
			enemy:  { default: palette.pink, dark: palette.red   },
			ally:   { default: palette.lime, dark: palette.green }
		}
		let context = Canvas(48, 8)
		context.drawImage(ui.healthbar, 0, 0)
		context.fillStyle = rgba(colors[faction].default)
		context.fillRect(3, 3, Math.min(42, content * 14), 2)
		if (content > 3) {
			context.fillStyle = rgba(colors[faction].dark)
			context.fillRect(3, 3, Math.min(42, (content - 3) * 14), 2)
		}
		return context.canvas
	}

	function UnitDetails(unit) {
		let icon = sprites.icons[icons.units[unit.type]]
		let name = Text(unit.name)
		let nameDialog = Box(name.width + icon.width + 20, 24)
		let context = nameDialog.getContext("2d")
		context.drawImage(icon, 8, 8)
		context.drawImage(name, 20, 8)

		let hpDialog = Box(84, 24)
		let bar = HealthBar(unit.hp, unit.faction)
		let label = Text("HP")
		context = hpDialog.getContext("2d")
		context.drawImage(label, 8, 8)
		context.drawImage(bar, 28, 8)

		return  {
			name: nameDialog,
			hp: hpDialog
		}
	}

	function UnitStats(unit, stats) {
		let box = Box(64, stats.length * 8 + 16)
			.getContext("2d")
		for (let i = 0; i < stats.length; i++) {
			let stat = stats[i]
			let value = Unit[stat](unit.type)
			let icon = stat === "atk"
				? icons.weapons[Unit.wpn(unit.type).type]
				: icons.stats[stat]
			box.drawImage(sprites.icons[icon], 8, i * 8 + 8)
			box.drawImage(Text(stat.toUpperCase()), 20, i * 8 + 8)
			box.drawImage(Text(value.toString()), 48, i * 8 + 8)
		}
		return box.canvas
	}

	function StatsDelta(delta) {
		let box = Box(32, delta.length * 8 + 16)
			.getContext("2d")
		for (let i = 0; i < delta.length; i++) {
			let value = delta[i]
			let sign = value >= 0 ? "+" : "-"
			let text = Text(sign + value)
			box.drawImage(text, 8, i * 8 + 8)
		}
		return box.canvas
	}

	function Arrow(path) {
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
						image: ui.arrows[direction],
						position: [ x, y ]
					})
				}
			}
		}
		return arrow
	}
}

function typeface(image) {
	const width = 8
	const height = 8
	const cols = image.width / width
	const rows = image.height / height
	const sequence =
		`0123456789` +
		`ABCDEFGHIJ` +
		`KLMNOPQRST` +
		`UVWXYZ,.!?` +
		`abcdefghij` +
		`klmnopqrst` +
		`uvwxyz;:'"` +
		`()/\\-+    `

	let typeface = {}
	let i = 0
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			let char = sequence[i++]
			typeface[char] = extract(image, x * width, y * height, width, height)
		}
	}

	return typeface
}

function cursor(image) {
	return {
		player: [
			extract(image,  0, 0, 16, 16),
			extract(image, 16, 0, 16, 16)
		],
		enemy: [
			extract(image,  0, 16, 16, 16),
			extract(image, 16, 16, 16, 16)
		]
	}
}
