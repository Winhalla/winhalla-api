const ranked = require('./ranked');
const clan = require('./clanSimp');
const player = require('./player');

module.exports = async (brawlhallaPlayer) => {
    let playerData;
    let rankedData;

    try {
        rankedData = await ranked(brawlhallaPlayer);
    } catch (error) {
        return {statusCode: error.response.status, message: error.response.statusText};
    }
    try {
        playerData = await player(brawlhallaPlayer)
    } catch (error) {
        return {statusCode: error.response.status, message: error.response.statusText};
    }

    if (playerData.clan) {
        let clanData;
        try {
            clanData = await clan(playerData.clan.clan_id);
        } catch (error) {
            return {statusCode: error.response.status, message: error.response.statusText};
        }
        return {player: playerData, ranked: rankedData, clan: clanData};

    } else return {player: playerData, ranked: rankedData};
}
