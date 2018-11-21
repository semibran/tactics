import { weapons, armor } from "./equipment"

export { default as range } from "./range"

export function create(name, type, faction, ai, cell) {
	return {
		name: name,
		type: type,
		faction: faction,
		ai: ai,
		cell: cell,
		hp: promoted(type) ? 6 : 3
	}
}

export function allied(a, b) {
	return a.faction === b.faction
	    || a.faction === "player" && b.faction === "ally"
	    || a.faction === "ally" && b.faction === "player"
}

export function promoted(type) {
	return !promotions[type]
}

export function move(unit, goal, map) {
	unit.cell = goal
	return true
}

export function fuse(unit, target) {
	if (unit.type !== target.type) return false
	unit.type = promotions[unit.type]
	unit.cell = target.cell.slice()
	unit.hp += target.hp
	target.hp = 0
	return true
}

export function attack(unit, target) {
	let damage = dmg(unit, target)
	target.hp -= Math.min(target.hp, damage)
	return damage
}

export function dmg(unit, target) {
	if (hit(unit.type) - avo(target.type) < 0) {
		return null // miss!
	}
	let damage = atk(unit.type)
	let stat = wpn(unit.type).stat
	if (stat === "str") {
		damage -= def(target.type)
	} else if (stat === "int") {
		damage -= res(target.type)
	}
	if (damage < 0) {
		damage = 0 // damage cannot be negative
	} else if (damage > 3) {
		damage = 3 // damage cannot be greater than 3
	}
	return damage
}

export function str(type) {
	return stats[type].str
}

export function int(type) {
	return stats[type].int
}

export function agi(type) {
	return stats[type].agi
}

export function atk(type) {
	let weapon = wpn(type)
	return stats[type][weapon ? weapon.stat : "str"]
		+ (weapon ? weapon.atk : 0)
}

export function def(type) {
	let armor = arm(type)
	return armor ? armor.def : 0
}

export function res(type) {
	return int(type) + def(type)
}

export function hit(type) {
	let weapon = wpn(type)
	return agi(type) + (weapon ? weapon.hit : 0)
}

export function avo(type) {
	let armor = arm(type)
	return agi(type) - (!armor ? 0 : armor.wt)
}

export function mov(type) {
	let armor = arm(type)
	let wt = armor ? armor.wt : 0
	return 5 + Math.floor(agi(type) / 3 - wt / 2)
}

export function rng(type) {
	return wpn(type).rng
}

export function wpn(type) {
	return equipment[type].weapon
}

export function arm(type) {
	return equipment[type].armor
}

export const stats = {
	fighter:   { str: 2, int: 0, agi: 1 },
	knight:    { str: 1, int: 0, agi: 1 },
	thief:     { str: 1, int: 1, agi: 2 },
	mage:      { str: 1, int: 1, agi: 1 },
	berserker: { str: 3, int: 0, agi: 2 },
	general:   { str: 2, int: 0, agi: 2 },
	assassin:  { str: 2, int: 1, agi: 3 },
	sorcerer:  { str: 1, int: 2, agi: 2 }
}

export const equipment = {
	fighter:   { weapon: weapons.axe,    armor: armor.leather },
	knight:    { weapon: weapons.lance,  armor: armor.mail   },
	thief:     { weapon: weapons.dagger, armor: armor.leather },
	mage:      { weapon: weapons.tome,   armor: armor.leather },
	berserker: { weapon: weapons.axe,    armor: armor.leather },
	general:   { weapon: weapons.lance,  armor: armor.plate   },
	assassin:  { weapon: weapons.dagger, armor: armor.leather },
	sorcerer:  { weapon: weapons.tome,   armor: armor.leather }
}

export const promotions = {
	fighter: "berserker",
	knight: "general",
	thief: "assassin",
	mage: "sorcerer"
}
