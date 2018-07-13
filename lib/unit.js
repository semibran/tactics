export { default as range } from "./range"

export function create(type, faction, ai, cell) {
	return {
		type: type,
		faction: faction,
		ai: ai,
		cell: cell,
		hp: 3
	}
}

export function attack(unit, target) {
	if (unit.type === "warrior") {
		if (target.type === "warrior") {
			target.hp -= 2
		} else if (target.type === "knight") {
			target.hp -= 2
		} else if (target.type === "rogue") {
			return
		} else if (target.type === "mage") {
			target.hp -= 3
		}
	} else if (unit.type === "knight") {
		if (target.type === "warrior") {
			target.hp -= 2
		} else if (target.type === "knight") {
			target.hp -= 1
		} else if (target.type === "rogue") {
			target.hp -= 2
		} else if (target.type === "mage") {
			target.hp -= 2
		}
	} else if (unit.type === "rogue") {
		if (target.type === "warrior") {
			target.hp -= 2
		} else if (target.type === "knight") {
			return
		} else if (target.type === "rogue") {
			target.hp -= 1
		} else if (target.type === "mage") {
			target.hp -= 2
		}
	} else if (unit.type === "mage") {
		if (target.type === "warrior") {
			target.hp -= 2
		} else if (target.type === "knight") {
			target.hp -= 1
		} else if (target.type === "rogue") {
			target.hp -= 2
		} else if (target.type === "mage") {
			target.hp -= 1
		}
	}
	if (target.hp < 0) {
		target.hp = 0
	}
}

export function str(unit) {
	switch (unit.type) {
		case "warrior": return 3
		case "knight":  return 2
		case "rogue":   return 1
		case "mage":    return 0
	}
}

export function int(unit) {
	switch (unit.type) {
		case "warrior": return 0
		case "knight":  return 2
		case "rogue":   return 1
		case "mage":    return 3
	}
}

export function agi(unit) {
	switch (unit.type) {
		case "warrior": return 2
		case "knight":  return 0
		case "rogue":   return 3
		case "mage":    return 1
	}
}

export function mov(unit) {
	switch (unit.type) {
		case "warrior": return 4
		case "knight":  return 3
		case "rogue":   return 7
		case "mage":    return 4
	}
}

export function rng(unit) {
	switch (unit.type) {
		case "warrior": return 1
		case "knight":  return 1
		case "rogue":   return 1
		case "mage":    return 2
	}
}

export function allied(a, b) {
	return a.faction === b.faction
	    || a.faction === "player" && b.faction === "ally"
	    || a.faction === "ally" && b.faction === "player"
}
