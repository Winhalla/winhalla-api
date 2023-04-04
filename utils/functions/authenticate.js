const speakez = require('speakeasy')
const renderFx = require('./renderFx')
const verifyAuthenticator = (code) => {
    return speakez.totp.verify({
        secret: process.env.SECRET,
        encoding: "ascii",
        token: code

    })
}
const sessionDuration = 10800
function renderFakeError(req, res) {
    res.status(404).send(renderFx("fakeError", {
        method: req.method,
        path: req.originalUrl
    }))
}

module.exports = function authenticate(req, res, callback) {
    if (!req.user) return renderFakeError(req,res)
    if (req.user.id === process.env.PHILTROM) {
        if (req.query.pwd !== process.env.ADMIN_PWD_PHILTROM) return renderFakeError(req, res)
        let verified;
        if (req.query.otp.length <= 6) verified = verifyAuthenticator(req.query.otp)
        else {
            verified = !!process.tempAdminKeys.find(e => e.tempKey === req.query.otp && e.timestamp > Date.now() / 1000 - sessionDuration);
        }
        if (verified === true) {
            callback()
        } else renderFakeError(req, res)

    } else if (req.user.id === process.env.FELONS) {
        if (req.query.pwd !== process.env.ADMIN_PWD_FELONS) return renderFakeError(req, res)
        let verified;
        if (req.path === "/config") verified = verifyAuthenticator(req.query.otp)
        else {
            verified = !!process.tempAdminKeys.find(e => e.tempKey === req.query.otp && e.timestamp > Date.now() / 1000 - sessionDuration);
        }
        if (verified === true) {
            callback()
        } else renderFakeError(req, res)
    } else {
        return renderFakeError(req, res)
    }
}