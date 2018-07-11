function move(path) {
	return {
		path: path,
		cell: path[0].slice(),
		time: 0
	}
}

function update(anim) {
	if (anim.done) return false
	let data = anim.data
	let index = Math.floor(data.time / 4)
	let mod = data.time % 4 * 0.25
	let cell = data.path[index]
	let next = data.path[index + 1]
	if (next) {
		data.cell = [
			cell[0] + (next[0] - cell[0]) * mod,
			cell[1] + (next[1] - cell[1]) * mod
		]
	} else {
		data.cell = cell.slice()
		anim.done = true
	}

	data.time++
	return true
}

move.update = update
export default move
