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

// Загрузка CSV-файла один раз при запуске
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

// Расчёт расстояния по формуле гаверсинуса
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

// Команда /start
import path from 'path';

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const imagePath = path.join(__dirname, 'ChatGPT Image 17 июн. 2025 г., 20_06_34.png');

  await bot.sendPhoto(chatId, imagePath, {
    caption: `👋 Привет! Я бот, который поможет найти ближайшее убежище 🛡 в Ришоне.

📍 Просто отправь свою геолокацию — и я покажу тебе 3 ближайших укрытия с адресами и картой.

🔄 Данные регулярно обновляются. Бот работает автономно и доступен 24/7.

⚠️ Обратите внимание: информация предоставляется в справочных целях. Перед походом в укрытие убедитесь в его доступности на месте.`,
    parse_mode: 'HTML'
  });
});


// Обработка геолокации
bot.on('location', (msg) => {
  const { latitude, longitude } = msg.location;

  const sorted = shelters
    .map((shelter) => {
      const distance = getDistance(latitude, longitude, shelter.lat, shelter.lng);
      return { ...shelter, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  if (sorted.length === 0) {
    return bot.sendMessage(msg.chat.id, 'Укрытий поблизости не найдено.');
  }

  const mapLink = `https://www.google.com/maps/dir/${latitude},${longitude}/${sorted.map(s => `${s.lat},${s.lng}`).join('/')}`;

  let message = '🏃‍♀️ Вот ближайшие укрытия:\n\n';
  sorted.forEach((s, i) => {
    const dist = s.distance < 1
      ? `${Math.round(s.distance * 1000)} м`
      : `${s.distance.toFixed(1)} км`;
    message += `📍 ${i + 1}. ${s.name}\n${s.address}\n📏 Расстояние: ${dist}\n\n`;
  });

  message += `🗺️ Открыть на карте: ${mapLink}`;

  bot.sendMessage(msg.chat.id, message);
});
