const path = require('path')
const chai = require('chai')
const fs = require('fs-extra')

const expect = chai.expect

const AvatarGenerator = require('../src/avatar-generator')

const TMP_FOLDER = path.resolve(__dirname, 'tmp')

describe('AvatarGenerator', () => {
  describe('browser', () => {
    it('should start and stop browser', async () => {
      const browserInstance = await AvatarGenerator.startBrowser()

      expect(browserInstance.browser.isConnected()).to.equal(true)
      expect(browserInstance.page.isClosed()).to.equal(false)

      await AvatarGenerator.stopBrowser(browserInstance)

      expect(browserInstance.page.isClosed()).to.equal(true)
      expect(browserInstance.browser.isConnected()).to.equal(false)
    })
  })

  describe('generateAvatar with images', () => {
    let tmpFolder

    before(() => {
      fs.emptyDirSync(TMP_FOLDER)
      tmpFolder = fs.mkdtempSync(`${TMP_FOLDER}${path.sep}`)
    })

    it('should generate avatar', async () => {
      const {
        avatars,
        _browserInstance,
        _originalAvatar,
      } = await AvatarGenerator.generateAvatar({
        number: 5,
        removeAccessories: true,
        folder: tmpFolder,
      })

      expect(_browserInstance.browser.isConnected()).to.equal(false)
      expect(_browserInstance.page.isClosed()).to.equal(true)

      expect(avatars).to.have.lengthOf.at.least(1)
      expect(_originalAvatar).to.be.an('object')

      console.log('originalAvatar', _originalAvatar)
      console.log('avatar', avatars[0])
      console.log('avatar', avatars[1])
    })
  })

  describe('generateAvatar with base64', () => {
    it('should generate avatar', async () => {
      const {
        avatars,
      } = await AvatarGenerator.generateAvatar()

      expect(avatars).to.have.lengthOf(1)

      expect(avatars[0].image).to.be.an('string')

    })
  })
})
