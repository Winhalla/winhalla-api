/*! WIP
const express = require('express');
const axios = require('axios')
let router = express.Router();
const duel = require('../../models/1v1Schema')
const quests = require('../../utils/quests1v1.json')
const characters = require('../../utils/characters.json')
//const duels = duelSchema.find({remainingSpace: !0})
//console.log(duels)
router.get('/duel', async function (req, res) {
// Defining brawlhallaId
    if (!req.user) return res.status(403).send('No credentials given')
    let brawlhallaId = await axios.get(`https://api.brawlhalla.com/search?steamid=${req.user.id}&api_key=${process.env.API_KEY}`)
    brawlhallaId = brawlhallaId.data
    try {
        const newDuel = await duel.create({
            remainingSpace: 9,
            questOptions: {"first": "xxx", "second": "xxx"},
            players: [{
                quests: [0],
                steamId: req.user.steamId,
                brawlhallaId: brawlhallaId.brawlhalla_id,
                username: brawlhallaId.name,
                quest1: 1,
                quest2: 2,
                quest3: 3,
                avatarURL: req.user.picture,
            }],
            Date: Date.now()

        })
        res.send(newDuel._id)
    } catch (error) {
        console.log(error)
    }
})
module.exports = router*/
