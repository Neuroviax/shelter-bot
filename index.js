import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Тестовая база убежищ (широта, долгота и адрес)
const shelters = [
  { lat: 31.963, lon: 34.803, address: 'ул. Герцль 23, Ришон-ле-Цион' },
  { lat: 31.973, lon: 34.782, address: 'ул. Бялик 102, Ришон-ле-Цион' },
  { lat: 31.968, lon: 34.790, address: 'ул. Йосефталь 5, Ришон-ле-Цион' }
];

// Функция рассчета расстояния
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// При получении локации
bot.on('location', (ctx) => {
  const userLat = ctx.message.location.latitude;
  const userLon = ctx.message.location.longitude;

  let nearest = shelters[0];
  let minDistance = distance(userLat, userLon, nearest.lat, nearest.lon);

  for (const shelter of shelters) {
    const dist = distance(userLat, userLon, shelter.lat, shelter.lon);
    if (dist < minDistance) {
      nearest = shelter;
      minDistance = dist;
    }
  }

  ctx.reply(`Ближайшее убежище:\n📍 ${nearest.address}\n📏 Расстояние: ${minDistance.toFixed(2)} км`);
});

bot.start((ctx) => ctx.reply('Привет! Отправьте мне свою локацию 📍, и я покажу ближайшее убежище.'));
bot.launch();
import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('Бот работает!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Фальшивый сервер запущен');
});
// Обработка полученной геолокации от пользователя
bot.on('location', (msg) => {
  const location = msg.location;
  if (!location) {
    bot.sendMessage(msg.chat.id, 'Не удалось получить координаты 😕');
    return;
  }

  const latitude = location.latitude;
  const longitude = location.longitude;

  // Здесь в будущем будет логика поиска убежищ
  bot.sendMessage(
    msg.chat.id,
    `📍 Ты находишься по координатам:\nШирота: ${latitude}\nДолгота: ${longitude}\n\nЯ ищу ближайшее убежище... 🛡️`
  );
});
