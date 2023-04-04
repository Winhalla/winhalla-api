const {Router} = require('express');
const router = Router();
const user = require('../models/userSchema.js')

router.patch("/updateGuidesOpenedList", async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    await user.updateOne({steamId: req.user.id},{$set:{ guidesOpenedList: req.body}});
    res.sendStatus(200);
});

module.exports = router;