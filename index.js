const express = require('express')
const multer = require('multer')
const jpeg = require('jpeg-js')
const cors = require("cors");


const tf = require('@tensorflow/tfjs-node')
const nsfw = require('nsfwjs')

const app = express()
const upload = multer()

app.use(cors());

let _model

const convert = async (img) => {
  // Decoded image in UInt8 Byte array
  const image = await jpeg.decode(img, { useTArray: true })

  const numChannels = 3
  const numPixels = image.width * image.height
  const values = new Int32Array(numPixels * numChannels)

  for (let i = 0; i < numPixels; i++)
    for (let c = 0; c < numChannels; ++c)
      values[i * numChannels + c] = image.data[i * 4 + c]

  return tf.tensor3d(values, [image.height, image.width, numChannels], 'int32')
}

app.get('/', (req, res) => {
  res.send('Hello Form image processing app!')
})

app.post('/check-image', upload.single('image'), async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ message: 'Missing image multipart/form-data' })
  try {
    const image = await convert(req.file.buffer)
    const predictions = await _model.classify(image)
    image.dispose()
    res.json({ data: predictions, message: 'Success' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

const load_model = async () => {
  _model = await nsfw.load()
}

// Keep the model in memory, make sure it's loaded only once
load_model().then(() => app.listen(process.env.PORT || 8080))

// curl --request POST localhost:8080/nsfw --header 'Content-Type: multipart/form-data' --data-binary 'image=@/full/path/to/picture.jpg'
