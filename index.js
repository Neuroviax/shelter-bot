import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import csv from 'csv-parser';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// HTTP-сервер для Render
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});
app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});

// Инициализация бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Загрузка CSV
let shelters = [];

fs.createReadStream('Убежища_Ришон.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.Широта && row.Долгота) {
      shelters.push({
        name: row.Название || 'Укрытие',
        lat: parseFloat(row.Широта),
        lng: parseFloat(row.Долгота),
        address: row.Название || 'Адрес не указан'
      });
    }
  })
  .on('end', () => {
    console.log(`Загружено укрытий: ${shelters.length}`);
  });

// Команда /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Привет! Отправьте мне свою локацию 📍, и я покажу ближайшее убежище.'
  );
});

// Обработка геолокации
bot.on('location', (msg) => {
  const { latitude, longitude } = msg.location;

  if (shelters.length === 0) {
    bot.sendMessage(msg.chat.id, 'Список убежищ ещё загружается. Попробуйте чуть позже.');
    return;
  }

  const nearest = findNearestShelter(latitude, longitude);

  bot.sendVenue(
    msg.chat.id,
    nearest.lat,
    nearest.lng,
    nearest.name,
    nearest.address
  );
});

// Поиск ближайшего укрытия
function findNearestShelter(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const shelter of shelters) {
    const dist = distance(lat, lng, shelter.lat, shelter.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = shelter;
    }
  }

  return nearest;
}

// Расчёт расстояния между координатами
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return value * Math.PI / 180;
}
