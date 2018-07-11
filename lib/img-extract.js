export default function extract(image, x, y, width, height) {
	var canvas = document.createElement("canvas")
	var context = canvas.getContext("2d")
	canvas.width = width
	canvas.height = height
	context.drawImage(image, -x, -y)
	return canvas
}
