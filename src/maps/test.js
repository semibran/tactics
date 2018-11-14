const i = Infinity
const s = 0.5

export default {
	id: "test",
	layout: {
		size: [ 8, 8 ],
		data: [
			2, 2, 2, 2, 2, 2, 2, 2,
			2, 2, 2, 1, 1, 2, 2, 2,
			2, 2, 2, 0, 0, i, 2, 2,
			2, 2, 2, 0, 0, i, 2, 2,
			i, i, i, 0, 0, 0, i, i,
			i, i, i, 0, 0, 0, i, i,
			0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0
		]
	},
	units: [
		[ "Hector", "warrior", "player", false,    [ 4, 6 ] ],
		[ "Nergal", "mage",    "enemy",  "defend", [ 1, 2 ] ],
	]
}
