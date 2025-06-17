const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Ответ на команду /start
bot.start((ctx) => ctx.reply('Привет! Я ищу ближайшее убежище...'));

// Запуск бота
bot.launch();

// Обработка graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
