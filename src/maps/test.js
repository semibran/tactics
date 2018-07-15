const grass = { name: "grass", solid: false }
const wall  = { name: "wall",  solid: true  }

export default {
	layout: {
		size: [ 12, 12 ],
		data: [
			"############",
			"#      #   #",
			"#          #",
			"#      #   #",
			"#      #####",
			"#      #####",
			"#          #",
			"#          #",
			"#          #",
			"#          #",
			"#          #",
			"############"
		]
			.join("")
			.split("")
			.map(char => {
				switch (char) {
					case " ": return grass
					case "#": return wall
				}
			})
	},
	units: [
		[ "Mage", "mage",    "player", false,    [ 4, 5 ] ],
		[ "Orc",  "warrior", "enemy",  "attack", [ 7, 6 ] ]
	]
}
