const AvatarGenerator = require('./src/avatar-generator')

/**
 * @param {AvatarGenerator.Options} [options]
 * @return {Promise<Array<AvatarGenerator.Avatar>>}
 */
module.exports = async function generateAvatar (options = {}) {
  const {avatars} = await AvatarGenerator.generateAvatar(options)
  return avatars
}
