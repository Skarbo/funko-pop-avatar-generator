const path = require('path')
const puppeteer = require('puppeteer')
const md5 = require('md5')

const Utils = require('./utils')

const URL = 'https://www.funko.com/pop-yourself/designer'

const DEFAULT_SIZE = 400
const MAX_BODY_INDEX = 7
const MAX_SKIN_INDEX = 11
const BODY_MAN_INDEX = 3

const SELECTOR_AVATAR_BUTTON_UNDO = '.avatar .button'
const SELECTOR_AVATAR = '.avatar'
const SELECTOR_BUTTON_RANDOMIZE = '.avatar-ctas .faux-link'
const SELECTOR_AVATAR_BODIES = '.tabContent .paginateParts.body .partTile'
const SELECTOR_AVATAR_BODY_SKINS = '.tabContent .paginateParts.body .partTile.selected .partBack div'
const SELECTOR_AVATAR_SELECT_BODY_AND_SKIN = '.tabContent .paginateParts.body .partTile:nth-child(%) .partBack div:nth-child(%)'
const SELECTOR_AVATAR_IMAGES = '.avatar img'

const REQUEST_AVATAR_IMAGE = 'pyimg'
const REQUESTS_ACCEPTED = [
  'pop-yourself/designer',
  'static/css',
  'static/js',
  'api',
  REQUEST_AVATAR_IMAGE,
  'data:image/png',
]

/**
 * @typedef {Object} AvatarGenerator
 * @property {AvatarGenerator.Options} options
 * @property {Array<AvatarGenerator.Avatar>} avatars
 * @property {AvatarGenerator.Avatar} _originalAvatar
 * @property {AvatarGenerator.BrowserInstance} _browserInstance
 */

/**
 * @typedef {Object} AvatarGenerator.Options
 * @property {Number} [number=1]
 * @property {Boolean} [removeAccessories=false]
 * @property {Boolean} [onlyHead=false]
 * @property {Number} [size]
 * @property {Number} [bodyIndex=undefined]
 * @property {Number} [skinIndex=undefined]
 * @property {String} [folder]
 * @memberOf AvatarGenerator
 */

/**
 * @typedef {Object} AvatarGenerator.BrowserInstance
 * @property {Browser} browser
 * @property {Page} page
 * @property {Array<String>} acceptedRequests
 * @property {Array<String>} blockedRequests
 * @property {Array<String>} requestedAvatarImages
 * @memberOf AvatarGenerator
 */

/**
 * @typedef {Object} AvatarGenerator.Avatar
 * @property {String} id
 * @property {String} image
 * @property {String} sex
 * @property {Number} bodyIndex
 * @property {Number} skinIndex
 * @property {Object} features
 * @memberOf AvatarGenerator
 */

/**
 * @param {AvatarGenerator} avatarGenerator
 * @return {Promise<{bodyIndex: Number, skinIndex: Number}>}
 */
async function getSelectedBodyAndSkinIndex ({avatarGenerator}) {
  const page = avatarGenerator._browserInstance.page

  return {
    bodyIndex: await Utils.getSelectedElementIndex({page, selector: SELECTOR_AVATAR_BODIES}),
    skinIndex: await Utils.getSelectedElementIndex({page, selector: SELECTOR_AVATAR_BODY_SKINS}),
  }
}

/**
 * @param {AvatarGenerator} avatarGenerator
 * @param {AvatarGenerator.Options} [options]
 * @return {Promise<Object>}
 */
async function getAvatarFeatures ({avatarGenerator, options = {}}) {
  const page = avatarGenerator._browserInstance.page

  const avatarImages = await page.$$eval(SELECTOR_AVATAR_IMAGES, images => images.map(img => img.outerHTML))

  const features = {
    accessories: [],
  }

  avatarImages.forEach(img => {
    if (/display: none/.test(img)) {
      return
    }

    const [sex, part, feature] = (img.match(/pyimg\/(\w+)\/(\w+)\/(.*?)\.png/) || [null, null, null, null]).slice(1)
    const [accessory] = (img.match(/pyimg\/(?:accessories|accessory)\/(.*?)\.png/) || [null, null]).slice(1)

    if (sex) {
      if (!features[sex]) {
        features[sex] = {}
      }
      if (!features[sex][part]) {
        features[sex][part] = []
      }

      features[sex][part].push(feature)
    }
    else if (accessory) {
      features.accessories.push(accessory)
    }
  })

  return features
}

