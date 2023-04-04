//! Old, don't use as it's a free direct gate to the Brawlhalla API
//! It's as risky as disclosing the API key 
const global = require('../../requests/global.js')
const express = require('express')
let router = express.Router();

router.get('/:p', async (req, res) => {

    const globalData = await global(req.params.p);

    res.send(globalData);
});

module.exports = router;
