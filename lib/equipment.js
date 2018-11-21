const axe = {
	type: "axe",
	stat: "str",
	atk: 2,
	hit: 0,
	rng: 1
}

const lance = {
	type: "lance",
	stat: "str",
	atk: 2,
	hit: 1,
	rng: 1
}

const dagger = {
	type: "dagger",
	stat: "str",
	atk: 1,
	hit: 1,
	rng: 1
}

const tome = {
	type: "tome",
	stat: "int",
	atk: 2,
	hit: 1,
	rng: 2
}

const leather = {
	def: 1,
	wt: 0
}

const mail = {
	def: 2,
	wt: 1
}

const plate = {
	def: 3,
	wt: 1
}

export const weapons = { axe, lance, dagger, tome }
export const armor = { leather, mail, plate }
