export default function Canvas(width, height) {
	var canvas = document.createElement("canvas")
	canvas.width = width
	canvas.height = height
	return canvas.getContext("2d")
}
