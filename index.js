import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Добавлено для поддержки __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const R = 6371;
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

// Хранение выбранного языка
const userLangMap = new Map();

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userLang = msg.from.language_code || 'ru';

  if (!userLangMap.has(chatId)) {
    userLangMap.set(chatId, userLang);
  }

  const options = {
    reply_markup: {
      keyboard: [['🇷🇺 Русский', '🇮🇱 עברית']],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  };

  const imagePath = path.join(__dirname, 'ChatGPT Image 17 июн. 2025 г., 20_06_34.png');

  const captionRu = `👋 Привет! Я бот, который поможет найти ближайшее убежище 🛡 в Ришоне.

📍 Просто отправь свою геолокацию — и я покажу тебе 3 ближайших укрытия с адресами и картой.

🔄 Данные регулярно обновляются. Бот работает автономно и доступен 24/7.

⚠️ Обратите внимание: информация предоставляется в справочных целях. Перед походом в укрытие убедитесь в его доступности на месте.

🚨 Не рекомендуется использовать бота во время сирены, так как некоторые укрытия могут оказаться недоступны. Данные взяты с сайта муниципалитета и не были проверены мной лично.

✅ Рекомендуется заранее ознакомиться с ближайшими укрытиями в спокойное время, чтобы в экстренной ситуации действовать быстро и уверенно.`;

  const captionHe = `👋 שלום! אני בוט שיעזור לך למצוא את המקלט הקרוב ביותר 🛡 בראשון לציון.

📍 שלח לי את המיקום שלך — ואציג בפניך 3 מקלטים קרובים עם כתובות ומפה.

🔄 הנתונים מתעדכנים באופן קבוע. הבוט פועל באופן עצמאי וזמין 24/7.

⚠️ שים לב: המידע ניתן למטרות יידוע בלבד. לפני הכניסה למקלט, יש לוודא את זמינותו במקום.

🚨 לא מומלץ להשתמש בבוט בזמן אזעקה, מכיוון שחלק מהמקלטים עשויים להיות לא נגישים. הנתונים נלקחו מאתר העירייה ולא נבדקו על ידי אישית.

✅ מומלץ לבדוק מראש את המקלטים הנגישים והנוחים ביותר בסביבתך בזמני שגרה, כדי לפעול במהירות ובביטחון במקרה חירום.`;

  await bot.sendPhoto(chatId, imagePath, {
    caption: userLang === 'he' ? captionHe : captionRu,
    parse_mode: 'HTML'
  });

  bot.sendMessage(chatId, userLang === 'he' ? 'בחר/י שפה:' : 'Выберите язык:', options);
});

// Обработка выбора языка
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '🇷🇺 Русский') {
    userLangMap.set(chatId, 'ru');
    bot.sendMessage(chatId, 'Язык установлен: русский 🇷🇺');
  } else if (text === '🇮🇱 עברית') {
    userLangMap.set(chatId, 'he');
    bot.sendMessage(chatId, 'השפה נקבעה לעברית 🇮🇱');
  }
});

// Обработка геолокации
bot.on('location', (msg) => {
  const { latitude, longitude } = msg.location;
  const chatId = msg.chat.id;
  const lang = userLangMap.get(chatId) || 'ru';

  const sorted = shelters
    .map((shelter) => {
      const distance = getDistance(latitude, longitude, shelter.lat, shelter.lng);
      return { ...shelter, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  if (sorted.length === 0) {
    return bot.sendMessage(chatId, lang === 'he' ? 'לא נמצאו מקלטים בסביבה.' : 'Укрытий поблизости не найдено.');
  }

  const mapLink = `https://www.google.com/maps/dir/${latitude},${longitude}/${sorted.map(s => `${s.lat},${s.lng}`).join('/')}`;

  let message = lang === 'he' ? '🏃‍♀️ המקלטים הקרובים ביותר:\n\n' : '🏃‍♀️ Вот ближайшие укрытия:\n\n';
  sorted.forEach((s, i) => {
    const dist = s.distance < 1
      ? `${Math.round(s.distance * 1000)} м`
      : `${s.distance.toFixed(1)} км`;

    const distHe = s.distance < 1
      ? `${Math.round(s.distance * 1000)} מ׳`
      : `${s.distance.toFixed(1)} ק"מ`;

    message += lang === 'he'
      ? `📍 ${i + 1}. ${s.name}\n${s.address}\n📏 מרחק: ${distHe}\n\n`
      : `📍 ${i + 1}. ${s.name}\n${s.address}\n📏 Расстояние: ${dist}\n\n`;
  });

  message += lang === 'he'
    ? `🗺️ לצפייה במפה: ${mapLink}`
    : `🗺️ Открыть на карте: ${mapLink}`;

  bot.sendMessage(chatId, message);
});
