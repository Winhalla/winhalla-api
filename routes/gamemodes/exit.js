const lobby = require('../../models/lobbySchema')
const user = require('../../models/userSchema')
const {Router} = require('express');
const router = Router();
const notLoggedIn = require('../../utils/notLoggedIn')
const findGamesOfPlayer = require('../../utils/functions/findGamesOfPlayer')
router.post('/exitMatch', async function (req, res) {
    try {
        if (!req.user) return notLoggedIn(res)

        // Querying game
        const lobby1 = await await findGamesOfPlayer(req.user.id, false)
        if (!lobby1) return res.status(400).send("Cannot exit match because none is in progress")

        // Only accept if the player has 0 games
        if (lobby1.players.find(e => e.steamId === req.user.id).gamesPlayed !== 0) return res.status(400).send({
            message: "You have already played a game"
        })

        res.sendStatus(200)
        // Delete lobby if the player is the last in the lobby
        if (lobby1.players.length === 1) {
            return await lobby.deleteOne({_id: lobby1._id})
        }
        // Else, remove player from lobby
        await lobby.updateOne({_id: lobby1._id}, {
            $inc: {remainingSpace: lobby1.fastFinish?7:1},
            $pull: {players: {steamId: req.user.id}}
        })
        // Remove wins of players in the lobby
        lobby1.players.forEach((element, i) => {
            if (element.steamId === req.user.id) return
            lobby1.players[i].wins = undefined;
        })
        //Send update to socket with a 4s delay to leave time for players to join socket room (process lasts 500ms average but can be longer if ping is high)
        setTimeout(() => {
            process.socketio.to("FFA" + lobby1._id).emit('lobbyUpdate', lobby1);
        }, 4000)

    } catch (err) {
        res.sendStatus(500)
        console.log(err)
    }

})
router.post("/endMatch",async (req, res)=>{
    if (!req.user) return notLoggedIn(res)
    // Tries to find a game where the user is
    const lobby1 = await findGamesOfPlayer(req.user.id, false, { _id: 1 })
    // If none is found, send an error
    if(!lobby1) return res.status(404).send("No match in progress")
    try {
        // Set the number of games to 7 to be able to start another match
        await lobby.updateOne({_id: lobby1._id, "players.steamId": req.user.id}, {"players.$.gamesPlayed": 7})
    } catch (e) {
        return res.sendStatus(500)
    }
    res.sendStatus(200)
})
module.exports = router;