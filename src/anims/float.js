function float(piece) {
	return {
		height: 4,
		time: 0
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	data.time++

	let duration = 120
	let progress = data.time % duration / duration
	data.height = 4 + Math.sin(2 * Math.PI * progress)
}

float.update = update
export default float
