/**
 * @param {Page} page
 * @param {String} selector
 * @param {Object} style
 * @return {Promise<void>}
 */
module.exports.setDOMElementsStyle = async ({page, selector, style}) => {
  await page.evaluate((sel, style) => {
    var elements = document.querySelectorAll(sel)
    for (var i = 0; i < elements.length; i++) {
      Object.keys(style).forEach(key => {
        elements[i].style[key] = style[key]
      })
    }
  }, selector, style)
}

/**
 * @param {Page} page
 * @param {String} selector
 * @return {Promise<void>}
 */
module.exports.hideDOMElements = async ({page, selector}) => {
  await page.evaluate((sel) => {
    var elements = document.querySelectorAll(sel)
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.display = 'none'
    }
  }, selector)
}

/**
 * @param {Page} page
 * @param {String} selector
 * @return {Promise<void>}
 */
module.exports.removeDOMElement = async ({page, selector}) => {
  await page.evaluate((sel) => {
    var elements = document.querySelectorAll(sel)
    for (var i = 0; i < elements.length; i++) {
      elements[i].parentNode.removeChild(elements[i])
    }
  }, selector)
}

/**
 * @param {Page} page
 * @param {String} selector
 * @param {Number} [containerSelector]
 * @param {String} [path]
 * @param {String} [encoding]
 * @param {Number} [padding]
 * @param {{left: Number, top: Number, size: Number}} [clip]
 * @return {Promise<String|Buffer>}
 */
module.exports.screenshotDOMElement = async ({page, selector, path, encoding, padding = 0, clip = {left: 0, top: 0, size: 0}, containerSelector}) => {
  const rect = await page.evaluate((selector, containerSelector) => {
    let scrollTop = 0

    if (containerSelector) {
      scrollTop = document.querySelector(containerSelector).scrollTop
    }

    const element = document.querySelector(selector)
    const {x, y, width, height} = element.getBoundingClientRect()

    return {left: x, top: y + scrollTop, width, height, id: element.id}
  }, selector, containerSelector)

  const image = await page.screenshot({
    path,
    encoding,
    clip: {
      x: (rect.left + clip.left) - padding,
      y: (rect.top + clip.top) - padding,
      width: (clip.size || rect.width) + (padding * 2),
      height: (clip.size || rect.height) + (padding * 2)
    },
    omitBackground: true,
  })

  if (image && encoding === 'base64') {
    return `data:image/png;base64,${image}`
  }
  else if (path) {
    return path
  }
  else {
    return image
  }
}

/**
 * @param {Page} page
 * @param {String} selector
 * @return {Promise<Number>}
 */
module.exports.getSelectedElementIndex = async ({page, selector}) => {
  return await page.evaluate((sel) => {
    var elements = document.querySelectorAll(sel)

    for (var i = 0; i < elements.length; i++) {
      if (elements[i].classList.contains('selected')) {
        return i
      }
    }

    return -1
  }, selector)
}

module.exports.roundNumber = (num) => {
  return Math.round(num * 10) / 10
}
