const floor = { name: "floor", solid: false }
const wall  = { name: "wall",  solid: true  }

export default {
	layout: {
		size: [ 12, 12 ],
		data: [
			"############",
			"#......#...#",
			"#..........#",
			"#......#...#",
			"#......#####",
			"#......#####",
			"#..........#",
			"#..........#",
			"#..........#",
			"#..........#",
			"#..........#",
			"############"
		]
			.join("")
			.split("")
			.map(char => {
				switch (char) {
					case ".": return floor
					case "#": return wall
				}
			})
	},
	units: [
		[ "MAGE",   "mage",    "player", false,    [ 4, 5 ] ],
		[ "KNIGHT", "knight",  "player", false,    [ 5, 8 ] ],
		[ "ORC",    "warrior", "enemy",  "attack", [ 7, 6 ] ],
		[ "GOBLIN", "rogue",   "enemy",  "attack", [ 7, 7 ] ]
	]
}
