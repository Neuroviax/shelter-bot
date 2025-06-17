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

bot.on('location', async (msg) => {
  const { latitude, longitude } = msg.location;

  const shelters = []; // сюда загрузятся данные из CSV, как раньше
  const csv = fs.createReadStream('shelters.csv').pipe(csvParser());

  for await (const row of csv) {
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const distance = Math.sqrt(Math.pow(lat - latitude, 2) + Math.pow(lng - longitude, 2));

    shelters.push({
      name: row.name || 'Укрытие',
      address: row.address || 'Адрес не указан',
      lat,
      lng,
      distance
    });
  }

  // Сортировка по расстоянию
  shelters.sort((a, b) => a.distance - b.distance);
  const top3 = shelters.slice(0, 3);

  if (top3.length === 0) {
    return bot.sendMessage(msg.chat.id, 'Укрытий поблизости не найдено.');
  }

  // Генерация ссылки на Google Maps с несколькими точками
  const mapLink = `https://www.google.com/maps/dir/${latitude},${longitude}/${top3.map(s => `${s.lat},${s.lng}`).join('/')}`;

  let message = '🏃‍♀️ Вот ближайшие укрытия:\n\n';
  top3.forEach((shelter, index) => {
    message += `📍 ${index + 1}. ${shelter.name}\n${shelter.address}\n\n`;
  });
  message += `🗺️ Открыть на карте: ${mapLink}`;

  bot.sendMessage(msg.chat.id, message);
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
