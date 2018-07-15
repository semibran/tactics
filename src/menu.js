export function create(options, index) {
	return {
		options: options,
		index: index || 0,
		selection: false
	}
}

export function update(menu, keys) {
	let { held, prev } = keys
	if (held.confirm && !prev.confirm) {
		menu.selection = menu.options[menu.index]
	}
	if (!menu.selection) {
		if (held.up && !prev.up && !held.down) {
			if (--menu.index < 0) {
				menu.index = 0
			}
		}
		if (held.down && !prev.down && !held.up) {
			let max = menu.options.length - 1
			if (++menu.index > max) {
				menu.index = max
			}
		}
	}
}
