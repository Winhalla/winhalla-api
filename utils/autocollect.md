```js
if (dailies) {
                            let dailyActuals = []
                            let actualQuest;
                            element.solo.dailyQuests.forEach((elemen, i) => {
                                if (!element) return
                                dailyActuals = []
                                actualQuest = [quests.daily[elemen.id]]
                                actualsDaily(actualQuest, stats, ranked, dailyActuals, special6)
                                if (typeof dailyActuals[0] === "object") {
                                    let findProgress;
                                    let progress = elemen.progress
                                    Object.keys(dailyActuals[0]).forEach(e => {
                                        if (e == undefined) return
                                        if (e == 'max') return
                                        if (dailyActuals[0][e] != elemen.actual[e]) {
                                            findProgress = stats.data.legends[stats.data.legends.findIndex(element => element.legend_name_key == e)]
                                            progress = (findProgress.wins - elemen.actual[e]) + progress
                                        }
                                    })
                                    if (progress >= elemen.goal) {
                                        update.solo.finished.daily.push(elemen)                                       
                                    }
                                } else {
                                    if (dailyActuals - elemen.actual + elemen.progress >= elemen.goal) {
                                        update.solo.finished.daily.push(elemen)
                                    }
                                }
                            })
                        }

                        // Calculates actual values for weekly quests
                        let weeklyActuals = []
                        if (weeklies) {
                            element.solo.weeklyQuests.forEach((elemen, i) => {
                                if (!elemen) return
                                weeklyActuals = []
                                actualQuest = [quests.weekly[elemen.id]]
                                actualsWeekly(actualQuest, stats, ranked, weeklyActuals, special6)
                                if (typeof weeklyActuals[0] === "object") {
                                    let findProgress;
                                    let progress = elemen.progress
                                    Object.keys(weeklyActuals[0]).forEach(e => {
                                        if (e == undefined) return
                                        if (e == 'max') return
                                        if (weeklyActuals[0][e] != elemen.actual[e]) {
                                            findProgress = stats.data.legends[stats.data.legends.findIndex(element => element.legend_name_key == e)]
                                            progress = (findProgress.wins - elemen.actual[e]) + progress
                                        }
                                    })
                                    if (progress >= elemen.goal) {
                                        update.solo.finished.daily.push(elemen)
                                    }

                                }
                                if (weeklyActuals - elemen.actual + elemen.progress >= elemen.goal) {
                                    update.solo.finished.daily.push(elemen)
                                }
                            })
                        }
                        ```