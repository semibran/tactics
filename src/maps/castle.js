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
		[ "Rogue",     "rogue",   "player", false,    [ 12, 20 ] ],
		[ "Knight",    "knight",  "player", false,    [ 11, 16 ] ],
		[ "Knight",    "knight",  "player", false,    [ 13, 16 ] ],
		[ "Warrior",   "warrior", "player", false,    [ 11, 18 ] ],
		[ "Mage",      "mage",    "player", false,    [ 13, 18 ] ],
		[ "Alchemist", "mage",    "enemy",  "defend", [ 12,  1 ] ],
		[ "Orc",       "warrior", "enemy",  "wait",   [ 10,  2 ] ],
		[ "Orc",       "warrior", "enemy",  "wait",   [ 14,  2 ] ],
		[ "Troll",     "knight",  "enemy",  "defend", [ 11,  4 ] ],
		[ "Troll",     "knight",  "enemy",  "defend", [ 12,  4 ] ],
		[ "Troll",     "knight",  "enemy",  "defend", [ 13,  4 ] ],
		[ "Troll",     "knight",  "enemy",  "defend", [  5,  9 ] ],
		[ "Troll",     "knight",  "enemy",  "defend", [ 19,  9 ] ],
		[ "Orc",       "warrior", "enemy",  "wait",   [ 13, 12 ] ],
		[ "Goblin",    "rogue",   "enemy",  "wait",   [ 11, 11 ] ],
		[ "Goblin",    "rogue",   "enemy",  "wait",   [ 12,  9 ] ],
		[ "Orc",       "warrior", "enemy",  "wait",   [ 13,  7 ] ],
		[ "Orc",       "warrior", "enemy",  "attack", [  0, 23 ] ],
		[ "Troll",     "knight",  "enemy",  "attack", [  1, 21 ] ],
		[ "Orc",       "warrior", "enemy",  "attack", [ 24, 22 ] ],
		[ "Troll",     "knight",  "enemy",  "attack", [ 22, 23 ] ],
		[ "Goblin",    "rogue",   "enemy",  "wait",   [  3, 13 ] ],
		[ "Goblin",    "rogue",   "enemy",  "wait",   [ 21, 13 ] ],
		[ "Orc",       "warrior", "enemy",  "attack", [  2, 18 ] ],
		[ "Goblin",    "rogue",   "enemy",  "attack", [  2,  4 ] ],
		[ "Goblin",    "rogue",   "enemy",  "attack", [ 20,  3 ] ],
		[ "Goblin",    "rogue",   "enemy",  "wait",   [ 23, 14 ] ],
	]
}
