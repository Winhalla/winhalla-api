const axios = require('axios');

module.exports = async (brawlhallaPlayer) => {
    const stats = await axios.get(`https://api.brawlhalla.com/player/${brawlhallaPlayer}/stats?api_key=${process.env.API_KEY}`);
    
    const clan = await axios.get(`https://api.brawlhalla.com/clan/${stats.data.clan.clan_id}/?api_key=${process.env.API_KEY}`);
    return clan.data;
}
