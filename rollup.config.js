import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import json from "rollup-plugin-json"

export default {
	output: { name: "app" },
	plugins: [ resolve(), commonjs(), json() ]
}
