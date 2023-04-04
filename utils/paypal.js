const axios = require('axios')
const ObjectId = require('mongoose').Types.ObjectId;
let accessToken;
let expirationDate;
module.exports = async function (amount, email) {
    // Decline more than 100$ requests
    if (amount > 100) return {code: "error", message: "Amount must be less than 100"}
    if (amount < 1) return {code: "error", message: "Amount must be more than 1"}
    //Get a new token if the one before expired
    if (!accessToken || Date.now() > expirationDate) {
        accessToken = (await axios.post('https://api-m.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US'
            }, auth: {
                'username': process.env.PAYPAL_USERNAME,
                'password': process.env.PAYPAL_PASSWORD
            }
        })).data
        //Store the expiration date as UNIX timmestamp
        expirationDate = Date.now() + accessToken.expiresIn * 994 // not *1000 to have a 3 minute margin between expiration and regeneration of the token
        //Store the token
        accessToken = accessToken.access_token
    }
    //Send money
    try {
        let payout = await axios.post('https://api-m.paypal.com/v1/payments/payouts', {
            "sender_batch_header": {
                "sender_batch_id": ObjectId(), //Has to be unique
                "email_subject": `You have recieved ${amount}€ ! Thanks for using Winhalla`, //What appears in the email's title
                "email_message": `Thanks for using winhalla! ${amount}€  has been transferred to your paypal account. Enjoy!` // What appears in the email's body
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {
                        "value": amount,
                        "currency": "EUR"
                    },
                    "note": `Thanks for using winhalla! ${amount}€  has been transferred to your paypal account. Enjoy!`, // What appears in the notification (I guess)
                    "sender_item_id": ObjectId(),
                    "receiver": email,
                    "notification_language": "en-US"
                }
            ]
        }, {
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': 'Bearer ' + accessToken
            }
        })

        return {message: payout.data, code: "success", batchId: payout.data.batch_header.payout_batch_id, accessToken: accessToken}
    } catch (e) {
        console.log(e.response.data)
        return {code: "error", message: e.response.data}
    }

}