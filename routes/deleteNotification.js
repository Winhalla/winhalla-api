const { Router } = require('express');
const router = Router();
const user = require('../models/userSchema.js')
const ObjectId = require('mongoose').Types.ObjectId;
const notLoggedIn = require('../utils/notLoggedIn')
router.post('/deleteNotification/:id', async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    // Removes the notification by the id given in param
    await user.updateOne({steamId: req.user.id},{$pull:{notifications:{_id:ObjectId(req.params.id)}}})
    res.sendStatus(200)
})
module.exports = router