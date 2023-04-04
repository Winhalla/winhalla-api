module.exports =
    /**
     * @user MongoDB document of the user
     * @linkFound the friendLink the user belongs to
     * @baseMultiplier the base multiplier (100 is advised, other values can be supplied in special cases)
     * @adMultiplier the (FFA) multiplier for ads watched
     */
    function (user, linkFound, baseMultiplier, adMultiplier) {
        const eventData = process.dbConfig.find(e=>e.name ==="GOLD EVENT")
        const linksData = process.dbConfig.find(e=>e.name ==="LINKS CONFIG")
        let multiplier = baseMultiplier
            , multiplierDetails = {base: baseMultiplier, event: 0, link: 0, player: 0, ad: 0}
        if (user.boost > 0) {
            if (Date.now() <= user.boostExpiration) {
                multiplier += user.boost
                multiplierDetails.player = user.boost
            }
        }
        if (adMultiplier) {
            multiplier += adMultiplier
            multiplierDetails.ad = adMultiplier
        }
        if (linkFound) {
            if (Date.now() + (linksData.value.duration * 1000 * 3600 * 24) >= linkFound.childs.find(e => e.id === user.steamId).joined) {
                multiplier *= (linksData.value.boost + 100) / 100
                multiplierDetails.link = linksData.value.boost
            }
        }
        if (Date.now() <= eventData.value.expiration) {
            multiplier *= (eventData.value.percentage)/100
            multiplierDetails.event = eventData.value.percentage
        }
        multiplier = multiplier / 100
        return {multiplier, multiplierDetails}
    }
