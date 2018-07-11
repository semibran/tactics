function lift() {
	return { height: 0 }
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	if (++data.height === 4) {
		anim.done = true
	}
}

lift.update = update
export default lift
