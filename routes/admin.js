const {Router} = require('express');
const router = Router()
//const speakez = require('speakeasy')
const characters = 'azertyuiopqsdfghjklmwxcvbnABCDEFHIJKLMNOPQRSTUVWXYZ0123456789'
const charactersLength = characters.length
const config = require('../models/config')
    , poll = require('../models/poll')
    , user = require('../models/userSchema')
    , authenticate = require('../utils/functions/authenticate')
    , commands = require('../models/commands')
    , stats = require('../models/stats')
    , renderFx = require('../utils/functions/renderFx')
    , sendPaypalCredit = require('../utils/paypal')

function makeId(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

process.tempAdminKeys = []
router.get('/config', (req, res) => {
    authenticate(req, res, async () => {
        const configs = await config.find();
        const tempKey = makeId(50)
        process.tempAdminKeys.splice(process.tempAdminKeys.findIndex(e => e.steamId === req.user.id), 1)
        process.tempAdminKeys.push({tempKey, timestamp: Date.now() / 1000})
        return res.send({configs, tempKey, steamId: req.user.id})
    })
})

router.get("/login", (req, res) => {

    if (!req.user) return res.status(404).send(renderFx("fakeError", {method: "GET", path: "/feltrom/login"}))
    if (req.user.id === process.env.PHILTROM || req.user.id === process.env.FELONS) {
        return res.send(true)
    } else res.status(404).send(renderFx("fakeError", {method: "GET", path: "/feltrom/login"}))
})

router.post('/save', (req, res) => {
    authenticate(req, res, async () => {
        req.body.forEach(async e => {
            if (e.name === "STATUS" || e.name === "POLLS") return;
            await config.updateOne({name: e.name}, {value: e.value})
            process.dbConfig[process.dbConfig.findIndex((config) => config.name === e.name)].value = e.value
        })
        res.send("OK")
    })
})
router.post('/createPoll', (req, res) => {
    authenticate(req, res, async () => {
        const body = req.body
        body.participants = [];
        body.answers = []
        if (body.isMCQ === 'true') {
            body.options.forEach((e, i) => {
                body.answers[i] = {name: e, nb: 0, id: i}
            })
        }
        await poll.create(body);
        res.sendStatus(200)
        /*req.app.mailer.send('security', {
            to: "slavik.zhyhota@gmail.com,clement.octruc@gmail.com",
            subject: 'Level 1 security alert',
            action: "Create Information",
            level: 2,
            admin: req.user.id === process.env.PHILTROM ? "Philtrom" : "Felons"
        }, () => "");*/


    })
})
router.post('/createInformation', (req, res) => {
    authenticate(req, res, async () => {
        const {type, name, description, strong, severity} = req.body
        if (type === 'info') {
            await config.updateOne({name: "INFOS"}, {
                $push: {
                    value: {
                        name,
                        description,
                        strong,
                        severity: parseInt(severity),
                        expiration: Date.now() + req.body.expiration
                    }
                }
            })
            process.dbConfig[process.dbConfig.findIndex(e=>e.name === "INFOS")].value.push({
                name,
                description,
                strong,
                severity: parseInt(severity),
                expiration: Date.now() + req.body.expiration
            })
        } else if (type === 'advice') {
            const advices = await config.findOne({name: 'ADVICES'})
            advices.value.push({name, description, strong})
            await advices.save()
        }
        res.sendStatus(200)
        /*req.app.mailer.send('security', {
            to: "slavik.zhyhota@gmail.com,clement.octruc@gmail.com",
            subject: 'Level 1 security alert',
            action: "Create Information",
            level: 1,
            admin: req.user.id === process.env.PHILTROM ? "Philtrom" : "Felons"
        }, () => "");*/

    })
})
router.post('/newEvent', (req, res) => {
    authenticate(req, res, async () => {
        let {name, percentage, expiration, description} = req.body

        await config.updateOne({name: 'GOLD EVENT'}, {value: {percentage, expiration, name, description}})
        process.dbConfig.find(e => e.name === "GOLD EVENT").value = {percentage, expiration, name, description}
        res.sendStatus(200)
        /*req.app.mailer.send('security', {
            to: "slavik.zhyhota@gmail.com,clement.octruc@gmail.com",
            subject: 'Level 2 security alert',
            action: "Create Event",
            level: 2,
            admin: req.user.id === process.env.PHILTROM ? "Philtrom" : "Felons"
        }, () => "");*/
    })
})
router.post('/ban', (req, res) => {
    authenticate(req, res, async () => {
        if (!req.body.id) return res.status(400).send("No user provided")
        if (req.body.ban === true) {
            process.bans.push(req.body.id)
            await config.updateOne({name: "IDs BANNED"}, {$push: {value: {reason: req.body.reason, id: req.body.id}}})
        }
        if (req.body.ban === false) {
            const index = process.bans.findIndex(e => e === req.body.id)
            if (index !== -1) {
                process.bans.splice(index, 1)
                await config.updateOne({name: "IDs BANNED"}, {$pull: {value: {id: req.body.id}}})
            } else return res.status(400).send("User is not banned")

        }
        /*req.app.mailer.send('security', {
            to: "slavik.zhyhota@gmail.com,clement.octruc@gmail.com",
            subject: 'Level 2 security alert',
            action: "User banned",
            level: 2,
            admin: req.user.id === process.env.PHILTROM ? "Philtrom" : "Felons"
        }, () => "");*/

        res.sendStatus(200)
    })
})
router.post('/unsuspicious', (req, res) => {
    authenticate(req, res, async () => {
        if (!req.query.user) return res.status(400).send("No user provided")
        await user.updateOne({steamId: req.query.user}, {"isSucpicious.ffa": false, "isSucpicious.solo": false})
        res.sendStatus(200)
        /*req.app.mailer.send('security', {
            to: "slavik.zhyhota@gmail.com,clement.octruc@gmail.com",
            subject: 'Level 1 security alert',
            action: "User marked as unsuspicious",
            level: 1,
            admin: req.user.id === process.env.PHILTROM ? "Philtrom" : "Felons"
        }, () => "");*/
    })
})
router.get("/users", (req, res) => {
    authenticate(req, res, async () => {
        res.send(await user.find())
    })
})
router.get("/commands", (req, res) => {
    authenticate(req, res, async () => {
        res.send(await commands.find())
    })
})
router.post('/approvePaypalCommand/:commandId', (req, res) => {
    authenticate(req, res, async () => {
        const command = await commands.findOne({_id: req.params.commandId})
        if (!command) return res.status(404).send("Command not found")
        const result = await sendPaypalCredit(command.number, command.email)
        if (result.code === "success") {
            await commands.deleteOne({_id: req.params.commandId})
            return res.sendStatus(200)
        } else {
            res.status(500).send(JSON.stringify(result.message))
        }
    })
})
router.post('/editCommandStatus', (req, res) => {
    authenticate(req, res, async () => {
        let {id, state} = req.body
        if (!id) return res.status(400).send("No command provided")
        if (!state) return res.status(400).send("No state provided")
        await commands.updateOne({_id: id}, {state})
    })
})
router.post('/logout', (req, res) => {
    authenticate(req, res, async () => {
        process.tempAdminKeys.splice(process.tempAdminKeys.findIndex(e => e.steamId === req.user.id), 1)
        res.sendStatus(200)
    })
})
router.get('/getAllPolls', (req, res) => {
    authenticate(req, res, async () => {
        res.send(await poll.find())
    })
})
router.post('/deletePoll', (req, res) => {
    authenticate(req, res, async () => {
        await poll.deleteOne({_id: req.body.id})
        res.sendStatus(200)
    })
})
router.get('/stats', (req, res) => {
    authenticate(req, res, async () => {
        // const statsType = ["Users", "Joined Links", "Lobbies"];
        let stat = await stats.find()
        let lobbies = stat.filter(e => e.type === "Lobbies")
        let joinedLinks = stat.filter(e => e.type === "Joined Links")
        let newUsers = stat.filter(e => e.type === "Users")
        res.send([{data: lobbies.map(e => e.data), date: lobbies.map(e => e.date), name: "Lobbies"}, {
            data: joinedLinks.map(e => e.data),
            date: joinedLinks.map(e => e.date), name: "Joined Links"
        }, {data: newUsers.map(e => e.data), date: newUsers.map(e => e.date), name: "New Users"}])


    })
})
module.exports = router;