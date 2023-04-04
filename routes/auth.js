const {Router} = require("express");
const router = Router();
const passport = require("passport");
const user = require("../models/userSchema.js");
const link = require("../models/links");
const logins = require("../models/logins")
const oldUsers = require("../models/oldUsers")
const axios = require("axios");
const characters = 'ABCDEFHIJKLMNOPQRSTUVWXYZ0123456789'
const charactersLength = characters.length
const notLoggedIn = require('../utils/notLoggedIn')
const stats = require('../models/stats')
const bcrypt = require("bcrypt")
const loginToken = require('../models/loginTokens');
const {OAuth2Client} = require("google-auth-library");
const client = new OAuth2Client("570988062830-7qhtde1a94vjj76gsm3a9mvus4gmj88t.apps.googleusercontent.com")
const callBrawlhallaApi = require("../utils/functions/callBrawlhallaApi");
const verifyAccounts = require('../utils/verifyAccounts')
const lobbies = require("../models/lobbySchema");
const linkIps = require("../models/linkIps");
const {incChallengeProgress} = require("../utils/dailyChallenge");

function makeId(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Google login
router.get(
    "/login/google",
    passport.authenticate("google", {scope: ['profile', 'email'],})
);

router.get(
    "/redirect/google",
    passport.authenticate("google", {failureRedirect: "/login"}),
    (req, res) => {
        res.redirect(process.env.WEBSITE + "/referral-link?needBrawlhallaID=true");
    }
);
// Steam login
router.get(
    "/login/steam",
    passport.authenticate("steam", {failureRedirect: process.env.WEBSITE + "/login"})
);

router.get(
    "/redirect/steam",
    passport.authenticate("steam", {failureRedirect: process.env.WEBSITE + "/login"}),
    (req, res) => {
        res.redirect(process.env.WEBSITE + "/referral-link");
    }
)
// Local login
router.post('/login/local',
    passport.authenticate('local', {failureRedirect: process.env.WEBSITE + "/login"}),
    function (req, res) {
        res.sendStatus(200)
    });
// Local account creation
router.post('/createEmailPassword', async (req, res) => {
    if (req.query.password.length < 8) return res.status(400).send("Passwords must be at least 8 characters")
    if (req.user) return // Refuses already logged in users
    // Checks if an account exists  and refuses already existing usernames
    if (await logins.exists({username: req.query.username})) return res.status(409).send("Username already taken")
    // Creates an association username-password with one-way password encryption 
    await logins.create({username: req.query.username, password: await bcrypt.hash(req.query.password, 10)})
    res.sendStatus(201)
})
// Logout (c'est toi qui l'a fait ptdr) 
router.get("/logout", function (req, res) {
    req.logout();
    res.redirect(process.env.WEBSITE);
});
let concurrentRequests = []
setInterval(() => {
    concurrentRequests = concurrentRequests.filter(e => e.timestamp + 5000 >= Date.now())
}, 2500)
router.post("/createAccount", async (req, res) => {
    if (concurrentRequests.find(e => req.user.id === e.id))
        return res.status(409).send("Another request from your account is in progress, please wait a few seconds")
    else (concurrentRequests.push({id: req.user.id, timestamp: Date.now()}))

    if (!req.user) return notLoggedIn(res);
    // Provided by user : account:{BID:brawlhallaId, name:displayName of the account type ("steam", "xbox",etc...), steamId:for steam accounts}

    const areAccountsValid = verifyAccounts(req.body.accounts, req, res, true)
    if(!areAccountsValid) return; // response handled by verifyAccounts

    let link1;

    async function createLink() {
        link1 = await link.create({
            _id: makeId(6),
            parent: {
                name: req.user.name,
                id: req.user.id,
            },
        });
    }

    let validLink = false

    while (!validLink) {
        try {
            await createLink()
            validLink = true
        } catch (e) {
            validLink = false
        }
    }
    let oldUser;

    let oldUserCoins = await user.find({brawlhallaId: {$in:req.body.accounts.map(e=>e.BID)}, accountType:{$ne:"v2"}},{coins:1, _id:1, joinDate:1})
    oldUserCoins.sort((a, b) => a.coins > b.coins ? 1 : -1);
    oldUser = oldUserCoins[0]
    if(oldUser)
        await user.deleteOne({_id:oldUser._id})
    await user.deleteOne({steamId:req.user.id, accountType:{$ne:"v2"}})
    await user.create({
        accountType:"v2",
        steamId: req.user.id,
        brawlhallaId: req.body.accounts[0].BID,
        brawlhallaAccounts:req.body.accounts,
        brawlhallaName: req.user.name,
        avatarURL: req.user.picture,
        miniAvatarURL: req.user.pictureMini,
        coins: oldUser ? oldUser.coins : 0,
        "coinsLog.total.beta": oldUser ? oldUser.coins : 0,
        declaredSteamId: req.query.steamId,
        email: req.user.email,
        joinDate: oldUser ? oldUser.joinDate : Date.now(),
        linkId: link1._id.toString(),
    });
    let linkDetected = false;
    if(!req.query.linkId){
        const link = await linkIps.findOne({ip:req.ip})
        if(link) {
            req.query.linkId = link.link
            linkDetected = true;
        }
    }

    const update = await link.updateOne({_id: req.query.linkId}, {
        $push: {
            childs: {
                name: req.user.name,
                id: req.user.id,
                joined: Date.now(),
            }
        }
    })
    res.status(201).send({link:link1._id, isLinkDetected:linkDetected});
    let dateObj = new Date()
    let stringDate = `${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCFullYear()}`
    await stats.updateOne({type: "Users", date: stringDate}, {$inc: {data: 1}}, {upsert: true})
    if (update.nModified === 1){
        await stats.updateOne({type: "Joined Links", date: stringDate}, {$inc: {data: 1}}, {upsert: true})
        const parent = await link.findOne({_id: req.query.linkId},{"parent.id":1})
        if(parent){
            const user2 = await user.findOne({steamId: parent.parent.id},)
            if(user2){
                const update = linkIps.deleteOne({ip:req.ip})
                await incChallengeProgress(user2,"referral")
                // Do all updates il parallel to speed up process
                await update
            }
        }
    }
    let index = concurrentRequests.findIndex(e => e.id === req.user.id)
    if (index !== -1) concurrentRequests.splice(index, 1)
});
// these 3 routes are for GDPR 
router.delete('/deleteAccount', async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    await user.deleteOne({steamId: req.user.id})
    await loginToken.deleteOne({steamId: req.user.id})
    res.setHeader("Set-cookie", "auth=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/")
    res.sendStatus(204)
})
router.patch("/moveAccount", async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    let user1 = await user.findOne({steamId: req.user.id})
    user1.date = Date.now()
    delete user1.__v
    user1 = JSON.stringify(user1)
    user1 = JSON.parse(user1)
    await oldUsers.create(user1)
    // await user.deleteOne({steamId: req.user.id})
    res.sendStatus(204)
})
router.get('/downloadData', async (req, res) => {
    if (!req.user) return res.send(null)
    let user1 = await user.findOne(
        {steamId: req.user.id},
    );
    res.setHeader("Content-Disposition", "attachment; filename=userdata.txt")
    res.setHeader('Content-Type', "text/plain")
    res.send(JSON.stringify({user: user1, steam: req.user}))
})

