import listen from "key-state"

export function create(element) {
	return {
		held: listen(element, controls),
		prev: {}
	}
}

export function update(keys) {
	Object.assign(keys.prev, keys.held)
}

export const controls = {
	left:    [ "KeyA" ],
	up:      [ "KeyW" ],
	right:   [ "KeyD" ],
	down:    [ "KeyS" ],
	confirm: [ "Space" ],
	cancel:  [ "Escape" ],
	select:  [ "Tab" ]
}
