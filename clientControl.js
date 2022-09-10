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


function checkPayment() {
    return true
}