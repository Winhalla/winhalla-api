const user = require("../models/userSchema.js");
const callBrawlhallaApi = require("../utils/functions/callBrawlhallaApi");

async function verifyAccounts(accounts, req, res, isAccountCreation){
    if (accounts.length > 3) {
        res.status(400).send("You can only add up to 3 Brawlhalla accounts")
        return false
    }
    // check validity of all accounts
    for (let i =0;i < accounts.length; i++) {
        const account = accounts[i];
        if (isAccountCreation === true) {
            if(await user.exists({steamId: req.user.id, accountType:"v2"})){
                res.send({accountExists: true});
                return false
            }
        }

        if (account.steamId) {
        } else {
            let accountExists = await user.exists({
                "accounts.BID": account.BID
            })
            if (accountExists) {
                res.status(409).send({message: "Account already exists.", accountName: account.name})
                return false
            }
            let stats = await callBrawlhallaApi(account.BID, "stats", res,true,true)
            if (stats.stats === "err") return false // Response handled by callBrawlhallaApi
            if (!stats[0].stats.data.brawlhalla_id) {
                res.status(404).send({message: "Wrong brawlhalla ID.", accountName: account.name})
                return false
            }
            delete account.steamId
        }
    }
    return true
}
module.exports = verifyAccounts