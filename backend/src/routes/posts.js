const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')
const auth = require('../middleware/auth')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
    const { caption, lat, lng } = req.body
    const imageBuffer = req.file.buffer
    const filename = `${req.user.id}-${Date.now()}`

    // Generate blurred version
    const blurredBuffer = await sharp(imageBuffer)
    .blur(20)
    .jpeg({ quality: 80 })
    .toBuffer()

    // Upload original to private bucket
    await supabase.storage
    .from('posts-original')
    .upload(`${filename}.jpg`, imageBuffer, { contentType: 'image/jpeg' })

    // Upload blurred to public bucket
    await supabase.storage
    .from('posts-blurred')
    .upload(`${filename}.jpg`, blurredBuffer, { contentType: 'image/jpeg' })

    // Get public URL for blurred version
    const blurredUrl = supabase.storage
    .from('posts-blurred')
    .getPublicUrl(`${filename}.jpg`).data.publicUrl

    // Build location if provided
    const location = lat && lng ? `POINT(${lng} ${lat})` : null

    // Save post to database
    const { data, error } = await supabase
    .from('posts')
    .insert({
        user_id: req.user.id,
        caption,
        original_url: `${filename}.jpg`,
        blurred_url: blurredUrl,
        location
    })
    .select()
    .single()

    if (error) throw error
    res.json(data)

    } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
    }
})

module.exports = router