/**
 * @param {AvatarGenerator} avatarGenerator
 * @param {AvatarGenerator.Options} [options]
 * @return {Promise<AvatarGenerator.Avatar>}
 */
async function createAvatarObject ({avatarGenerator, options = {}}) {
  const {bodyIndex, skinIndex} = await getSelectedBodyAndSkinIndex({avatarGenerator})
  const avatarFeatures = await getAvatarFeatures({avatarGenerator, options})

  return {
    image: null,
    id: md5(JSON.stringify(avatarFeatures)),
    sex: bodyIndex < BODY_MAN_INDEX ? 'female' : 'male',
    bodyIndex,
    skinIndex,
    features: avatarFeatures,
  }
}

/**
 * @param {AvatarGenerator} avatarGenerator
 * @param {AvatarGenerator.Avatar} previousAvatar
 * @param {AvatarGenerator.Options} options
 * @return {Promise<void>}
 */
async function doSelectBody ({avatarGenerator, previousAvatar, options}) {
  const page = avatarGenerator._browserInstance.page

  if (options.bodyIndex === undefined && options.skinIndex === undefined) {
    return
  }

  const bodyIndex = options.bodyIndex !== undefined ? options.bodyIndex : previousAvatar.bodyIndex
  const skinIndex = options.skinIndex !== undefined ? options.skinIndex : previousAvatar.skinIndex

  // skip selecting body if previous avatar has same body and skin type
  if (previousAvatar.bodyIndex === bodyIndex && previousAvatar.skinIndex === skinIndex) {
    return
  }

  const selector = SELECTOR_AVATAR_SELECT_BODY_AND_SKIN.replace('%', bodyIndex + 1).replace('%', skinIndex + 1)

  await page.evaluate((sel) => {
    document.querySelector(sel).click()
  }, selector)

  await page.waitFor(1)
}

/**
 * @param {AvatarGenerator} avatarGenerator
 * @param {AvatarGenerator.Avatar} previousAvatar
 * @param {AvatarGenerator.Options} [options]
 * @param {Number} [index]
 * @return {Promise<AvatarGenerator.Avatar>}
 */
async function createAvatar ({avatarGenerator, previousAvatar, options, index = 0}) {
  const page = avatarGenerator._browserInstance.page
  const requestedAvatarImages = avatarGenerator._browserInstance.requestedAvatarImages

  // select body
  await doSelectBody({avatarGenerator, previousAvatar, options})

  // wait for avatar images
  const avatarImages = await page.$$eval(SELECTOR_AVATAR_IMAGES, images => Array.from(images).map(img => img.src))

  await Promise.all(avatarImages.map(async (img) => {
    if (requestedAvatarImages.indexOf(img) === -1) {
      try {
        await page.waitForResponse(img, {timeout: 3000})
      }
      catch (e) {
        console.error('failed image', img)
      }
    }
  }))

  // remove accessories
  await Utils.hideDOMElements({
    page,
    selector: ['cat', 'dog', 'jackolantern', 'pumpkin-pail'].map(accessory => `.avatar img[alt^="${accessory}"]`).join(', ')
  })

  // only head
  if (options.onlyHead) {
    await Utils.hideDOMElements({
      page,
      selector: ['_body_skin', '/outfit/', '/bottom/', '/top/'].map(src => `.avatar img[src*="${src}"]`).join(', ')
    })
  }

  // create avatar object
  const avatar = await createAvatarObject({avatarGenerator, options})

  // take screenshot
  avatar.image = await Utils.screenshotDOMElement({
    page,
    selector: SELECTOR_AVATAR,
    path: options.folder ? path.resolve(options.folder, `avatar_${index}.png`) : undefined,
    encoding: !options.folder ? 'base64' : undefined,
  })

  return avatar
}

/**
 * @param {AvatarGenerator} avatarGenerator
 * @param {AvatarGenerator.Options} options
 * @return {Promise<Array<AvatarGenerator.Avatar>>}
 */
