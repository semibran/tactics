function phase() {
	return {
		time: 0,
		state: "enter",
		text: { x: 0 },
		bg: { x: 0, width: 0, height: 0 }
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	let time = data.time
	let text = data.text
	let bg = data.bg
	if (time > 10 && time <= 25) {
		data.state = "enter"
		let progress = (time - 10) / 15
		let radians = Math.sin(Math.PI / 2 * progress)
		text.x = radians
	} else if (time > 25 && time <= 40) {
		data.state = "pass"
		text.x = (time - 25) / 15
	} else if (time > 40 && time <= 55) {
		data.state = "exit"
		let progress = (time - 40) / 15
		let radians = 1 - Math.sin(Math.PI / 2 + Math.PI / 2 * progress)
		text.x = radians
	}

	if (time <= 40) {
		if (bg.width < 1) {
			bg.width += 1 / 16
		} else if (bg.height < 1) {
			let progress = (time - 16) / 8
			let radians = Math.sin(Math.PI / 2 * progress)
			bg.height = radians
		}
	} else {
		if (bg.height > 0) {
			bg.height -= 1 / 8
		} else if (bg.x < 1) {
			bg.x += 1 / 16
		}
	}

	if (++data.time === 65) {
		anim.done = true
	}
}

phase.update = update
export default phase
