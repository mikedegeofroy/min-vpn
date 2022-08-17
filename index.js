import { Bot, InlineKeyboard, session, InputFile } from "grammy";
import {
    conversations,
    createConversation,
} from "@grammyjs/conversations";
import { hydrate } from "@grammyjs/hydrate";

const bot = new Bot('5709156476:AAGp0CmUQ5PhZMq2AcHAo57CiWCsNzB3R60');

// Привет Мишель!

// У вас нет активной подписки
// Подписка активна до 12-213-312

// Месяц - 200 rub
// 3 Месяца - 600 rub
// 6 Месяцев - 1200 rub

// Поддержка и вопросы

bot.use(hydrate());

bot.use(session({ initial: () => ({}) }));

bot.use(conversations());

bot.use(createConversation(promo));

bot.use(createConversation(tarifs));

bot.use(createConversation(home));

bot.command("start", (ctx) => { 
    ctx.conversation.enter("home")
    console.log("called start")
});

bot.callbackQuery("tarifs", async (ctx) => {
    await ctx.conversation.enter("tarifs");
});

bot.callbackQuery("promo", async (ctx) => {
    console.log("called promo")
    await ctx.conversation.enter("promo");
});

bot.callbackQuery("home", async (ctx) => {
    console.log("called home")
    await ctx.conversation.enter("home");
});

async function tarifs(conversation, ctx) {

    console.log("Entered tarifs convo")

    let badge = ctx.update.callback_query

    let inlineKeyboard2 = new InlineKeyboard().text(
        "Месяц - 200 rub",
        "https://t.me/+VJCqx58vHsiOW0FB",
    ).row().text(
        "3 Месяца - 600 rub",
        "https://t.me/+VJCqx58vHsiOW0FB",
    ).row().text(
        "6 Месяцев - 1200 rub",
        "https://t.me/+VJCqx58vHsiOW0FB",
    ).row().text(
        "Назад",
        "home",
    )

    await bot.api.editMessageReplyMarkup(badge.from.id, badge.message.message_id, { reply_markup: inlineKeyboard2 })

}

async function promo(conversation, ctx) {

    let badge = ctx.update.callback_query

    
    let inlineKeyboard = new InlineKeyboard().text(
        "Назад",
        "home",
    )

    // await bot.api.editMessageCaption(badge.from.id, badge.message.message_id,"e")

    await bot.api.editMessageReplyMarkup(badge.from.id, badge.message.message_id, { reply_markup: inlineKeyboard })

}

async function home(conversation, ctx) {

    console.log("Entered home convo")

    let inlineKeyboard = new InlineKeyboard().text(
        "Промокод",
        "promo",
    ).text(
        "Тарифы",
        "tarifs",
    ).row().url("Поддержка и Вопросы", "https://t.me/mikedegeofroy")

    if(ctx.update.callback_query){
        let badge = ctx.update.callback_query

        await bot.api.editMessageReplyMarkup(badge.from.id, badge.message.message_id, { reply_markup: inlineKeyboard })

        console.log(badge)
    } else {        
        const badge = await ctx.replyWithPhoto(new InputFile("header.png"), {
            caption: `VPN постоянно блокируют в россии. Для этого мы разработали простой бот с VPN сервисом, который на много труднее заблокировать.
            
        ${ctx.update.message.from.first_name}
            
        Нет активной подписки
            
            `, reply_markup: inlineKeyboard
        })

        console.log(ctx)

        await ctx.deleteMessage();
    }

    

    // const update = await conversation.wait();

    // console.log(update)

    // await ctx.conversation.exit();

}

bot.start()