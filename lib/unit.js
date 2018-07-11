export function create(type, faction, cell) {
	return {
		type: type,
		faction: faction,
		cell: cell,
		hp: 3
	}
}

export function attack(unit, target) {
	target.hp = Math.max(0, target.hp - 2)
}

export function mov(unit) {
	switch (unit.type) {
		case "warrior": return 4
		case "knight":  return 3
		case "rogue":   return 7
		case "mage":    return 4
	}
}

export function allied(a, b) {
	return a.faction === b.faction
	    || a.faction === "player" && b.faction === "ally"
	    || a.faction === "ally" && b.faction === "player"
}
