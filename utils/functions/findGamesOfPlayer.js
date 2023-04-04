const lobby = require('../../models/lobbySchema')
// This query either returns null if the player is not in a match or the match if the player is in one it returns the match
// the first part (players:{$elemMatch:{gamesPlayed:{$lt:7}) matches a player that matches the time and games conditions ( 7 games )
// the second part (steamId:req.user.id) matches the player id
// 3rd part matches a player that matches the time condition (1h)
// $elemMatch is to match a document where an array has an element that matches all conditions in $elemMatch
// $gte is >=  $lt is <
// finished:false matches document that have finished set as false

//* Finds match where user is, returns null in no match in progress

module.exports = async function findGamesOfPlayer(id, findMany, projection) {
    if (findMany === true)
        return await lobby.find({ players: { $elemMatch: { gamesPlayed: { $lt: 7 }, steamId: id, joinDate: { $gte: Date.now() - 3600 * 1000 } } } }, projection)
    else
        return await lobby.findOne({ players: { $elemMatch: { gamesPlayed: { $lt: 7 }, steamId: id, joinDate: { $gte: Date.now() - 3600 * 1000 } } }, finished: false }, projection)
}