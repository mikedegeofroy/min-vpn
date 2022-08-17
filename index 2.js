// Telegram bot

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { Bot, InlineKeyboard, session, InputFile } from "grammy";
import { hydrate } from "@grammyjs/hydrate";
import {
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import nodemailer from 'nodemailer'

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mikedegeofroy',
    pass: 'pvjfzcnqfnhxfixs'
  }
});

let dbURI = 'mongodb://127.0.0.1:27017/telegram-bot-api'

var OrderSchema = new mongoose.Schema({
  posting_number: { type: String, unique: true },
  date: {type: String, required: false },
  products: {type: Array, required: false }
}, { collection: "orders", required: false });

var PersonSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true, required: false },
  username: { type: String, required: false },
  first_name: { type: String, required: false },
  last_name: { type: String, required: false },
  email: { type: String, required: false },
  phone: { type: String, required: false },
  orders: { type: Array, required: false }
}, { collection: "people" });

mongoose.connect(dbURI, { useUnifiedTopology: true, useNewUrlParser: true }, error => {
  if (!error) {
    console.log("Connected to db")
  } else {
    console.log(error)
  }
})

async function getPostingNumber(id) {

  let url = 'https://api-seller.ozon.ru/v2/posting/fbo/list';

  let options = {
    method: 'POST',
    headers: {
      'Client-Id': '170246',
      'Api-Key': '4ff27aa0-e807-42f0-bb11-6ab376b39356',
      'Content-Type': 'application/json'
    },
    body: '{"dir":"DESC","limit":500,"offset":0,"filter":{"status":"delivered"},"translit":true,"with":{"analytics_data":true,"financial_data":false}}'
  };

  let orders = mongoose.model("orders", OrderSchema);

  await fetch(url, options)
    .then(res => res.json())
    .then(json => {
      json.result.forEach((element) => {
        let bought_products = element.products.map((element) => {
          return {
            name: element.name,
            price: parseInt(element.price),
            offer_id: element.offer_id
          }
        })
        orders.create({ posting_number: element.posting_number, date: element.created_at, products: bought_products }, (err, result) => {
          if (err) {
            // console.log(err);
          } else {
            console.log(result);
          }
        });
      })
    })
    .catch(err => console.error('error:' + err))

  async function checkNum(id) {
    let response = await orders.findOne({ "posting_number": { $regex: id } })
    if (!response) {
      return undefined
    }
    return response.posting_number
  }

  return await checkNum(id)

}

const bot = new Bot('5596272178:AAH1yClgbyUJHgZhGbyVa5Kqb8w1rEk4pjU');

bot.use(hydrate());

bot.use(session({ initial: () => ({}) }));

bot.use(conversations());

bot.use(createConversation(email));

bot.use(createConversation(order_number));

async function order_number(conversation, ctx) {
  const statusMessage = await ctx.reply("Введите номер заказа");

  const { message } = await conversation.wait();

  await statusMessage.editText("Секундочку...").then(async () => {

    let people = mongoose.model("people", PersonSchema);

    let order_number = /\d{8}-\d{4}/m.exec(message.text)

    let posting_number = undefined

    if (order_number != null) {
      posting_number = await getPostingNumber(order_number[0])
      console.log(posting_number)
    }

    await people.findOneAndUpdate({ "user_id": message.from.id }, { $addToSet: { orders: posting_number }, }, { upsert: true, new: true }, (err, result) => {
      if (err) {
        // console.log(err);
      } else {
        console.log(result);
      }
    }).clone()

    if (posting_number) {

      let inlineKeyboard1 = new InlineKeyboard().url(
        "Channel",
        "https://t.me/+VJCqx58vHsiOW0FB",
      )

      const inlineKeyboard2 = new InlineKeyboard().text('Отправить', 'email');

      await statusMessage.editText("Подтвержден ✅")

      const badge = await ctx.replyWithPhoto(new InputFile("background.jpeg"), {
        caption: "The invitation will expire in 30 minutes.", reply_markup: inlineKeyboard1
      })

      setTimeout(async () => {
        await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id);
        await ctx.api.deleteMessage(ctx.chat.id, message.message_id)
      }, 250)

      setTimeout(async () => {
        inlineKeyboard1 = new InlineKeyboard().text(
          "Expired"
        )
        // await inlineKeyboard1.editText('bitch', 'email')
        await bot.api.editMessageReplyMarkup(badge.chat.id, badge.message_id, { reply_markup: inlineKeyboard1 })
      }, 30000)

      await ctx.reply("Мы отправим ваши книги на эл. почту!", {
        reply_markup: inlineKeyboard2,
      })

    } else {
      const inlineKeyboard = new InlineKeyboard().text('Try again', 'order_number');

      await ctx.reply("It looks like your order number is incorrect, please try again.", {
        reply_markup: inlineKeyboard
      })

    }

  });
}


bot.command("start", async (ctx) => {

  let people = mongoose.model("people", PersonSchema);
    
  await people.findOneAndUpdate({ "user_id": ctx.from.id }, { "username": ctx.from.username, "first_name": ctx.from.first_name, "last_name": ctx.from.last_name }, { upsert: true, new: true }, (err, result) => {
    if (err) {
      // console.log(err);
    } else {
      console.log(result);
    }
  }).clone()
  
  await ctx.conversation.enter("order_number");
  

  await ctx.deleteMessage();

});


// bot.hears(/\d{8}-\d{4}/m, async (ctx) => {
// Explicit usage
// ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.update.message.from.first_name}`)
// /\d{8}-\d{4}/m

// lets pretend this outputs true await getPostingNumber(ctx.update.message.text)


// })

async function email(conversation, ctx) {
  await ctx.reply("Напишите вашу эл. почту");

  const { message } = await conversation.wait();

  let people = mongoose.model("people", PersonSchema);

  people.findOneAndUpdate({ "user_id": message.from.id }, { "email": message.text }, (err, result) => {
    if (err) {
      // console.log(err);
    } else {
      console.log(result);
    }
  });

  const inlineKeyboard = new InlineKeyboard().url(
    "Find out more",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ).text('Resend Email', 'email');

  await ctx.reply("Sent!", {
    reply_markup: inlineKeyboard,
  }).then(() => {
    var mailOptions = {
      from: 'mike@degeofroy.com',
      to: message.text,
      subject: 'Plant Info',
      text: 'Some fun files that you should enjoy.',
      attachments: [
        {
          filename: 'Plants.pdf',
          path: 'telegram-bot-tz.pdf'
        },
      ]
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  });
}

bot.callbackQuery("email", async (ctx) => {
  await ctx.conversation.enter("email");
});


bot.callbackQuery("order_number", async (ctx) => {
  await ctx.conversation.enter("order_number");
});

// await ctx.conversation.enter("order_number");

bot.catch((error) => {
  console.log(error)
})

bot.start();

// transporter.sendMail(mailOptions, function (error, info) {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Email sent: ' + info.response);
//   }
// });

// ctx.reply('Fuck you!', { reply_markup: { force_reply: true } })

// transporter.sendMail(mailOptions, function (error, info) {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Email sent: ' + info.response);
//   }
//   });