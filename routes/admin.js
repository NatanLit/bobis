const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { generateInsights } = require('../services/insights');

let _sbClient = null;
function getSupabase() {
  if (_sbClient) return _sbClient;
  _sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _sbClient;
}

// In-memory insights cache — survives until Railway restart
const insightsCache = { data: null, generatedAt: 0, reviewIds: [] };
const INSIGHTS_TTL_MS = 60 * 60 * 1000; // 1 hour

function checkAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_KEY || password !== process.env.ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Неверный пароль' });
  }
  return res.json({ success: true });
});

router.get('/reviews', checkAdminKey, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('reviews')
      .select('id, item_id, text, stars, score, points_earned, photo_url, created_at, item_name, users(phone_or_email), items(name)')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/reviews error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// ── Products (items) CRUD ────────────────────────────────
router.get('/products', checkAdminKey, async (req, res) => {
  try {
    const sb = getSupabase();
    // All items + aggregated stats from reviews in parallel
    const [{ data: items, error: itemsErr }, { data: reviews, error: revsErr }] = await Promise.all([
      sb.from('items').select('id, name, image_url, created_at').order('created_at', { ascending: false }),
      sb.from('reviews').select('item_id, stars, score').not('item_id', 'is', null),
    ]);
    if (itemsErr) throw itemsErr;
    if (revsErr)  throw revsErr;

    // Aggregate per item_id
    const stats = {};
    (reviews || []).forEach(r => {
      const s = stats[r.item_id] ||= { count: 0, starsSum: 0, scoreSum: 0 };
      s.count += 1;
      s.starsSum += r.stars || 0;
      s.scoreSum += r.score || 0;
    });

    const result = (items || []).map(it => {
      const s = stats[it.id] || { count: 0, starsSum: 0, scoreSum: 0 };
      return {
        id: it.id,
        name: it.name,
        image_url: it.image_url,
        created_at: it.created_at,
        reviews: s.count,
        avg: s.count ? +(s.starsSum / s.count).toFixed(2) : 0,
        avg_score: s.count ? Math.round(s.scoreSum / s.count) : 0,
      };
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /admin/products error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/products', checkAdminKey, async (req, res) => {
  try {
    const { name, image_url } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'name required' });
    const sb = getSupabase();
    const { data, error } = await sb
      .from('items')
      .insert({ name: name.trim(), image_url: image_url?.trim() || null })
      .select('id, name, image_url, created_at')
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('POST /admin/products error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/products/:id', checkAdminKey, async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('items').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/products error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI Insights ──────────────────────────────────────────
// GET /admin/insights — returns cached or fresh insights
//    ?force=1 → bypass cache and regenerate
router.get('/insights', checkAdminKey, async (req, res) => {
  try {
    const force = req.query.force === '1';
    const cacheAge = Date.now() - insightsCache.generatedAt;
    const cacheValid = insightsCache.data && cacheAge < INSIGHTS_TTL_MS;

    if (cacheValid && !force) {
      return res.json({
        success: true,
        cached: true,
        generated_at: insightsCache.generatedAt,
        age_ms: cacheAge,
        ...insightsCache.data,
      });
    }

    const sb = getSupabase();
    const { data: reviews, error } = await sb
      .from('reviews')
      .select('text, stars, item_name, items(name), created_at')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    if (!reviews || !reviews.length) {
      return res.json({
        success: true,
        cached: false,
        generated_at: Date.now(),
        insights: [],
        reviewCount: 0,
        empty: true,
      });
    }

    const result = await generateInsights(reviews);
    insightsCache.data = result;
    insightsCache.generatedAt = Date.now();

    return res.json({
      success: true,
      cached: false,
      generated_at: insightsCache.generatedAt,
      age_ms: 0,
      ...result,
    });
  } catch (err) {
    console.error('GET /admin/insights error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
