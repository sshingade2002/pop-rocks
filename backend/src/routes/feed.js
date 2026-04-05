const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const auth = require('../middleware/auth')

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.get('/', auth, async (req, res) => {
    try {
    const userId = req.user.id

    // Get accepted friends
    const { data: friends } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')

    if (!friends || friends.length === 0) return res.json([])

    const friendIds = friends.map(f => f.friend_id)

    // Get friends posts with rankings
    const { data: posts, error } = await supabase
    .from('posts')
    .select(`*, rankings(id, score, user_id)`)
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })

    if (error) throw error

    // Tag each post with whether current user has ranked it
    const unranked = []
    const ranked = []

    for (const post of posts) {
    const userRanking = post.rankings?.find(r => r.user_id === userId)
    post.user_has_ranked = !!userRanking
    post.user_score = userRanking?.score ?? null
    delete post.rankings

    if (!post.user_has_ranked) {
        unranked.push(post)
    } else {
        ranked.push(post)
    }
    }

    // Soft cap — max 5 unranked shown first, then ranked, then rest
    const feed = [
    ...unranked.slice(0, 5),
    ...ranked,
    ...unranked.slice(5)
    ]

    res.json(feed)

    } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
    }
})

module.exports = router