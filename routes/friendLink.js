/*
! deprecated, moved on the createAccount request
const {Router} = require("express");
const router = Router();
const user = require("../models/userSchema.js");
const link = require("../models/links");
const notLoggedIn = require('../utils/notLoggedIn')


router.post("/createLink", async (req, res) => {
    if (!req.user) return notLoggedIn(res);

    const user1 = await user.exists({steamId: req.user.id});
    if (!user1) return res.status(403).send("Account needed");

    let links = await link.exists({"parent.id": req.user.id});
    if (links) return res.sendStatus(400);

    const link1 = await link.create({
        parent: {
            name: req.user.name,
            id: req.user.id,
        },
    });
    res.status(201).send(link1._id);
});

router.post("/joinLink/:linkId", async (req, res) => {
    
    if(!req.user) return res.redirect("/login")
    
    const user1 = await user.exists({steamId:req.user.id})
    if(user1) return res.status(401).send("Cannot join partner program when you have already an account")
    
    let links = await link.exists({"childs.id": req.user.id})    
    if(links) return res.status(400).send("Player is already in a link")
    links = await link.findById(req.params.linkId)
    links.childs.push({name: req.user.name, id: req.user.id, joined:Date.now()})
    await links.save()
    res.sendStatus(200)
    
})
router.get("/getLink/:linkId", async (req, res) => {
    const link1 = await link.findOne({_id: req.params.linkId});
    if (!link1) return res.sendStatus(404);
    res.send(link1);
});
module.exports = router;
*/
