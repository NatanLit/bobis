const express = require('express');
const router = express.Router();
const { scoreReview } = require('../services/scoring');
const { calcPoints }  = require('../services/points');
const { createClient } = require('@supabase/supabase-js');

let _client = null;
function getSupabase() {
  if (_client) return _client;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _client;
}

const PHOTO_BUCKET = 'review-photos';

async function uploadPhoto(supabase, dataUrl, userId) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  try {
    const mime = m[1];
    const ext  = (mime.split('/')[1] || 'jpg').split('+')[0];
    const buf  = Buffer.from(m[2], 'base64');
    if (buf.length > 8 * 1024 * 1024) return null; // safety: cap 8 MB
    const filename = `${userId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filename, buf, { contentType: mime, upsert: false });
    if (error) { console.error('[/review] storage upload error:', error.message); return null; }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (e) {
    console.error('[/review] uploadPhoto exception:', e.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  const t0 = Date.now();
  try {
    const { shop, reviews, phone, email } = req.body;
    const identifier = email || phone;

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
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Укажите email или телефон' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'База данных не настроена' });
    }

    let userId = null;
    const { data: user, error: userErr } = await supabase
      .from('users')
      .upsert({ phone_or_email: identifier }, { onConflict: 'phone_or_email' })
      .select('id')
      .single();
    if (userErr) {
      console.error('[/review] user upsert error:', userErr);
      return res.status(500).json({ success: false, error: 'Ошибка авторизации пользователя' });
    }
    userId = user?.id;

    // ─── PARALLEL: score every review and upload every photo at once ───
    const [scores, photoUrls] = await Promise.all([
      Promise.all(reviews.map(r => scoreReview({ text: r.text, stars: r.stars }).catch(e => {
        console.error('[/review] score error:', e.message);
        return 50; // safe fallback
      }))),
      Promise.all(reviews.map(r =>
        (r.photo && supabase) ? uploadPhoto(supabase, r.photo, userId) : Promise.resolve(null)
      )),
    ]);

    let totalPoints = 0;
    const results = [];
    const inserts = [];

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      const score = scores[i];
      const photoUrl = photoUrls[i];
      const points = calcPoints(score, !!photoUrl);
      totalPoints += points;
      results.push({ item: r.item, score, points });

      if (userId && supabase) {
        inserts.push({
          user_id:       userId,
          item_id:       r.item_id || null,
          item_name:     (r.item || '').trim() || null,
          text:          r.text,
          stars:         r.stars,
          score,
          photo_url:     photoUrl,
          points_earned: points,
        });
      }
    }

    // ─── PARALLEL: insert all reviews + bump total points at once ───
    if (inserts.length) {
      const { data: insertedReviews, error: revErr } = await supabase
        .from('reviews')
        .insert(inserts)
        .select('id, points_earned');
      if (revErr) {
        console.error('[/review] insert reviews error:', revErr);
        // Unique constraint: user already reviewed this item
        if (revErr.code === '23505') {
          return res.status(409).json({ success: false, error: 'Вы уже оставляли отзыв на этот товар' });
        }
        return res.status(500).json({ success: false, error: 'Ошибка при сохранении отзыва' });
      }

      if (insertedReviews?.length) {
        const logs = insertedReviews.map(rv => ({ user_id: userId, review_id: rv.id, amount: rv.points_earned }));
        await Promise.all([
          supabase.from('points_log').insert(logs),
          supabase.rpc('increment_points', { user_id_arg: userId, amount_arg: totalPoints }),
        ]);
      }
    }

    console.log(`[/review] done in ${Date.now() - t0}ms, +${totalPoints}pts`);
    return res.json({ success: true, data: { points: totalPoints, results } });
  } catch (err) {
    console.error('POST /review error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
