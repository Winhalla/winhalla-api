module.exports = function special6(stats,levels,eligible,time){                       
                        
    //let eligible = []
    function getEligibleLegends(maxLevel){
        stats.data.legends.forEach(element=>{
            levels.push(element.level)
            if(element.level<maxLevel){
                //eligible.push({"name":element.legend_name_key,"level":element.level})
                eligible[element.legend_name_key] = element.wins
            }
        })
    }
    getEligibleLegends(10)
    eligible.max = 10
    if(levels.every(element=>element>9)) {
        let min = Math.min(...levels) + 2
        eligible.max = min
        getEligibleLegends(min)
        quests[time][6].name = `Win a game with a character below level ${min}`
    }
}