router.get('/getUserData/:BID', async function (req, res) {
    if (!req.params.BID) return res.status(400).send("Please provide a valid Brawlhalla ID")
    let user1
    try {
        user1 = await user.findOne({brawlhallaId: req.params.BID})
    } catch (e) {
        return res.status(400).send("Please provide a valid Brawlhalla ID")
    }
    if (!user1) return res.send(null)
    const userLink = await link.findOne({"parent.id": user1.steamId})
    res.send({user: user1, link: userLink.childs.length})
})
/*router.patch("/changeEmail", async (req, res) => {
    if (!req.user) return notLoggedIn(res);
    if (!req.query.email || req.query.email === "")
        return res.status(400).send("Need to provide an email");
    if (await user.exists({email: req.query.email}))
        return res.status(409).send("Email already used by another account");
    else {
        await user.updateOne(
            {steamId: req.user.id},
            {email: req.query.email}
        );
        res.send("Email sucessfully changed");
    }
});*/
//Return if Brawlhalla ID is valid, and it's data if so
router.get('/isBIDvalid/:brawlhalla_id', async (req, res) => {

    let BIDData = (await callBrawlhallaApi(req.params.brawlhalla_id, "stats", res, true,true))
    if (BIDData?.stats === "err") return
    if(!BIDData[0]?.stats?.data?.brawlhalla_id) return res.send({
        isValid: false,
        reason: 'Invalid Brawlhalla ID'
    }) // Response is handled by callBrawlhallaApi

    // Checks if the BID is already used
    if (await user.exists({brawlhallaId: parseInt(req.params.brawlhalla_id)})) return res.send({
        isValid: false,
        reason: "This Brawlhalla ID is already used"
    });
    res.send({isValid: true, data: BIDData[0].stats.data})
})

