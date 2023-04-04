//! Old, don't use as it's a free direct gate to the Brawlhalla API
//! It's as risky as disclosing the API key 
const name = require('../../requests/steamToBrawlhalla.js')
const express = require('express')
let router = express.Router();


router.get('/:n', async (req, res) => {
    const nameData = await name(req.params.n);
    if(!nameData) return res.send(nameData);
    res.send(nameData);
});

module.exports = router;
