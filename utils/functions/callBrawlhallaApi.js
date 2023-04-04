const axios = require("axios");
const baseData = require("../baseAccountData.json")

function sendError(statusText, statusCode, res) {
    if (res === false) return
    res.status(statusCode).send(statusText)
}


module.exports = async (accounts, calls, res, shouldHandleError, strictOnError) => {


    if (accounts === undefined) {
        sendError("Brawlhalla ID was not specified", 400, res)
        return {stats: "err"}
    }
    if (typeof accounts === "string" || typeof accounts === "number") accounts = [{BID: accounts}]
    let brawlhallaStats = []
    for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i]
        let stats;
        let ranked;
        let search;
        if (calls === "stats" || calls === "all") {
            stats = axios.get(`https://api.brawlhalla.com/player/${account.BID}/stats?api_key=${process.env.API_KEY}`)
        }
        if (calls === "ranked" || calls === "all") {
            ranked = axios.get(`https://api.brawlhalla.com/player/${account.BID}/ranked?api_key=${process.env.API_KEY}`)
        }
        if (calls === "search") {
            search = axios.get(`https://api.brawlhalla.com/search?steamid=${account.BID}&api_key=${process.env.API_KEY}`)
        }
        brawlhallaStats.push({stats: stats, ranked: ranked, search: search})
    }
    for (const e of brawlhallaStats) {
        const i = brawlhallaStats.indexOf(e);
        if(e.stats instanceof Promise) {
            try{
                brawlhallaStats[i].stats = await e.stats
            } catch (err) {
                console.log("error on call:", err?.response?.data)
                if (shouldHandleError === false) return "err"
                if (err?.response?.status === 429) {
                    sendError("Brawlhalla stats servers are overloaded. Please try again later", 502, res)
                    return {stats: "err", code: 429}
                } else if (err?.response?.status === 503) {
                    sendError("Brawlhalla stats servers are unavailable. Please come back later", 503, res)
                    return {stats: "err", code: 503}
                } else {
                    console.error(err)
                    sendError(err?.message, 500, res)
                    return {stats: "err"}
                }
            }
            if (!brawlhallaStats[i].stats.data.name && !strictOnError) {
                brawlhallaStats[i].stats = {}
                brawlhallaStats[i].stats.data = baseData.ranked
                brawlhallaStats[i].stats.data.name = accounts[i].name
                brawlhallaStats[i].stats.data.brawlhalla_id = accounts[i].BID
            }
        }

        if(e.ranked instanceof Promise) {
            try{
                brawlhallaStats[i].ranked = await e.ranked
            } catch (err) {
                console.log("error on call:", err?.response?.data)
                if (shouldHandleError === false) return "err"
                if (err?.response?.status === 429) {
                    sendError("Brawlhalla stats servers are overloaded. Please try again later", 502, res)
                    return {stats: "err", code: 429}
                } else if (err?.response?.status === 503) {
                    sendError("Brawlhalla stats servers are unavailable. Please come back later", 503, res)
                    return {stats: "err", code: 503}
                } else {
                    sendError(err?.message, 500, res)
                    console.error(err)
                    return {stats: "err"}
                }
            }

            if (!brawlhallaStats[i].ranked.data.name && !strictOnError) {
                brawlhallaStats[i].ranked = {}
                brawlhallaStats[i].ranked.data = baseData.ranked
                brawlhallaStats[i].ranked.data.name = accounts[i].name
                brawlhallaStats[i].ranked.data.brawlhalla_id = accounts[i].BID
            }
        }
        if(e.search instanceof Promise) {
            try{
                brawlhallaStats[i].search = await e.search
            } catch (err) {
                console.log("error on call:", err?.response?.data)
                if (shouldHandleError === false) return "err"
                if (err?.response?.status === 429) {
                    sendError("Brawlhalla stats servers are overloaded. Please try again later", 502, res)
                    return {stats: "err", code: 429}
                } else if (err?.response?.status === 503) {
                    sendError("Brawlhalla stats servers are unavailable. Please come back later", 503, res)
                    return {stats: "err", code: 503}
                } else {
                    sendError(err?.message, 500, res)
                    console.error(err)
                    return {stats: "err"}
                }
            }
        }
    }
    return brawlhallaStats;
}