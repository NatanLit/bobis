const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

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
      .select('id, text, stars, score, points_earned, created_at, item_name, users(phone_or_email), items(name)')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/reviews error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
