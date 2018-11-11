const grass = { name: "grass", solid: false }
const floor = { name: "floor", solid: false }
const wall  = { name: "wall",  solid: true  }

export default {
	tiles: { grass, floor, wall },
	layout: {
		size: [ 20, 20 ],
		data: [
			"           #########",
			"       ##  #......##",
			" #     ##  ##......#",
			" #         ##....###",
			"            ###..###",
			"          #####...##",
			"      ##  ###.#...# ",
			"      ##  #.......# ",
			"          ....##### ",
			"#         #...##### ",
			"#    #    #####     ",
			"     #    #####     ",
			"                    ",
			"                    ",
			"        ##    #     ",
			"        ##    #     ",
			" #               ## ",
			" ##    #         ## ",
			" ##    #            ",
			"                    ",
		]
			.join("")
			.split("")
			.map(char => {
				switch (char) {
					case " ": return grass
					case ".": return floor
					case "#": return wall
				}
			})
	},
	units: [
		[ "Hector", "warrior", "player", false,    [ 15,  4 ] ],
		[ "Nergal", "mage",    "enemy",  "defend", [ 15,  1 ] ],
	]
}
