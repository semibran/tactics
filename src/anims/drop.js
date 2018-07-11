function drop(height) {
	return { height: Math.round(height || 4) }
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	if (!--data.height) {
		anim.done = true
	}
}

drop.update = update
export default drop
