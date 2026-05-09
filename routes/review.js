const express = require('express');
const router = express.Router();
const { scoreReview } = require('../services/scoring');
const { calcPoints }  = require('../services/points');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

router.post('/', async (req, res) => {
  try {
    const { shop, reviews, phone, email } = req.body;
    const identifier = email || phone; // prefer email from Supabase Auth

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, error: 'Нет данных для отзыва' });
    }

    for (const r of reviews) {
      if (!r.text || r.text.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'Текст отзыва слишком короткий' });
      }
      if (!r.stars || r.stars < 1 || r.stars > 5) {
        return res.status(400).json({ success: false, error: 'Укажите оценку от 1 до 5 звёзд' });
      }
    }

    const supabase = getSupabase();
    let userId = null;

    if (identifier && supabase) {
      const { data: user } = await supabase
        .from('users')
        .upsert({ phone_or_email: identifier }, { onConflict: 'phone_or_email' })
        .select('id')
        .single();
      userId = user?.id;
    }

    let totalPoints = 0;
    const results = [];

    for (const r of reviews) {
      const score = await scoreReview({ text: r.text, stars: r.stars, hasPhoto: !!r.hasPhoto });
      const points = calcPoints(score, !!r.hasPhoto);
      totalPoints += points;

      if (userId) {
        const { data: item } = await supabase
          .from('items')
          .select('id')
          .eq('name', r.item)
          .eq('business_id', shop || null)
          .maybeSingle();

        const itemId = item?.id || null;

        if (itemId) {
          const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('user_id', userId)
            .eq('item_id', itemId)
            .maybeSingle();

          if (existing) {
            return res.status(400).json({ success: false, error: `Отзыв на «${r.item}» уже оставлен` });
          }
        }

        const { data: review } = await supabase
          .from('reviews')
          .insert({ user_id: userId, item_id: itemId, text: r.text, stars: r.stars, score, points_earned: points })
          .select('id')
          .single();

        if (review) {
          await supabase.from('points_log').insert({ user_id: userId, review_id: review.id, amount: points });
        }
      }

      results.push({ item: r.item, score, points });
    }

    if (userId && totalPoints > 0 && supabase) {
      await supabase.rpc('increment_points', { user_id_arg: userId, amount_arg: totalPoints });
    }

    return res.json({ success: true, data: { points: totalPoints, results } });
  } catch (err) {
    console.error('POST /review error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
