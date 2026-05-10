const OpenAI = require('openai');

let client = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const SYSTEM = 'Ты строгий оценщик отзывов. Оцениваешь содержательность, специфичность, баланс плюсов/минусов, качество текста. Возвращай только JSON.';

async function scoreReview({ text, stars }) {
  const userMsg = `Отзыв (${stars}/5): "${text}"\nДай число 0-100 в JSON {"score":N}`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 20,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: userMsg },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  const result = JSON.parse(raw);
  return Math.min(100, Math.max(0, Math.round(result.score || 0)));
}

module.exports = { scoreReview };
