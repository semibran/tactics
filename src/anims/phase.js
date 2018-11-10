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
	if (time > 10 && time <= 30) {
		data.state = "enter"
		let progress = (time - 10) / 20
		let radians = Math.sin(Math.PI / 2 * progress)
		text.x = radians
	} else if (time > 30 && time <= 45) {
		data.state = "pass"
		text.x = (time - 30) / 15
	} else if (time > 45 && time <= 65) {
		data.state = "exit"
		let progress = (time - 45) / 20
		let radians = 1 - Math.sin(Math.PI / 2 + Math.PI / 2 * progress)
		text.x = radians
	}

	if (time <= 45) {
		if (bg.width < 1) {
			bg.width += 1 / 16
		} else if (bg.height < 1) {
			bg.height += 1 / 10
		}
	} else {
		if (bg.height > 0) {
			bg.height -= 1 / 10
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
