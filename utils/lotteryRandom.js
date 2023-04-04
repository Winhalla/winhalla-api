const shop = require('../models/shop'),
    user = require('../models/userSchema'),
    notLoggedIn = require('./notLoggedIn')
module.exports = async (user1, origin, probability) => {
    let req = origin.req,
        res;
    if (origin.res) {
        res = origin.res
    }
    if (req.query.nb > 50000) return res.status(416).send("Maximum tickets per roll is 50")
    if (!user1) return notLoggedIn(res)

    const shop1 = await shop.findOne({id: req.query.id})

    if (!shop1) return res.status(400).send("Object doesn't exist")
    let cost;
    cost = req.query.nb

    if (user1.coins >= cost || !res) {
        let won = 0
        let coins = 0;
        let chosen = Math.floor(Math.random() * Math.floor(probability + 1));
        /*if (chosen === probability) {
            await commands.create({
                steamId: req.user.id,
                product: shop1.name,
                date: Date.now(),
                source: "Lottery"
            })
            process.mailer.send('email', {
                to: user1.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
                subject: 'Your command in Winhalla', // REQUIRED.
                object: "You won " + shop1.name + " at the lottery",
                steamId: req.user.id
            }, () => {
            });
            won++}*/

        chosen = Math.ceil(chosen / probability * 36)
        if (chosen < 26) {

        } else if (chosen < 29) {
            coins += Math.round((cost * 2) / 5) * 5
        } else if (chosen < 32) {
            coins += Math.round((cost * 4) / 5) * 5
        } else if (chosen < 34) {
            coins += Math.round((cost * 8) / 5) * 5
        }

        coins = Math.round(coins)
        await user.updateOne({steamId: req.user._json.id}, {$inc: {coins: res ? -cost + coins : coins}})
        if (res) res.json({won, coins})
        else return {won, coins}

    } else {
        res.status(400).send("Not enough money")
    }
}