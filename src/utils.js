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
 * @param {String} [path]
 * @param {String} [encoding]
 * @param {Number} [padding]
 * @return {Promise<String|Buffer>}
 */
module.exports.screenshotDOMElement = async ({page, selector, path, encoding, padding = 0}) => {
  const rect = await page.evaluate(selector => {
    const element = document.querySelector(selector)
    const {x, y, width, height} = element.getBoundingClientRect()
    return {left: x, top: y, width, height, id: element.id}
  }, selector)

  const image = await page.screenshot({
    path,
    encoding,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
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
