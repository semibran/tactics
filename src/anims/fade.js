function fade() {
	return {
		time: 0,
		visible: true
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	data.visible = !data.visible
	if (++data.time === 30) {
		anim.done = true
	}
}

fade.update = update
export default fade
