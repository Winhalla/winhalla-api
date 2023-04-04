const dailyChallenges = require('./dailyChallenges.json')
const userScheme = require('../models/userSchema')
const admin = require("firebase-admin")
const resetDelay = 57600000
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    "getNewChallenges": async function (user, isApple) {
        user.dailyChallenge = {challenges: [], lastRefresh: 0}
        for (let i = 0; i < 3; i++) {
            const quest = dailyChallenges[i == 1 && isApple ? (i-1).toString() : i.toString()][getRandomInt(dailyChallenges[i == 1 && isApple ? (i-1).toString() : i.toString()].length)];
            user.dailyChallenge.challenges.push(quest);
            user.dailyChallenge.challenges[i].progress = 0;
            user.dailyChallenge.challenges[i].completed = false;
            user.dailyChallenge.challenges[i].active = i === 0;
        }
        user.dailyChallenge.lastRefresh = Date.now();
        user.dailyChallenge.hasReceivedNotification = false
        await userScheme.updateOne({steamId: user.steamId}, {dailyChallenge: user.dailyChallenge})
        return user;
    },
    "incChallengeProgress": async function (user, challengeGoal) {
        let challengeIndex = user.dailyChallenge.challenges.findIndex(e => e.active && e.goal === challengeGoal)
        let challenge = user.dailyChallenge.challenges[challengeIndex];
        if (challenge && challenge.active === true) {

            let updateObject = {
                $set: {},
                $inc: {},
                $push: {}
            }
            challenge.progress += 1;
            if (challenge.progress >= challenge.goalNb) {
                const logObj = {
                    type: `dailyChallenge`,
                    displayName: `Daily challenge`,
                    data: {
                        reward: challenge.reward,
                        name: "Daily challenge: " + challenge.name
                    },
                    timestamp: Date.now()
                }
                updateObject.$inc["coinLogs.total.dailyChallenge"] = challenge.reward
                updateObject.$push["coinLogs.history"] = logObj
                updateObject.$inc[`dailyChallenge.challenges.${challengeIndex}.progress`] = 1
                updateObject.$set[`dailyChallenge.challenges.${challengeIndex}.active`] = false;
                updateObject.$set[`dailyChallenge.challenges.${challengeIndex}.completed`] = true;

                if (user.dailyChallenge.challenges[challengeIndex + 1])
                    updateObject.$set[`dailyChallenge.challenges.${challengeIndex + 1}.active`] = true;

                updateObject.$inc.coins = challenge.reward;
                updateObject.$inc.coinsThisWeek = challenge.reward;
            } else {
                updateObject.$inc[`dailyChallenge.challenges.${challengeIndex}.progress`] = 1
            }

            await userScheme.updateOne({steamId: user.steamId}, updateObject)

        }
    },
    "dailyChallengeNotification": async function () {
        // Create new property in userSchema : dailyChallenge.hasReceivedNotification: bool
        // Store the date to query and update the same documents (recalling Date.now() could query documents that didnt recieve the notifications)
        const currentDate = Date.now()
        let challengeExpiredUsers = await userScheme.find({
            "dailyChallenge.lastRefresh": {$lt: currentDate - resetDelay},
            "dailyChallenge.hasReceivedNotification": {$ne: true},
            "notificationTokens.0": {$exists: true},
            "tutorialStep.hasFinishedTutorial": true
        }, {
            notificationTokens: 1
        })
        if(challengeExpiredUsers.length === 0) return;
        for (let i = 0; i < Math.ceil(challengeExpiredUsers.length/500); i++) {
            admin.messaging().sendMulticast({
                tokens: challengeExpiredUsers.slice(i*500, ((i+1)*500)-1).map(e=>e.notificationTokens).flat(),
                notification: {
                    title: "New daily challenge available!",
                    body: "It's time to grind and earn money!",
                },
                data: {
                    route: "/home?page=0",
                },
                android: {
                    collapseKey: "daily_challenge_reset",
                    notification: {
                        channel_id: "daily_challenge_reset",
                        tag: "daily_challenge_reset",
                    },
                }
            })
        }
        await userScheme.updateMany({
            "dailyChallenge.lastRefresh": {$lt: currentDate - resetDelay},
            "dailyChallenge.hasReceivedNotification": false
        }, {"dailyChallenge.hasReceivedNotification": true})
    },
    "resetDelay": resetDelay
}