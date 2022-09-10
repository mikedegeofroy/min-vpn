// import { Wg } from 'wireguard-wrapper';

import fetch from 'node-fetch'

import mongoose from 'mongoose';

let dbURI = 'mongodb://127.0.0.1:27017/min-vpn'

var PaymentSchema = new mongoose.Schema({
    uuid: {
        type: String, unique: true, default: function genUUID() {
            return uuid.v4()
        }
    },
    ammount: { type: Number, required: true },
    date: { type: Date, required: true }
}, { collection: "payments" });

var UserSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    username: { type: String, required: false },
    first_name: { type: String, required: false },
    last_name: { type: String, required: false },
    active: { type: Boolean, required: true }, // this will be either Active / Not Active
    billing: { type: Date, requried: false },
    next_billing: { type: Date, requried: false },
    public_key: { type: String, required: false }
}, { collection: "users" });

mongoose.connect(dbURI, { useUnifiedTopology: true, useNewUrlParser: true }, error => {
    if (!error) {
        console.log("Connected to db")
    } else {
        console.log(error)
    }
})

import express from 'express';
var app = express();
app.use(express.json())

// The idea is to have a recurring check every 12h for the membership, if it is spoiled, then send a message asking if the person wants to renew their subscription. 

app.listen(3001, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Listening on port 3001");
    }
});

app.post('/callback', async (req, res) => {
    console.log(req.body)

    let payments = mongoose.model("payments", PaymentSchema);

    if (req.body.event == 'payment.succeeded') {
        let uuid = req.body.object.id

        await payments.findOneAndUpdate({ "uuid": uuid }, { status: "succeeded" }, (err, result) => {
            if (err) {
                // console.log(err);
            } else {
                // console.log(result);
            }
        }).clone()

        let users = mongoose.model("users", UserSchema);

        if(req.body.object.amount.value == '200.00'){
            let user = await users.findOneAndUpdate({key: req.body.object.metadata.key}, { "billing": new Date() }, { upsert: true, new: true }).clone()

            let next_billing

            if(user.next_billing){
                next_billing = user.next_billing
                next_billing.setMonth(next_billing.getMonth() + 1);
            } else {
                next_billing = new Date()
                next_billing.setMonth(next_billing.getMonth() + 1);
            }

            await users.findOneAndUpdate({key: req.body.object.metadata.key}, { "next_billing": next_billing }, { upsert: true, new: true }).clone()
        }


        let url = 'http://localhost:3000/update';

        let options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: `{"key":${req.body.object.metadata.key}, "type":"added"}`
        };
    
        fetch(url, options)
            .then(res => res.json())
            .then(json => console.log(json))
            .catch(err => console.error('error:' + err));

    }

    res.sendStatus(200)
})

process.on('uncaughtException', function (err) {
    console.log(err);
});

setInterval( () => {

    // Look for accounts with due billing

}, 43200000)