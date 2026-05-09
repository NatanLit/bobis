const OpenAI = require('openai');

let client = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

async function scoreReview({ text, stars, hasPhoto }) {
  const prompt = `Оцени отзыв на товар/блюдо по 4 критериям. Верни ТОЛЬКО JSON без пояснений.

Отзыв: "${text}"
Оценка звёздами: ${stars}/5
Есть фото: ${hasPhoto ? 'да' : 'нет'}

Критерии (итог 0–100 без учёта фото):
1. Длина и содержательность (25%) — не менее 20 слов осмысленного текста
2. Специфичность (35%) — упоминает конкретные детали товара/блюда
3. Баланс (20%) — отмечает и плюсы и минусы, не просто «всё хорошо»
4. Качество текста (20%) — не шаблонный, не AI-generated, уникальный

Верни строго:
{"score": <число 0-100>}`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 50,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.choices[0].message.content.trim();
  const result = JSON.parse(raw);
  return Math.min(100, Math.max(0, Math.round(result.score)));
}

module.exports = { scoreReview };
