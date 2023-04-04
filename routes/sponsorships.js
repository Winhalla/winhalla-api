const {Router} = require('express');
const router = Router();
const user = require('../models/userSchema.js')
const notLoggedIn = require('../utils/notLoggedIn')
router.get("/lahkan/gdsezfbxd4", async (req, res) => {
    const users = await user.find({referral: "lahkan"}, {
        "tutorialStep.hasFinishedTutorial": 1, referral: 1, lastGames: 1
    })
    const usersTutorial = users.filter((e) => e.tutorialStep.hasFinishedTutorial === true)
    const users2Games = usersTutorial.filter((e) => e.lastGames.length >= 2)
    const users4Games = users2Games.filter((e) => e.lastGames.length >= 4)
    const users6Games = users4Games.filter((e) => e.lastGames.length >= 6)
    res.send(`
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
                     <meta http-equiv="X-UA-Compatible" content="ie=edge">
         <title>Sponsorship results</title>
         <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');
        </style>
    </head>
    <body style="font-family: 'Roboto', sans-serif; display: flex; flex-direction: column; gap: 0.5rem; text-align: center; font-size: 1.2rem;">
         
        <p>Accounts created: <span style="font-size:1.6rem">${users.length}</span></p>
        <p>Tutorial completed: <span style="font-size:1.6rem">${usersTutorial.length}</span></p>
        <p>2 games completed: <span style="font-size:1.6rem">${users2Games.length}</span></p>
        <p>4 games completed: <span style="font-size:1.6rem">${users4Games.length}</span></p>
        <p>6 games completed: <span style="font-size:1.6rem">${users6Games.length}</span></p>
    </body>
</html>`);
});

module.exports = router;