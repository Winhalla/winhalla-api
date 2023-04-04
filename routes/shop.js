const {Router} = require('express');
const router = Router();

const shop = require('../models/shop');
const user = require('../models/userSchema');
const commands = require('../models/commands');
const lotteryRandom = require("../utils/lotteryRandom")
const notLoggedIn = require('../utils/notLoggedIn')
const renderFx = require('../utils/functions/renderFx')
const sendPaypalCredit = require('../utils/paypal')
const mailAttachments = require('../utils/mailAttachments')
const axios = require("axios");
const ObjectId = require('mongoose').Types.ObjectId;
let concurrentRequests = []

router.post("/setGoal", async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    if (!req.body.itemId && req.body.itemId !== 0) return res.status(400).send("You didn't select an item")
    const item = await shop.findOne({"id": req.body.itemId})
    if (!item) return res.status(404).send("The item you selected was not found")
    await user.updateOne({steamId: req.user.id}, {goal: {cost: item.cost, name: item.nickname, id: req.body.itemId}})
    res.send({cost: item.cost, name: item.nickname, id: req.body.itemId})
})
router.get('/commands', async (req, res) => {
    if(!req.user) return notLoggedIn();
    const commands1 = await commands.find({userId: req.user.id})
    res.send(commands1)
})
router.get('/shop', async (req, res) => {
    const shop1 = await shop.find()
    res.send(shop1)
});
setInterval(() => {
    concurrentRequests = concurrentRequests.filter(e => e.timestamp + 5000 >= Date.now())
}, 2500)
router.post('/buy/:id', async (req, res) => {
    console.log(req.query.number)
    try {
        if (!req.user) return notLoggedIn(res)
        // Queries user's document
        if (concurrentRequests.find(e => req.user.id === e.id))
            return res.status(409).send("Another request from your account is in progress, please wait a few seconds")
        else (concurrentRequests.push({id: req.user.id, timestamp: Date.now()}))
        const user1 = await user.findOne({steamId: req.user.id})

        // If there is no document associated with the account ID they used, send error message
        if (!user1) return notLoggedIn(res)

        //Queries shop item
        const shop1 = await shop.findOne({id: req.params.id})

        let playerPlatform = /([a-zA-Z]+)(.+)/gm.exec(req.user.id)[1];
        if (!shop1.platforms.some(name => user1.brawlhallaAccounts.some(platform => platform.platformId === name) || name === "all"))
            return res.status(403).send("This item is not available for your platform, please withdraw for paypal credit instead")

        if (!shop1) return res.status(400).send("Object doesn't exist")

        // If a number is sent (e.g. for paypal) multiply the item's cost by the number
        let multiplier = req.query.number && shop1.type === "paypal" ? req.query.number : 1
        if (user1.coins < shop1.cost * multiplier) return res.status(400).send("Not enough money")

        // If the user has bought an item within the last 3 days then refuse to proceed
        if ((user1.lastPayout + 3600 * 1000 * 24 * 3 > Date.now() && user1.lastPayout)) return res.status(400).send("You have already bought an item or received a payment in the past 3 days")
        if (shop1.type === "paypal" && !req.query.number) return res.status(400).send("No amount provided")
        if (shop1.type === "paypal" && req.query.number < 1) return res.status(400).send("Minimum amount to withdraw is 1€")
        // If user wants paypal credit AND it's safe to send (less than 10$ and less than once a week)
        // ! Disabled
        if ( false  /*shop1.type === "paypal" && req.query.number < 10 && req.query.number >= 1*/ ) {

            const result = await sendPaypalCredit(req.query.number, req.query.email) // Send paypal credit to the email provided in query param
            // If the operation (request in itself, not the payment) succeeded, remove the coins and start verification

            if (result.code === "success") {
                await user.updateOne({steamId: req.user.id}, {
                    $inc: {
                        coins: -(shop1.cost * req.query.number),
                        "coinLogs.total.redeemed": shop1.cost * req.query.number
                    },
                    $set: {lastPayout: Date.now()},
                    $push: {
                        "coinLogs.history": {
                            type: "redeem",
                            displayName: shop1.type === `Paypal credit ${req.query.number}€`,
                            data: {reward: -shop1.cost * req.query.number, name: "Coins redeemed with the shop"},
                            timestamp: Date.now()
                        }
                    }
                })
                let number = 0
                let interval = setInterval(async () => {
                    // If 60 seconds have passed, stop checking
                    if (number === 3) return clearInterval(interval)
                    // Get payout status
                    let payoutData = await axios.get('https://api-m.sandbox.paypal.com/v1/payments/payouts/' + result.batchId, {
                        headers: {
                            'Accept': 'application/json',
                            'Accept-Language': 'en_US',
                            'Authorization': 'Bearer ' + result.accessToken
                        }
                    })
                    payoutData = payoutData.data
                    if (payoutData.status !== 200) return clearInterval(interval)
                    // Wait another 20s if the payment status is pending (up to 3 times, 60s max)
                    if (payoutData.items[0].transaction_status === "PENDING") {
                        return number++
                    }
                    // If the operation didn't succeed, give the coins back and notify the user
                    else if (!(payoutData.items[0].transaction_status === "SUCCESS") && !(payoutData.items[0].transaction_status === "UNCLAIMED")) {
                        await user.updateOne({steamId: req.user.id}, {
                            $inc: {coins: shop1.cost * req.query.number},
                            $set: {lastPayout: 0},
                            $push: {
                                notifications: {
                                    id: 5,
                                    _id: ObjectId(),
                                    message: "Paypal payment failed",
                                    tip: "Paypal payment failed, we gave you back your coins"
                                },
                            }
                        })
                        clearInterval(interval)
                    }
                    // If the operation succeeded, remove the checker
                    else {
                        clearInterval(interval)
                    }
                    // Increase the loop count number
                    number++
                }, 20000)
            } else {
                // If an error occurred, send the error message details to the user, (It's an array, so we concatenate all string values of error fields)
                return res.status(400).send(Object.values(result.message.details).reduce((a, b) => a + ". " + b))
            }
            // If no error occurred send the response as a successful operation
            let index = concurrentRequests.findIndex(e => e.id === req.user.id)
            if (index !== -1) concurrentRequests.splice(index, 1)
            return res.sendStatus(200)
        }
        // For everything else than paypal and huge payouts, store it for manual review (paypal)/manual processing (other)
        await commands.create({
            steamId: user1.declaredSteamId,
            userId: req.user.id,
            product: shop1.name,
            date: Date.now(),
            source: "Shop",
            brawlhallaName: user1.brawlhallaName,
            avatarURL: user1.avatarURL,
            email: req.query.email,
            platform: playerPlatform,
            type: shop1.type,
            number: req.query.number,
        })
        // Render the mail in html
        let htmlStr = renderFx(shop1.type === "paypal" ? "paypalShop" : "shop", {object: shop1.name, amount:req.query.number || 1})
        // Send mail
        process.mailer.sendMail({
            html: htmlStr,
            text: shop1.type === "paypal" ? "Thanks for using Winhalla! You should receive your reward in a few days." : "Thanks for using Winhalla! You need to complete a few more steps to ensure you collect your reward.", // For some reason the text value is required too (dont't remove the mail won't send)
            to: req.query.email,
            from: "Winhalla <postmaster@winhalla.app>",
            subject: shop1.type === "paypal" ? 'Your reward is incoming... Your command in Winhalla' : 'A few more steps... Your command in Winhalla',
            attachments: shop1.type === "paypal" ? mailAttachments.paypalConfirmation : mailAttachments.buyConfirmation
        });
        // Remove coins to the user and set last payout date to the date of buy
        await user.updateOne({steamId: req.user.id}, {
            $inc: {
                coins: -(shop1.cost * multiplier),
                "coinLogs.total.redeemed": shop1.cost * multiplier
            },
            $set: {lastPayout: Date.now()},
            $push: {
                "coinLogs.history": {
                    type: "redeem",
                    displayName: shop1.type === "paypal" ? `Paypal credit ${req.query.number}€` : shop1.name,
                    data: {reward: -shop1.cost * req.query.number, name: "Coins redeemed with the shop"},
                    timestamp: Date.now()
                }
            }
        })


        res.sendStatus(200)

        let index = concurrentRequests.findIndex(e => e.id === req.user.id)
        if (index !== -1) concurrentRequests.splice(index, 1)

    } catch
        (err) {
        res.sendStatus(500)
        return console.error(err)
    }
});
// Disabled for now
/*
const probability = 4500
router.post('/lottery/enter', async (req, res) => {

    if (!req.user) return notLoggedIn(res)
    const user1 = await user.findOne({steamId: req.user.id})
    lotteryRandom(user1, {req, res}, probability)

})
*/

module.exports = router