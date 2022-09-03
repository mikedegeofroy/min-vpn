import mongoose from 'mongoose';

let dbURI = 'mongodb://127.0.0.1:27017/min-vpn'

await mongoose.connect(dbURI);

const sessions = mongoose.connection.collection("users");

import { Bot, InlineKeyboard, session } from "grammy";
import {
  conversations,
  createConversation,
} from "@grammyjs/conversations";

import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

const bot = new Bot('5709156476:AAGp0CmUQ5PhZMq2AcHAo57CiWCsNzB3R60');

bot.use(session({ initial: () => ({}), storage: new MongoDBAdapter({ collection: sessions }) }));

bot.use(conversations());

// Cancel

let inlineKeyboard = new InlineKeyboard().text("Назад","cancel");

bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery("Left conversation");
  await ctx.conversation.exit("test")
});

// Convo

async function test(conversation, ctx) {

  console.log(ctx.session)

  const { message } = await conversation.waitFor("message:text");

  console.log(message)

}

// Startup

bot.use(createConversation(test));

bot.command("start", (ctx) => ctx.conversation.enter("test"));


// Yeah fuck this

bot.catch((error) => {
  console.log(error)
})

bot.start()