function attack(src, dest) {
	let disp = [ dest[0] - src[0], dest[1] - src[1] ]
	let dist = Math.sqrt(disp[0] * disp[0] + disp[1] * disp[1])
	let norm = [ disp[0] / dist, disp[1] / dist ]
	return {
		src: src,
		norm: norm,
		cell: src.slice(),
		time: 0
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	let steps = data.time <= 4
		? data.time
		: 4 - (data.time - 4)

	data.cell[0] = data.src[0] + data.norm[0] / 8 * steps
	data.cell[1] = data.src[1] + data.norm[1] / 8 * steps

	if (++data.time === 9) {
		anim.done = true
	}
}

attack.update = update
export default attack
