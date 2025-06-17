import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let shelters = [];

fs.createReadStream('Убежища_Ришон.csv', { encoding: 'utf8' })
  .pipe(csv({ separator: ',' }))
  .on('data', (data) => {
    shelters.push({
      name: data.Название || 'Укрытие',
      address: data.Адрес,
      lat: parseFloat(data.Широта),
      lng: parseFloat(data.Долгота)
    });
  })
  .on('end', () => {
    console.log('Список убежищ загружен');
  });

// Расчёт расстояния между двумя точками
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // радиус Земли в км
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Привет! Отправьте мне свою геолокацию 📍, и я покажу ближайшее укрытие в Ришоне.'
  );
});

bot.on('location', (msg) => {
  const { latitude, longitude } = msg.location;

  if (!shelters.length) {
    bot.sendMessage(msg.chat.id, 'Извините, данные об убежищах ещё загружаются. Попробуйте позже.');
    return;
  }

  let nearest = null;
  let minDistance = Infinity;

  shelters.forEach((shelter) => {
    const dist = getDistance(latitude, longitude, shelter.lat, shelter.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = shelter;
    }
  });

  if (nearest) {
    const distStr = minDistance < 1
      ? `${Math.round(minDistance * 1000)} м`
      : `${minDistance.toFixed(1)} км`;

    bot.sendMessage(
      msg.chat.id,
      `🏃 Ближайшее укрытие находится в ${distStr} от вас:`
    );

    bot.sendVenue(
      msg.chat.id,
      nearest.lat,
      nearest.lng,
      nearest.name,
      nearest.address
    );
  } else {
    bot.sendMessage(msg.chat.id, 'Увы, поблизости не найдено укрытий 😔');
  }
});
