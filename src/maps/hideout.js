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
			"        #   ###..###",
			"        # #####...##",
			"      ##  ###.#...# ",
			"      ##  #.......# ",
			"          ....##### ",
			"#         ##..##### ",
			"#    #    #####     ",
			"     #     ####     ",
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
		[ "Hector",  "warrior", "player", false,    [  5, 16 ] ],
		[ "Oswin",   "knight",  "player", false,    [  6, 14 ] ],
		[ "Erk",     "mage",    "player", false,    [  4, 13 ] ],
		[ "Matthew", "rogue",   "player", false,    [  3, 15 ] ],
		[ "Nergal",  "mage",    "enemy",  "defend", [ 15,  1 ] ],
		[ "GOLEM",   "knight",  "enemy",  "wait",   [ 13,  2 ] ],
		[ "GOLEM",   "knight",  "enemy",  "wait",   [ 17,  1 ] ],
		[ "TROLL",   "knight",  "enemy",  "defend", [ 15,  4 ] ],
		[ "TROLL",   "knight",  "enemy",  "defend", [ 16,  4 ] ],
		[ "ORC",     "warrior", "enemy",  "attack", [ 17,  5 ] ],
		[ "TROLL",   "knight",  "enemy",  "defend", [ 10,  8 ] ],
		[ "GOBLIN",  "rogue",   "enemy",  "attack", [  8,  6 ] ],
		[ "ORC",     "warrior", "enemy",  "attack", [  5,  8 ] ],
		[ "TROLL",   "knight",  "enemy",  "attack", [  2,  6 ] ],
		[ "GOBLIN",  "rogue",   "enemy",  "attack", [  9, 12 ] ],
		[ "ORC",     "warrior", "enemy",  "attack", [  7, 12 ] ],
		[ "TROLL",   "knight",  "enemy",  "attack", [ 19,  6 ] ],
		[ "TROLL",   "knight",  "enemy",  "attack", [ 19,  7 ] ],
		[ "TROLL",   "knight",  "enemy",  "attack", [  0,  0 ] ],
		[ "TROLL",   "knight",  "enemy",  "attack", [  0,  1 ] ]
	]
}
