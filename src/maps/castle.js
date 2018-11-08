let tiles = {
	grass: { name: "grass", solid: false },
	wall:  { name: "wall",  solid: true  },
	floor: { name: "floor", solid: false }
}

export default {
	layout: {
		size: [ 25, 25 ],
		data: (
			"#########################" +
			"#      ##.......##      #" +
			"#      ##.......##      #" +
			"#      ##.......##      #" +
			"#      ####...####      #" +
			"#      ####...####      #" +
			"#      ##.......##      #" +
			"#    ####.......####    #" +
			"#    ####.......####    #" +
			"#    ...............    #" +
			"#    ####.......####    #" +
			"#    ####.......####    #" +
			"#      ##.......##      #" +
			"#      ###########      #" +
			"#      ###########      #" +
			"#                       #" +
			"#                       #" +
			"#      ##       ##      #" +
			"#      ##       ##      #" +
			"#########       #########" +
			"#########       #########" +
			"                         " +
			"                         " +
			"                         " +
			"                         "
		)
			.split("")
			.map(c => {
				switch (c) {
					case " ": return tiles.grass
					case "#": return tiles.wall
					case ".": return tiles.floor
				}
			})
	},
	units: [
		[ "ROGUE",    "rogue",   "player", false,    [ 12, 20 ] ],
		[ "KNIGHT",   "knight",  "player", false,    [ 11, 16 ] ],
		[ "KNIGHT",   "knight",  "player", false,    [ 13, 16 ] ],
		[ "WARRIOR",  "warrior", "player", false,    [ 11, 18 ] ],
		[ "MAGE",     "mage",    "player", false,    [ 13, 18 ] ],
		[ "SORCERER", "mage",    "enemy",  "defend", [ 12,  1 ] ],
		[ "ORC",      "warrior", "enemy",  "wait",   [ 10,  2 ] ],
		[ "ORC",      "warrior", "enemy",  "wait",   [ 14,  2 ] ],
		[ "TROLL",    "knight",  "enemy",  "defend", [ 11,  4 ] ],
		[ "TROLL",    "knight",  "enemy",  "defend", [ 12,  4 ] ],
		[ "TROLL",    "knight",  "enemy",  "defend", [ 13,  4 ] ],
		[ "TROLL",    "knight",  "enemy",  "defend", [  5,  9 ] ],
		[ "TROLL",    "knight",  "enemy",  "defend", [ 19,  9 ] ],
		[ "ORC",      "warrior", "enemy",  "wait",   [ 13, 12 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "wait",   [ 11, 11 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "wait",   [ 12,  9 ] ],
		[ "ORC",      "warrior", "enemy",  "wait",   [ 13,  7 ] ],
		[ "ORC",      "warrior", "enemy",  "attack", [  0, 23 ] ],
		[ "TROLL",    "knight",  "enemy",  "attack", [  1, 21 ] ],
		[ "ORC",      "warrior", "enemy",  "attack", [ 24, 22 ] ],
		[ "TROLL",    "knight",  "enemy",  "attack", [ 22, 23 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "wait",   [  3, 13 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "wait",   [ 21, 13 ] ],
		[ "ORC",      "warrior", "enemy",  "attack", [  2, 18 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "attack", [  2,  4 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "attack", [ 20,  3 ] ],
		[ "GOBLIN",   "rogue",   "enemy",  "wait",   [ 23, 14 ] ],
	]
}
