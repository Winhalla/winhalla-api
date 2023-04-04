const axios = require('axios');

module.exports = async (clanId) => {
    const clan = await axios.get(`https://api.brawlhalla.com/clan/${clanId}/?api_key=${process.env.API_KEY}`);
    return clan.data;
}
