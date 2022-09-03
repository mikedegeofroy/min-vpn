import mongoose from 'mongoose';

import uuid from 'node-uuid';

import express from 'express';
var app = express();
app.use(express.json()) 

import fetch from 'node-fetch';

let dbURI = 'mongodb://127.0.0.1:27017/min-vpn'

var PersonSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    username: { type: String, required: false },
    first_name: { type: String, required: false },
    last_name: { type: String, required: false },
    active: { type: Boolean, required: true }, // this will be either Active / Not Active
    billing: { type: String, requried: false },
    next_billing: { type: String, requried: false }
}, { collection: "users" });

var PromoSchema = new mongoose.Schema({
    code: { type: String, unique: true }
}, { collection: "promo" });

var PaymentSchema = new mongoose.Schema({
    uuid: { type: String, unique: true, default: function genUUID() {
        return uuid.v4()
    }},
    status: {type: String, default: "pending"},
    ammount: {type: Number, required: true},
    date: {type: Date, required: true}
}, { collection: "payments" });

mongoose.connect(dbURI, { useUnifiedTopology: true, useNewUrlParser: true }, error => {
    if (!error) {
        console.log("Connected to db")
    } else {
        console.log(error)
    }
})

const sessions = mongoose.connection.collection("users");

import { Bot, InlineKeyboard, session, InputFile } from "grammy";
import {
    conversations,
    createConversation,
} from "@grammyjs/conversations";
import { hydrate } from "@grammyjs/hydrate";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

const bot = new Bot('5709156476:AAGp0CmUQ5PhZMq2AcHAo57CiWCsNzB3R60');

// Привет Мишель!

// У вас нет активной подписки
// Подписка активна до 12-213-312

bot.use(hydrate());

bot.use(session({ initial: () => ({}), storage: new MongoDBAdapter({ collection: sessions }) }));

bot.use(conversations());

bot.callbackQuery("promo", async (ctx) => {

    console.log(ctx.session.badge)

    let badge = ctx.session.badge


    let inlineKeyboard = new InlineKeyboard().text(
        "Назад",
        "home",
    )

    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
        caption: `Введите промокод`, reply_markup: inlineKeyboard
    })

    console.log("called promo")
    await ctx.conversation.enter("promo");
});

async function promo(conversation, ctx) {

    let badge = ctx.session.badge

    let inlineKeyboard = new InlineKeyboard().text(
        "Назад",
        "home",
    )
    
    const res = await conversation.waitFor("message:text");
    
    await res.deleteMessage()
    
    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
        caption: `Секундочку...`
    })

    let promo = mongoose.model("orders", PromoSchema);

    let response = await promo.findOne({ "code": { $regex: res.message.text } })

    if(response != null){
        await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
            caption: `Найс`, reply_markup: inlineKeyboard
        })
    } else {
        await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
            caption: `Промокод не найден в базе данных`, reply_markup: inlineKeyboard
        })
    }
}

bot.callbackQuery("home", async (ctx) => {
    await ctx.conversation.exit("promo");
    console.log("called home");
    await ctx.conversation.enter("home");
});

async function home(conversation, ctx) {
    console.log("Entered home convo")

    let inlineKeyboard = new InlineKeyboard().text(
        "Промокод",
        "promo",
    ).text(
        "Тарифы",
        "tarifs",
    ).row().url("Поддержка и Вопросы", "https://t.me/mikedegeofroy")

    if (ctx.session.badge) {

        let badge = ctx.session.badge

        await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
            caption: `VPN постоянно блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, который на много труднее заблокировать.

        ${badge.chat.first_name}
            
        Нет активной подписки
            
Нихуя себе, работает
            `, reply_markup: inlineKeyboard
        })

    } else {
        
        ctx.session.badge = await ctx.replyWithPhoto(new InputFile("header.png"), {

            caption: `VPN постоянно блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, который на много труднее заблокировать.
            
        ${ctx.update.message.from.first_name}
            
        Нет активной подписки
            
Нихуя себе, работает
            `, reply_markup: inlineKeyboard
        })


        await ctx.deleteMessage();
    }



    // const update = await conversation.wait();

    // console.log(update)

    // await ctx.conversation.exit();

}

bot.callbackQuery("tarifs", async (ctx) => {
    await ctx.conversation.enter("tarifs");
});

async function tarifs(conversation, ctx) {

    console.log("Entered tarifs convo")

    let badge = ctx.session.badge

    let inlineKeyboard2 = new InlineKeyboard().text(
        "Месяц - 200 rub",
        "tarif1",
    ).row().text(
        "3 Месяца - 600 rub",
        "tarif2",
    ).row().text(
        "6 Месяцев - 1200 rub",
        "tarif3",
    ).row().text(
        "Назад",
        "home",
    )

    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, { reply_markup: inlineKeyboard2, caption: `VPN постоянно блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, который на много труднее заблокировать.

    ${badge.from.first_name}
        
    Нет активной подписки
        
Нихуя себе, работает
        `})

}

bot.use(createConversation(tarifs));

bot.callbackQuery("tarif1", async (ctx) => {
    console.log("Tarif 1")

    let badge = ctx.session.badge

    let payment_url = await newPayment(200, badge.chat.id)

    console.log(payment_url)

    let inlineKeyboard = new InlineKeyboard().text(
        "Назад",
        "tarifs",
    ).url(
        "Оплатить",
        payment_url
    )

    await bot.api.editMessageCaption(badge.chat.id, badge.message_id, {
        caption: `К оплате 200 руб`, reply_markup: inlineKeyboard
    })

});

bot.callbackQuery("tarif2", async (ctx) => {
    console.log("Tarif 2")


});

bot.callbackQuery("tarif3", async (ctx) => {
    console.log("Tarif 3")
    

});

async function newPayment(ammount, uid){

    console.log(ammount, uid)

    let payment = mongoose.model("payment", PaymentSchema);

    let mypayment = await payment.create({ ammount: ammount, date: new Date() })

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

app.listen(3000, function(err) {
    if(err){
       console.log(err);
       } else {
       console.log("listen:3000");
    }
});

app.post('/update', async (req, res) => {
    // res.json({ response: "Updated user" })
    
    res.redirect('https://t.me/minvpnbot')

    console.log(req.body)

    // Install script

    await bot.api.sendMessage(req.body.key, "Payment completed!");

    // await ctx.conversation.enter("installation");

})

async function installation(conversation, ctx){
    console.log("Entered home convo")
}

bot.use(createConversation(promo));

bot.use(createConversation(home));

bot.command("start", async (ctx) => {

    console.log("called start")

    let users = mongoose.model("users", PersonSchema);

    await users.findOneAndUpdate({ "key": `${ctx.from.id}` }, { "username": ctx.from.username, "first_name": ctx.from.first_name, "last_name": ctx.from.last_name }, { upsert: true, new: true }, (err, result) => {
        if (err) {
            // console.log(err);
        } else {
            // console.log(result);
        }
    }).clone()

    await ctx.conversation.enter("home")
});

bot.catch((error) => {
    console.log(error)
})


bot.start()