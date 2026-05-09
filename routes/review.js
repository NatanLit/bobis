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

    console.log('[/review] identifier:', identifier, '| shop:', shop, '| reviews:', reviews?.length);

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
      const { data: user, error: userErr } = await supabase
        .from('users')
        .upsert({ phone_or_email: identifier }, { onConflict: 'phone_or_email' })
        .select('id')
        .single();
      if (userErr) console.error('[/review] user upsert error:', userErr);
      userId = user?.id;
      console.log('[/review] userId:', userId);
    } else {
      console.warn('[/review] skipped DB save — no identifier or supabase client');
    }

    let totalPoints = 0;
    const results = [];

    for (const r of reviews) {
      const score = await scoreReview({ text: r.text, stars: r.stars, hasPhoto: !!r.hasPhoto });
      const points = calcPoints(score, !!r.hasPhoto);
      totalPoints += points;

      if (userId) {
        let itemQ = supabase.from('items').select('id').eq('name', r.item);
        itemQ = shop ? itemQ.eq('business_id', shop) : itemQ.is('business_id', null);
        const { data: item } = await itemQ.maybeSingle();

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

        const { data: review, error: revErr } = await supabase
          .from('reviews')
          .insert({ user_id: userId, item_id: itemId, text: r.text, stars: r.stars, score, points_earned: points })
          .select('id')
          .single();
        if (revErr) console.error('[/review] insert review error:', revErr);

        if (review) {
          const { error: logErr } = await supabase.from('points_log').insert({ user_id: userId, review_id: review.id, amount: points });
          if (logErr) console.error('[/review] insert points_log error:', logErr);
        }
      }

      results.push({ item: r.item, score, points });
    }

    if (userId && totalPoints > 0 && supabase) {
      const { error: rpcErr } = await supabase.rpc('increment_points', { user_id_arg: userId, amount_arg: totalPoints });
      if (rpcErr) console.error('[/review] increment_points error:', rpcErr);
      else console.log('[/review] +', totalPoints, 'pts to user', userId);
    }

    return res.json({ success: true, data: { points: totalPoints, results } });
  } catch (err) {
    console.error('POST /review error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
