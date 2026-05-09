const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

router.get('/', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Укажите номер телефона' });
    }

    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, total_points')
      .eq('phone_or_email', phone)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    return res.json({ success: true, data: { points: user.total_points } });
  } catch (err) {
    console.error('GET /coupon error:', err);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
