const axios = require('axios');
module.exports = async (username) => {
    let res;
    if (!username) return null;
    res = await axios.get(`https://api.brawlhalla.com/rankings/1v1/all/1?api_key=${process.env.API_KEY}&name=${username}`);

    if (res.data.length < 1) return undefined;
    else return res.data;
}
