import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Для Render: простой HTTP-сервер, чтобы бот не засыпал
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Привет! Отправьте мне свою локацию 📍, и я покажу ближайшее убежище.'
  );
});

bot.on('location', async (msg) => {
  const { latitude, longitude } = msg.location;
  const response = await fetch(
    `https://gdeubezhishe.kz/api/shelters?lat=${latitude}&lng=${longitude}`
  );
  const shelters = await response.json();

  if (shelters.length === 0) {
    bot.sendMessage(msg.chat.id, 'Упс! Укрытий поблизости не найдено.');
    return;
  }

  const nearest = shelters[0];

  bot.sendVenue(
    msg.chat.id,
    nearest.lat,
    nearest.lng,
    nearest.name || 'Ближайшее укрытие',
    nearest.address || 'Адрес не указан'
  );
});
