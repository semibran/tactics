export default function Canvas(width, height) {
	var canvas = document.createElement("canvas")
	canvas.width = Math.ceil(width)
	canvas.height = Math.ceil(height)
	return canvas.getContext("2d")
}
