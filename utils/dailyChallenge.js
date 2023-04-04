const dailyChallenges = require('./dailyChallenges.json')
const userScheme = require('../models/userSchema')

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    "getNewChallenges": async function (user) {
        user.dailyChallenge = {challenges: [], lastRefresh: 0}
        for (let i = 0; i < 3; i++) {
            const quest = dailyChallenges[i.toString()][getRandomInt(dailyChallenges[i.toString()].length)];
            user.dailyChallenge.challenges.push(quest);
            user.dailyChallenge.challenges[i].progress = 0;
            user.dailyChallenge.challenges[i].completed = false;
            user.dailyChallenge.challenges[i].active = i === 0;
        }
        user.dailyChallenge.lastRefresh = Date.now();
        await userScheme.updateOne({steamId: user.steamId}, {dailyChallenge: user.dailyChallenge})
        return user;
    },
    "incChallengeProgress": async function (user, challengeGoal) {
        let challengeIndex = user.dailyChallenge.challenges.findIndex(e => e.active && e.goal === challengeGoal)
        let challenge = user.dailyChallenge.challenges[challengeIndex];
        if (challenge) {

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
    }
}