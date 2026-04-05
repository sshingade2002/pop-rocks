const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const auth = require('../middleware/auth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.post('/', auth, async (req, res) => {
    try {
    const { post_id, score } = req.body

    // Insert ranking — unique constraint prevents double ranking
    const { error: rankError } = await supabase
    .from('rankings')
    .insert({ user_id: req.user.id, post_id, score })

    if (rankError) {
    if (rankError.code === '23505')
        return res.status(400).json({ error: 'You have already ranked this post' })
    throw rankError
    }

    // Recompute average from all rankings on this post
    const { data: rankings } = await supabase
    .from('rankings')
    .select('score')
    .eq('post_id', post_id)

    const avg = rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length

    // Update post with new average and count
    await supabase
    .from('posts')
    .update({ avg_ranking: avg, rank_count: rankings.length })
    .eq('id', post_id)

    // Generate a signed URL for the original image — expires in 1 hour
    const { data: postData } = await supabase
    .from('posts')
    .select('original_url')
    .eq('id', post_id)
    .single()

    const { data: signedUrl } = await supabase.storage
    .from('posts-original')
    .createSignedUrl(postData.original_url, 3600)

    res.json({
    avg_ranking: avg,
    rank_count: rankings.length,
    original_url: signedUrl.signedUrl
    })

} catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
    }
})

module.exports = router