const generateAvatar = require('../index')
const express = require('express')

const app = express()
const port = 3001

app.use(express.static(__dirname))

app.get('/generateAvatar', async (req, res, next) => {
  try {
    res.send(await generateAvatar({
      number: Number(req.query['number']) || 1,
      removeAccessories: req.query['removeAccessories'] === 'true',
      onlyHead: req.query['onlyHead'] === 'true',
      size: Number(req.query['size']),
      bodyIndex: Number(req.query['bodyIndex']),
      skinIndex: Number(req.query['skinIndex']),
    }))
  }
  catch (e) {
    console.error(e)
    next()
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
