export function create(options, index) {
	return {
		options: options,
		index: index || 0,
		done: false
	}
}

export function update(menu, keys) {
	let { held, prev } = keys
	if (held.confirm && !prev.confirm) {
		menu.done = true
	}
	if (!menu.done) {
		if (held.select && !prev.select) {
			cycle(menu, held.mod)
		} else if (held.up && !prev.up && !held.down) {
			cycle(menu, true)
		} else if (held.down && !prev.down && !held.up) {
			cycle(menu)
		}
	}
}

export function cycle(menu, reverse) {
	if (reverse) {
		if (--menu.index < 0) {
			menu.index = menu.options.length - 1
		}
	} else if (++menu.index >= menu.options.length) {
		menu.index = 0
	}
}
