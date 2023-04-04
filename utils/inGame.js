const lobbies = require('../models/lobbySchema')
function getNbOfUsersFinished(lobby, user){
    let nbOfUsersFinished = 0;
    lobby.players.forEach(e => {
        if(e.steamId !== user.steamId && !(e.gamesPlayed === 7 || e.joinDate + 3600 * 1000 < Date.now())) nbOfUsersFinished ++
    })
    return nbOfUsersFinished
}

module.exports = async (steamId, findOne, returnLobby) => {
    if (findOne === true) {
        const lobby = await lobbies.findOne({ players: { $elemMatch: { gamesPlayed: { $lt: 7 }, steamId: steamId, joinDate: { $gte: Date.now() - 3600 * 1000 } } }, finished: false })
        if(returnLobby === true) return lobby
        let player = lobby.players.find(e => e.steamId === steamId);
        return {
            id: lobby._id,
            type: "Solo",
            isFinished: player.gamesPlayed === 7 || player.joinDate + 3600 * 1000 < Date.now(),
            nbOfUsersFinishing: getNbOfUsersFinished(lobby, player),
            Date: lobby.Date,
            adsWatched: player.adsWatched,
            multiplier: player.multiplier,
            joinDate: player.joinDate,
            progress: player.gamesPlayed
        }
    } else {
        const lobby = await lobbies.find({"players.steamId": steamId,finished:false})
        return lobby.map(e => {
            let player = e.players.find(e => e.steamId === steamId)
            return {
                id: e._id,
                type: "Solo",
                isFinished: player.gamesPlayed === 7 || player.joinDate + 3600 * 1000 < Date.now(),
                Date: e.Date,
                nbOfUsersFinishing: getNbOfUsersFinished(e, player),
                adsWatched: player.adsWatched,
                multiplier: player.multiplier,
                joinDate: player.joinDate,
                progress: player.gamesPlayed
            }
        })
    }

}