const { Router } = require('express');
const router = Router();
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
router.get('/informations', async (req,res)=>{
    const informations = process.dbConfig.find(e=>e.name ==="INFOS")
    // If there is informations then process them
    if (informations.value) {
        informations.value.forEach((e, i) => {
            //si la date dépasse l'expiration on n'affiche pas l'information
            if (Date.now()>=e.expiration) informations.value.splice(i, 1)
        });
    }
    // Send processed information data and gold event data
    res.send({information:informations.value,event:process.dbConfig.find(e=>e.name ==="GOLD EVENT").value});
})

//! Not used
router.get('/advices', async (req, res) => {
    if (!req.user) {
        return res.sendStatus(204)
    }
    else {
        let advice;
        const advices = process.dbConfig.find(e=>e.name ==="ADVICES")
        if (getRandomInt(advices.value.probability) === 1) {
            advice = advices.value.advices[getRandomInt(advices.value.advices.length)]
        }
        res.send({advices:advice})
    }
})
/*router.post('/informationRead',async (req,res)=>{
    // empêcher de set n'importe quel cookie
    // vérifier l'increment
    if(!req.body)return res.sendStatus(400)
    let cookieInfos = req.headers.cookie.split("; ").find(e => e.includes("informationRead"))
    if(cookieInfos) {
        cookieInfos.split("=")[1].split(",");
        console.log(cookieInfos)
        if(typeof cookieInfos == 'string'){
            if(cookieInfos == req.body.name) return res.send('OK')
        }else{
            if(cookieInfos.some(e=>e==req.body.name)) return res.send('OK')
        }
    }
    await config.updateOne({name:'INFOS',"value.name":req.body.name},{$inc:{"value.$.seen":1}})
    cookieArray = [req.headers.cookie.split('; ').find(e => e.includes("informationRead")).split("=")[1].split(",")]
    if(req.body.name) cookieArray.push(req.body.name)
    res.setHeader('Set-Cookie',cookieArray)
    res.sendStatus(200)
})*/


module.exports = router;