async function createAvatars ({avatarGenerator, options}) {
  const page = avatarGenerator._browserInstance.page
  let previousAvatar = avatarGenerator._originalAvatar

  const avatars = []

  for (let i = 0; i < options.number; i++) {
    const avatar = await createAvatar({avatarGenerator, previousAvatar, options, index: i})
    previousAvatar = avatar
    avatars.push(avatar)

    // new random avatar
    if (i < options.number - 1) {
      await page.click(SELECTOR_BUTTON_RANDOMIZE)

      await page.waitForSelector(SELECTOR_AVATAR)
    }
  }

  return avatars
}

/**
 * @param {AvatarGenerator.Options} [options]
 * @return {Promise<AvatarGenerator.BrowserInstance>}
 */
module.exports.startBrowser = async ({options = {}}) => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: 2000,
      height: 700,
    }
  })
  const page = await browser.newPage()

  /**
   * @type {AvatarGenerator.BrowserInstance}
   */
  const browserInstance = {
    browser,
    page,
    acceptedRequests: [],
    blockedRequests: [],
    requestedAvatarImages: [],
  }

  await page.setRequestInterception(true)

  page.on('request', (request) => {
    const url = request.url()

    const shouldAccept = REQUESTS_ACCEPTED.some((urlPart) => url.includes(urlPart))

    if (shouldAccept) {
      browserInstance.acceptedRequests.push(url)
      request.continue()
    }
    else {
      browserInstance.blockedRequests.push(url)
      request.abort()
    }
  })

  page.on('requestfinished', (request) => {
    const url = request.url()
    if (url.includes(REQUEST_AVATAR_IMAGE)) {
      browserInstance.requestedAvatarImages.push(url)
    }
  })

  page.on('pageerror', function (err) {
    const theTempValue = err.toString()
    console.log('Page error: ' + theTempValue)
  })

  page.on('error', function (err) {
    const theTempValue = err.toString()
    console.log('Error: ' + theTempValue)
  })

  await page.goto(URL)

  await page.waitForSelector(SELECTOR_BUTTON_RANDOMIZE)

  await page.click(SELECTOR_BUTTON_RANDOMIZE)

  await page.waitForSelector(SELECTOR_AVATAR)

  await Utils.setDOMElementsStyle({
    page,
    selector: SELECTOR_AVATAR,
    style: {width: `${options.size}px`, height: `${options.size}px`},
  })

  await Utils.hideDOMElements({page, selector: SELECTOR_AVATAR_BUTTON_UNDO})

  return browserInstance
}

/**
 * @param {AvatarGenerator.BrowserInstance} browserInstance
 * @return {Promise<AvatarGenerator.BrowserInstance>}
 */
module.exports.stopBrowser = async (browserInstance) => {
  if (!browserInstance) {
    return browserInstance
  }

  if (browserInstance.page && !browserInstance.page.isClosed()) {
    await browserInstance.page.close()
  }

  if (browserInstance.browser) {
    await browserInstance.browser.close()
  }

  return browserInstance
}

/**
 * @param {AvatarGenerator.Options} options
 * @return {Promise<AvatarGenerator>}
 */
module.exports.generateAvatar = async (options = {}) => {
  options.number = options.number || 1
  options.bodyIndex = options.bodyIndex >= 0 && options.bodyIndex <= MAX_BODY_INDEX ? options.bodyIndex : undefined
  options.skinIndex = options.skinIndex >= 0 && options.skinIndex <= MAX_SKIN_INDEX ? options.skinIndex : undefined
  options.size = options.size || DEFAULT_SIZE

  /** @type {AvatarGenerator} */
  const avatarGenerator = {
    options,
    avatars: [],
    _originalAvatar: null,
    _browserInstance: null,
  }

  try {
    avatarGenerator._browserInstance = await module.exports.startBrowser({options})
    avatarGenerator._originalAvatar = await createAvatarObject({avatarGenerator})
    avatarGenerator.avatars = await createAvatars({avatarGenerator, options})
  }
  catch (e) {
    // ignored
    console.error(e)
  }
  finally {
    await module.exports.stopBrowser(avatarGenerator._browserInstance)
  }

  return avatarGenerator
}