router.get('/getBIDFromSteamId/:steamId', async (req, res) => {
    let brawlhallaAccount = await callBrawlhallaApi(req.params.steamId, "search", res)
    if (brawlhallaAccount?.stats === "err") return // Response is handled by callBrawlhallaApi
    brawlhallaAccount = await callBrawlhallaApi(brawlhallaAccount[0].search.data.brawlhalla_id, "stats", res)
    if (brawlhallaAccount.stats === "err") return
    res.send(brawlhallaAccount[0].stats.data)
})

router.post('/createToken', async (req, res) => {
    try {
        const ticket = await client.getTokenInfo(
            req.body.token
        )
        const existingToken = await loginToken.findOne({id: "google" + ticket.sub});
        if (existingToken) return res.send(existingToken)
        const newToken = await loginToken.create(
            {
                id: "google" + ticket.sub,
                name: req.body.name,
                email: ticket.email,
                picture: req.body.picture || "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/b5/b599127509772f2125568318a38f24e64881de61_medium.jpg",
                pictureMini: req.body.picture || "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/b5/b599127509772f2125568318a38f24e64881de61_medium.jpg",
            }
        );
        res.send(newToken)

    } catch (e) {
        console.log(e)
        return res.status(500).send("Error occurred while logging in")
    }
})

router.post('/editBrawlhallaAccounts',async (req,res)=>{
    if(!req.user) return notLoggedIn(res);
    if(!req.body?.accounts) return res.status(400).send("Please provide at least one account")
    console.log(req.body?.accounts)

    if(await lobbies.exists({"players.steamId": req.user.id, finished:false})) return res.status(400).send("You cannot edit your accounts if you have a match in progress, please wait a few hours.")

    const areAccountsValid = verifyAccounts(req.body.accounts, req, res, false)
    if(!areAccountsValid) return; // response handled by verifyAccounts

    await user.updateOne(
        {steamId:req.user.id},
        {
            "solo.lastDaily": 0,
            "solo.lastWeekly": 0,
            waitingNewQuestsDaily: true,
            waitingNewQuestsWeekly: true,
            brawlhallaAccounts: req.body.accounts,
            brawlhallaId: req.body.accounts[0].BID,
            declaredSteamId: req.body.accounts.find(e=>e.platformId === "steam")?.steamId,
        }
    );
    res.sendStatus(200);
})

router.get("/checkLink/:link", async (req, res) => {
    if(!req.params.link) return res.status(400).send("Please provide a link")
    const linkExists = await link.exists({_id: req.params.link})
    res.send(linkExists);
})

router.get("/checkDetectedLink", async (req, res) => {
    res.send(await linkIps.exists({ip:req.ip}))
})
module.exports = router;
