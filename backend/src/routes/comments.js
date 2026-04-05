const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const auth = require('../middleware/auth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Post a comment (rank-gated)
router.post('/', auth, async (req, res) => {
try {
    const { post_id, body } = req.body

    // Check the user has ranked this post first
    const { data: ranking } = await supabase
    .from('rankings')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('post_id', post_id)
    .single()

    if (!ranking)
    return res.status(403).json({ error: 'You must rank this post before commenting' })

    const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: req.user.id, post_id, body })
    .select()
    .single()

    if (error) throw error
    res.json(data)

    } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
    }
})

// Get comments for a post
router.get('/:post_id', auth, async (req, res) => {
    try {
    const { data, error } = await supabase
    .from('comments')
    .select(`*, profiles(username, avatar_url)`)
    .eq('post_id', req.params.post_id)
    .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data)

    } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
    }
})

module.exports = router