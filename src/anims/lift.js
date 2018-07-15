function lift() {
	return {
		height: 0,
		time: 0,
		floating: false
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	data.time++

	if (!anim.floating) {
		if (++data.height === 4) {
			anim.floating = true
		}
	} else {
		let duration = 120
		let progress = data.time % duration / duration
		data.height = 4 + Math.sin(2 * Math.PI * progress)
	}
}

lift.update = update
export default lift
