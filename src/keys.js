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
	left:    [ "KeyA", "ArrowLeft"  ],
	up:      [ "KeyW", "ArrowUp"    ],
	right:   [ "KeyD", "ArrowRight" ],
	down:    [ "KeyS", "ArrowDown"  ],
	confirm: [ "Space", "Enter" ],
	cancel:  [ "Escape", "Backspace" ],
	select:  [ "Tab" ],
	mod:     [ "ShiftLeft" ]
}
