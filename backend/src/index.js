const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/posts', require('./routes/posts'))
app.use('/feed', require('./routes/feed'))
app.use('/rankings', require('./routes/rankings'))
app.use('/comments', require('./routes/comments'))

app.listen(process.env.PORT || 3000, () => {
    console.log('Server running on port', process.env.PORT || 3000)
})