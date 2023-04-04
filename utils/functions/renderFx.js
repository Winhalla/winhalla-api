const fs = require('fs')
module.exports = function (view, options) {
    let file;
    try{
        file = fs.readFileSync(`${process.cwd()}/views/${view}.html`, "utf8")
    } catch(e){
        throw new Error(`View ${view} does not exist`)
    }
    Object.keys(options).forEach((e) => {
        file = file.replace(`{${e}}`, options[e])
    })
    return file
}