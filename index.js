import mongoose from 'mongoose';

import uuid from 'node-uuid';

import express from 'express';
var app = express();
app.use(express.json())

let dbURI = 'mongodb://127.0.0.1:27017/min-vpn'

// Define Schemas

var UserSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    username: { type: String, required: false },
    first_name: { type: String, required: false },
    last_name: { type: String, required: false },
    active: { type: Boolean, required: true }, // this will be either Active / Not Active
    billing: { type: String, requried: false },
    next_billing: { type: String, requried: false },
    public_key: { type: String, required: false }
}, { collection: "users" });

var PromoSchema = new mongoose.Schema({
    code: { type: String, unique: true }
}, { collection: "promo" });

var PaymentSchema = new mongoose.Schema({
    uuid: {
        type: String, unique: true, default: function genUUID() {
            return uuid.v4()
        }
    },
    status: { type: String, default: "pending" },
    ammount: { type: Number, required: true },
    date: { type: Date, required: true }
}, { collection: "payments" });

// Connect to database

mongoose.connect(dbURI, { useUnifiedTopology: true, useNewUrlParser: true }, error => {
    if (!error) {
        console.log("Connected to db")
    } else {
        console.log(error)
    }
})

// Wireguard settings

import path from 'path'
import { fileURLToPath } from 'url';

import { WgConfig } from 'wireguard-tools'

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '/configs', '/wg0.conf')

import { publicIpv4 } from 'public-ip';

const port = 54210
const endpoint = await publicIpv4() + ":" + port

// const endpoint = "192.168.64.2:58468"

async function addUser(){
    const server = new WgConfig({ filePath })
    await server.parseFile()

    const filePath2 = path.join(__dirname, '/configs', '/client.conf')
    
    const client = new WgConfig({
        wgInterface: { address: ['10.10.1.2'] },
        filePath: filePath2,
    })
    
    await Promise.all([
        server.generateKeys({ preSharedKey: true }),
        client.generateKeys()
    ])
    
    server.addPeer(client.createPeer({
        allowedIps: ['10.10.1.1/32'],
        preSharedKey: server.preSharedKey,
    }))
    
    client.addPeer(server.createPeer({
        allowedIps: ['0.0.0.0/0'],
        preSharedKey: server.preSharedKey,
        endpoint: endpoint
    }))
    
    client.writeToFile()
    
    await server.save()

    return filePath2
}


// Define sessions

const sessions = mongoose.connection.collection("users");

import { Bot, session, InputFile, InlineKeyboard } from "grammy";
import { Menu, MenuRange } from "@grammyjs/menu";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

const bot = new Bot('5709156476:AAGp0CmUQ5PhZMq2AcHAo57CiWCsNzB3R60');

bot.use(session({ initial: () => ({}), storage: new MongoDBAdapter({ collection: sessions }) }));

const main = new Menu("home-menu")
    .submenu("Личный кабинет", "settings-menu", async (ctx) => {
        let badge = ctx.session.badge

        await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
            caption: `${badge.chat.first_name}`
        })
    })
    .submenu("Тарифы", "tarifs-menu").row()
    .url("Поддержка и Вопросы", "https://t.me/mikedegeofroy");

const tarifs = new Menu("tarifs-menu").submenu(
    "Месяц - 250 rub",
    "payment-menu"
).row().back("Назад")

const payment = new Menu("payment-menu")
    .back("Назад")
    .dynamic(async (ctx) => {
        console.log("Tarif 1")

        let badge = ctx.session.badge

        let payment_url = await newPayment(200, badge.chat.id)

        await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
            caption: `К оплате 200 руб`
        })

        const button = new MenuRange();

        return button.url("Оплата", payment_url)
    });

const settings = new Menu("settings-menu").text(
    "Пригласить друга",
    async (ctx) => {
        let tmp = await ctx.reply("Comming soon!")

        setTimeout(async () => {
            await bot.api.deleteMessage(tmp.chat.id, tmp.message_id)
        }, 600)
    },
).back("Назад", async (ctx) => {
    let badge = ctx.session.badge

    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
        caption: `VPN достаточно часто блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, его на много труднее заблокировать, так как его нет на маректплейсах, на нём мало пользователей, и используются нетрадициональные алгоритмы для VPN тунеля.`
    })
})

main.register(settings);

main.register(tarifs);

tarifs.register(payment)

bot.use(main);

bot.command("start", async (ctx) => {

    console.log(ctx.match)

    ctx.deleteMessage()

    let users = mongoose.model("users", UserSchema);

    await users.findOneAndUpdate({ "key": `${ctx.from.id}` }, { "username": ctx.from.username, "first_name": ctx.from.first_name, "last_name": ctx.from.last_name }, { upsert: true, new: true }, (err, result) => {
        if (err) {
            // console.log(err);
        } else {
            // console.log(result);
        }
    }).clone()

    ctx.session.badge = await ctx.replyWithPhoto(new InputFile("header.png"), {

        caption: `VPN достаточно часто блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, его на много труднее заблокировать, так как его нет на маректплейсах, на нём мало пользователей, и используются нетрадициональные алгоритмы для VPN тунеля.`, reply_markup: main
    })

});

async function newPayment(ammount, uid) {

    console.log(ammount, uid)

    let payment = mongoose.model("payment", PaymentSchema);

    let mypayment = await payment.create({ ammount: ammount, date: new Date(), status: "pending" })

    console.log(mypayment)

    let url = 'https://api.yookassa.ru/v3/payments';

    let options = {
        method: 'POST',
        headers: {
            'Idempotence-Key': mypayment.uuid,
            'Content-Type': 'application/json',
            Authorization: 'Basic OTM1NzMyOnRlc3RfaTVqSUF0RHlFUGZHSGw5YWVhYmlwb3VyUW5FUkJ1ZndQN2RVd29SdTljdw=='
        },
        body: `{"amount":{"value": ${ammount},"currency":"RUB"},"capture":true,"confirmation":{"type":"redirect","return_url":"http://192.168.64.2:3001/callback?key=${uid}"},"description":"Miau"}`
    };

    let confirmUrl = ""

    await fetch(url, options)
        .then(res => res.json())
        .then((json) => {
            confirmUrl = json.confirmation.confirmation_url
        })
        .catch(err => console.error('error:' + err));


    return confirmUrl

}

app.listen(3000, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("listen:3000");
    }
});

app.post('/update', async (req, res) => {
    // res.json({ response: "Updated user" })

    // Ideally I would create and send a file from here, we also need a installation tutorial...

    console.log(req.body)

    let users = mongoose.model("users", UserSchema);

    let user = await users.findOne(req.body)

    user = user.toObject()

    console.log(user)

    let badge = user.value.badge

    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
        caption: `"Payment completed!"`
    })

    // Install script

    let file = await addUser();

    await bot.api.sendDocument(badge.chat.id, new InputFile(file, "minVPN.conf"));


})

// Error catcher, start bot

bot.catch((error) => {
    console.log(error)
})


bot.start()