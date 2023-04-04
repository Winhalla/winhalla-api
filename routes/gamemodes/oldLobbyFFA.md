```js
router.get('/a', async function (req, res) {

    if (req.user == undefined) {
        res.status(403);
        return res.send('Unauthorized');
    }

    let trueArray = [];
    const lobbies = await lobby.find({started:false});
    let found = false;
    let already = false;
    for (let i = 0; i < lobbies.length; i++) {
        for (let a = 0; a < lobbies[i].players.length; a++) {
            if (lobbies[i].players[a].steamId == req.user.id && lobbies[i].players[a].gamesPlayed < 10) {
                found = true
                return res.status(200).json(lobbies[i]._id)
            }
        }
    }
    if (found == false) {
        let brawlhallaId;
        let wins;
        try {
            brawlhallaId = await axios.get(`https://api.brawlhalla.com/search?steamid=${req.user.id}&api_key=${process.env.API_KEY}`)
            wins = await axios.get(`https://api.brawlhalla.com/player/${brawlhallaId.data.brawlhalla_id}/ranked?api_key=${process.env.API_KEY}`)
        } catch (error) { console.log(error) }
        
        let duoWins = 0
        let duoGames = 0
        wins.data['2v2'].forEach(element => {
            duoWins = duoWins + element.wins;
            duoGames = duoGames + element.games
            
        });
        if (lobbies == '') {
            const post = new lobby({
                remainingSpace: 9,
                Date: Date.now(),
                players: [{
                    steamId: req.user.id,
                    brawlhallaId: brawlhallaId.data.brawlhalla_id,
                    username: brawlhallaId.data.name,
                    wins: 0,
                    totalWins: wins.data.wins + duoWins,
                    gamesPlayed: 0,
                    totalGamesPlayed: wins.data.games + duoGames,
                    avatarURL: req.user.picture,
                }]
            });

            try {
                const savedLobby = await post.save()
                res.json(savedLobby._id)
            } catch (error) {
                return console.log(error)
            }

        } else if (lobbies != '') {

            for (let i = 0; i < lobbies.length; i++) {

                if (lobbies[i].remainingSpace > 0) {

                    try {
                        const lobby1 = lobbies[i]
                        if (lobby1.players.some((element) => element.steamId == req.user.id)) {
                            already = true
                        }
                        else {
                            let start = false
                            if(lobby1.remainingSpace == 1){
                                start = true
                            }
                            const lobbyUpdated = await lobby.findOneAndUpdate(
                                { _id: lobby1._id },
                                {
                                    $set: {
                                        remainingSpace: lobby1.remainingSpace - 1,
                                        started: start == true ? true:false,
                                        players: [...lobby1.players,
                                        {
                                            steamId: req.user.id,
                                            brawlhallaId: brawlhallaId.data.brawlhalla_id,
                                            username: brawlhallaId.data.name,
                                            wins: 0,
                                            totalWins: wins.data.wins,
                                            gamesPlayed: 0,
                                            totalGamesPlayed: wins.data.games,
                                            avatarURL: req.user.picture,
                                        }],
                                        Date:Date.now(),

                                    }
                                }, { new: true, useFindAndModify: false });

                            const io = req.app.get('socketio');
                            //console.log("U",lobbyUpdated)
                            io.emit('lobbyUpdate', lobbyUpdated);
                            res.json(lobby1._id);
                        }
                    } catch (error) {
                        console.log(error)
                    }


                    return trueArray.push('free')
                } else {
                    trueArray.push('full')
                }
            }

        }

        if (trueArray.every((element) => element == 'full') && trueArray.length > 0 | already == true) {

            const post = new lobby({
                remainingSpace: 9,
                Date: Date.now(),
                players: [{
                    steamId: req.user.id,
                    brawlhallaId: brawlhallaId.data.brawlhalla_id,
                    username: brawlhallaId.data.name,
                    wins: 0,
                    totalWins: wins.data.wins,
                    gamesPlayed: 0,
                    totalGamesPlayed: wins.data.games,
                    avatarURL: req.user.picture,
                }]
            });

            try {
                const savedLobby = await post.save()
                res.json(savedLobby._id)
            } catch (error) {
                return console.log(error)
            }
        }
    }
});
```