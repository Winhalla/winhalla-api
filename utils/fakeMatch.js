const nameAssetsArray = [
    ["Philtrom", "https://lh3.googleusercontent.com/a-/AOh14GhVyu-_ZuRAsE6tQe-DQ2MQYRhYN5Da5xRJYBQXkQ"],
    ["Felons", "https://lh3.googleusercontent.com/a-/AOh14GhuVD9VhDm-Zb3SCRrnAe-L322pTgZsnexZ3Rij"],
    ["The Loved One", "https://lh3.googleusercontent.com/a-/AOh14Gij4iIi2fWHwLTVCrieVoDfJ0Zqg_jztK8qIWK7ew"]
];
function returnOtherPlayersArray(currentDate){
    let otherPlayersArray = [];
    for (let i = 0; i < 3; i++){
        otherPlayersArray.push({
            "wins": (i+1)*2,
            "gamesPlayed": 7,
            "totalGamesPlayedByPlatform": [0],
            "multiplier": 100,
            "adsWatched": 0,
            "updateCount": 0,
            "_id": "61a69b11616e3b45786aaa4e"+i,
            "steamId": "google100943440915784958511"+i,
            "allBrawlhallaIds": [
                {
                    "BID": "29163214"+i,
                    "name": nameAssetsArray[i][0],
                    "platformId": "ps"
                }
            ],
            "username": nameAssetsArray[i][0],
            "totalWins": 1,
            "totalGamesPlayed": 2,
            "avatarURL": nameAssetsArray[i][1],
            "joinDate": currentDate,
            "lastRefresh": currentDate
        })
    }
    return otherPlayersArray;
}
module.exports = {
    "notRefreshed":(user)=>{
        let currentDate = Date.now()
        return {
            "finished": false,
            "fastFinish": false,
            "_id": "tutorial",
            "remainingSpace": 4,
            "Date": 1638296873259,
            "players": [
                {
                    "wins": 0,
                    "gamesPlayed": 0,
                    "totalGamesPlayedByPlatform": [0],
                    "multiplier": 100,
                    "adsWatched": 0,
                    "updateCount": 0,
                    "steamId": user.steamId,
                    "allBrawlhallaIds": [
                        {
                            "BID": "1",
                            "name": user.brawlhallaName,
                            "platformId": "ps"
                        }
                    ],
                    "username": user.brawlhallaName,
                    "totalWins": 0,
                    "totalGamesPlayed": 0,
                    "avatarURL": user.avatarURL,
                    "joinDate": currentDate,
                    "lastRefresh": currentDate
                },
                ...returnOtherPlayersArray(currentDate)
            ],
        }
    }, "refreshed":(user)=>{
        let currentDate = Date.now()

        return {
            "finished": false,
            "fastFinish": false,
            "_id": "tutorial",
            "remainingSpace": 4,
            "Date": 1638296873259,
            "players": [
                {
                    "wins": 4,
                    "gamesPlayed": 7,
                    "totalGamesPlayedByPlatform": [7],
                    "multiplier": 100,
                    "adsWatched": 0,
                    "updateCount": 0,
                    "steamId": user.steamId,
                    "allBrawlhallaIds": [
                        {
                            "BID": "1",
                            "name": user.brawlhallaName,
                            "platformId": "ps"
                        }
                    ],
                    "username": user.brawlhallaName,
                    "totalWins": 4,
                    "totalGamesPlayed": 7,
                    "avatarURL": user.avatarURL,
                    "joinDate": currentDate,
                    "lastRefresh": currentDate
                },
                ...returnOtherPlayersArray(currentDate)
            ],
        }
    }
}