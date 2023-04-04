const axios = require('axios');

module.exports = async (brawlhallaPlayer) => {
    const ranked = await axios.get(`https://api.brawlhalla.com/player/${brawlhallaPlayer}/ranked?api_key=${process.env.API_KEY}`);
    return ranked.data;
}
