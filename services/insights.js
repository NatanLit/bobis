const OpenAI = require('openai');

let _openai = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const ALLOWED_TAGS = ['еда', 'сервис', 'атмосфера', 'цена', 'чистота', 'скорость', 'прочее'];

const SYSTEM = `Ты опытный консультант по гостеприимству. Анализируешь отзывы клиентов кафе/ресторана и пишешь практичные рекомендации владельцу.

Правила:
- Группируй похожие отзывы в одну рекомендацию.
- Используй ТОЛЬКО эти теги: ${ALLOWED_TAGS.map(t => '#' + t).join(', ')}.
- severity: "critical" — повторяющиеся жалобы, срочные проблемы; "suggestion" — что улучшить; "praise" — что работает хорошо.
- Возвращай 4-8 пунктов: смесь критики, советов и похвалы.
- title — короткий (≤60 символов), description — 1-2 предложения, конкретно что делать.
- Возвращай ТОЛЬКО JSON в формате: {"insights":[{"title":"...","description":"...","severity":"critical|suggestion|praise","tags":["еда","сервис"]}]}`;

function formatReviewsForPrompt(reviews) {
  return reviews.map((r, i) => {
    const product = r.item_name || r.items?.name || 'Товар';
    return `[${i + 1}] ${product} ${r.stars}★: ${(r.text || '').replace(/\s+/g, ' ').slice(0, 280)}`;
  }).join('\n');
}

async function generateInsights(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { insights: [], reviewCount: 0 };
  }

  const sample = reviews.slice(0, 60); // cap input — 60 latest is plenty for GPT-4o-mini
  const userMsg = `Проанализируй ${sample.length} отзывов и дай рекомендации:\n\n${formatReviewsForPrompt(sample)}`;

  const t0 = Date.now();
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: userMsg },
    ],
  });
  console.log(`[insights] generated in ${Date.now() - t0}ms`);

  const raw = response.choices[0].message.content.trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = { insights: [] }; }

  // Sanitize: clamp tags to allowed set, ensure severity is valid
  const VALID_SEV = new Set(['critical', 'suggestion', 'praise']);
  const insights = (parsed.insights || []).slice(0, 12).map(i => ({
    title: String(i.title || '').slice(0, 120),
    description: String(i.description || '').slice(0, 400),
    severity: VALID_SEV.has(i.severity) ? i.severity : 'suggestion',
    tags: Array.isArray(i.tags)
      ? i.tags.map(t => String(t).replace(/^#/, '').toLowerCase()).filter(t => ALLOWED_TAGS.includes(t)).slice(0, 4)
      : ['прочее'],
  })).filter(i => i.title);

  return { insights, reviewCount: sample.length };
}

module.exports = { generateInsights, ALLOWED_TAGS };
