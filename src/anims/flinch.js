function flinch() {
	return {
		time: 0,
		flashing: false
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	data.flashing = !data.flashing
	if (++data.time === 15) {
		anim.done = true
	}
}

flinch.update = update
export default flinch
