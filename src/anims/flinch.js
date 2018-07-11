function flinch() {
	return {
		time: 0,
		offset: [ 0, 0 ]
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	data.offset = [ Math.round(Math.random() * 2 - 1), 0 ]
	if (++data.time === 10) {
		anim.done = true
	}
}

flinch.update = update
export default flinch
