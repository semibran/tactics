export { default as range } from "./range"

export function create(name, type, faction, ai, cell) {
	return {
		name: name,
		type: type,
		faction: faction,
		ai: ai,
		cell: cell,
		hp: 3,
		stats: stats[type],
		equipment: equipment[type]
	}
}

export function move(unit, goal, map) {
	unit.cell = goal
}

export function attack(unit, target) {
	let hit = acc(unit) - avo(target)
	if (hit < 0) {
		return 0 // miss!
	}
	let damage = atk(unit)
	if (weapon(unit).nature === "str") {
		damage -= def(target)
	} else if (weapon(unit).nature === "int") {
		damage -= res(target)
	}
	if (damage < 0) {
		damage = 0
	}
	target.hp -= damage
	return damage
}

export function allied(a, b) {
	return a.faction === b.faction
	    || a.faction === "player" && b.faction === "ally"
	    || a.faction === "ally" && b.faction === "player"
}

export function atk(unit) {
	let weapon = unit.equipment.weapon
	return unit.stats[weapon.target] + (weapon ? weapon.atk : 0)
}

export function acc(unit) {
	let weapon = unit.equipment.weapon
	return unit.stats.agi + (weapon ? weapon.acc : 0)
}

export function avo(unit) {
	let armor = unit.equipment.armor
	return unit.stats.agi - (!armor ? 0 : armor.wt)
}

export function def(unit) {
	let armor = unit.equipment.armor
	return unit.stats.str + (armor ? armor.def : 0)
}

export function res(unit) {
	let armor = unit.equipment.armor
	return unit.stats.int + (armor ? armor.def : 0)
}

export function mov(unit) {
	if (unit.ai === "defend") {
		return 0
	}
	let armor = unit.equipment.armor
	return 5
		- (!armor ? 0 : armor.wt)
		+ Math.floor(unit.stats.agi / 2)
}

export const stats = {
	warrior: { str: 2, int: 0, agi: 1 },
	knight:  { str: 1, int: 1, agi: 0 },
	rogue:   { str: 1, int: 1, agi: 2 },
	mage:    { str: 0, int: 2, agi: 1 }
}

export const weapons = {
	axe: {
		target: "str",
		atk: 3,
		acc: 0,
		rng: 1
	},
	lance: {
		target: "str",
		atk: 2,
		acc: 2,
		rng: 1
	},
	dagger: {
		target: "str",
		atk: 1,
		acc: 1,
		rng: 1
	},
	tome: {
		target: "int",
		atk: 1,
		acc: 1,
		rng: 2
	}
}

export const equipment = {
	warrior: { weapon: weapons.axe,    armor: null },
	knight:  { weapon: weapons.lance,  armor: { def: 2, wt: 1 } },
	rogue:   { weapon: weapons.dagger, armor: null },
	mage:    { weapon: weapons.tome,   armor: null }
}
