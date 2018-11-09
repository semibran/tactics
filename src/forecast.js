export function update(forecast, keys) {
	let { held, prev } = keys
	if (held.select && !prev.select) {
		cycle(forecast, held.mod)
	} else if (held.left && !prev.left && !held.right) {
		cycle(forecast, true)
	} else if (held.right && !prev.right && !held.left) {
		cycle(forecast)
	} else if (held.up && !prev.up && !held.down) {
		cycle(forecast, true)
	} else if (held.down && !prev.down && !held.up) {
		cycle(forecast)
	}
}

export function target(forecast) {
	return forecast.targets[forecast.index]
}

export function cycle(forecast, reverse) {
	if (reverse) {
		if (--forecast.index < 0) {
			forecast.index = forecast.targets.length - 1
		}
	} else if (++forecast.index >= forecast.targets.length) {
		forecast.index = 0
	}
}
