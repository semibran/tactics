function fuse(unit, target) {
	let src = unit.cell.slice()
	let dest = target.cell.slice()
	let disp = [ dest[0] - src[0], dest[1] - src[1] ]
	let dist = Math.sqrt(disp[0] * disp[0] + disp[1] * disp[1])
	let norm = [ disp[0] / dist, disp[1] / dist ]
	return {
		unit: unit,
		target: target,
		src: src,
		norm: norm,
		cell: src.slice(),
		height: 0,
		time: 0,
		hovering: false
	}
}

function update(anim) {
	if (anim.done) return
	let data = anim.data
	if (data.time <= 8) {
		data.cell[0] = data.src[0] + data.norm[0] / 8 * data.time
		data.cell[1] = data.src[1] + data.norm[1] / 8 * data.time
		data.height += 2
	} else {
		data.hovering = true
		if (data.time > 20 && data.time < 30) {
			data.height = Math.max(3, data.height - 4)
		}
	}

	if (++data.time === 25) {
		anim.done = true
	}
}

fuse.update = update
export default fuse
