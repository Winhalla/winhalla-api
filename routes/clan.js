//! WIP
const {Router} = require("express");
const router = Router();
const clan = require("../models/clan");
const user = require("../models/userSchema.js");
const notLoggedIn = require('../utils/notLoggedIn')

const cipher = salt => {
    const textToChars = text => text.split('').map(c => c.charCodeAt(0));
    const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = code => textToChars(salt).reduce((a, b) => a ^ b, code);

    return text => text.split('')
        .map(textToChars)
        .map(applySaltToChar)
        .map(byteHex)
        .join('');
}

const decipher = salt => {
    const textToChars = text => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = code => textToChars(salt).reduce((a, b) => a ^ b, code);
    return encoded => encoded.match(/.{1,2}/g)
        .map(hex => parseInt(hex, 16))
        .map(applySaltToChar)
        .map(charCode => String.fromCharCode(charCode))
        .join('');
}

const encrypt = cipher("IWANTTOENCRYPT")
const decrypt = decipher("IWANTTOENCRYPT")

//Middleware to check if user is logged in
router.use('/', async (req, res, next) => {
    if (!req.user) return notLoggedIn(res)
    if (!(await user.exists({steamId: req.user.id}))) return notLoggedIn(res)
    next()
})

// Creates a clan
router.post('/create', async (req, res) => {
    if (!req.query.name) return res.status(400).send("No name provided")
    try {
        await clan.create({
            _id: req.query.name,
            members: [{
                steamId: req.user.id,
                permissions: 3,
                name: req.user.name,
                avatarURL: req.user.pictureMini
            }]
        })
    } catch (e) {
        res.status(409).send("Clan name already used")
    }
    res.sendStatus(204)
})

// Returns the invite link a user sends to a friend
router.get('/getInviteLink', async (req, res) => {
    res.send(process.env.WEBSITE + "/claninvite/" + encrypt(req.user.id))
})

// Joins the clan via the invite link
router.patch('/acceptInvite/:inviterId', async (req, res) => {
    req.params.inviterId = decrypt(req.params.inviterId)

    if (await clan.exists({"members.steamId": req.user.id})) return res.status(409).send("You are already in a clan")
    const foundClan = await clan.findOne({
        members: {
            $elemMatch: {
                "steamId": req.params.inviterId,
                "permissions": {$gt: 0}
            }
        }
    })
    if (!foundClan) return res.status(404).send("This invite link doesn't exist")
    if (foundClan.members.length > 18 + foundClan.level * 2) return res.status(400).send("This clan is full")
    await clan.updateOne({_id: foundClan._id}, {
        $push: {
            members: {
                steamId: req.user.id,
                permissions: 0,
                name: req.user.name,
                avatarURL: req.user.pictureMini
            }
        }
    })

    res.sendStatus(204)
})
router.patch('/promote/:permissions/:userId', async (req, res) => {
    if (!req.params.userId) return res.status(400).send("No user to promote specified")
    let {permissions} = req.params
    const update = await clan.updateOne({
        $and: [{
            members: {
                $elemMatch: {
                    steamId: req.user.id,
                    permissions: {$gt: permissions === "1" ? 1 : 2}
                }
            },
        }, {"members.steamId": req.params.userId, "members.permissions": permissions === "1" ? 0 : 1}]
    }, {$inc: {"members.$.permissions": 1}})

    if (update.n === 0) return res.status(400).send("Either you are not in a clan, either the person is not in your clan, or you have not adequate permissions")
    res.sendStatus(204)
})

module.exports = router;