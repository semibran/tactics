exports.get = get
exports.set = set
exports.replace = replace

function get(image, x, y) {
  var i = (y * image.width + x) * 4
  var r = image.data[i]
  var g = image.data[i + 1]
  var b = image.data[i + 2]
  var a = image.data[i + 3]
  return [ r, g, b, a ]
}

function set(image, x, y, color) {
  var i = (y * image.width + x) * 4
  image.data[i + 0] = color[0]
	image.data[i + 1] = color[1]
	image.data[i + 2] = color[2]
	image.data[i + 3] = color[3]
}

function replace(image, oldColor, newColor) {
  for (var i = 0; i < image.data.length; i += 4) {
    for (var c = 0; c < 4; c++) {
      if (image.data[i + c] !== oldColor[c]) {
        break
      }
    }

    if (c !== 4) {
      continue
    }

    for (var c = 0; c < 4; c++) {
      image.data[i + c] = newColor[c]
    }
  }
}
