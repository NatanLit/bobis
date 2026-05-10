const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

let _client = null;
function getSupabase() {
  if (_client) return _client;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _client;
}

function checkAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// Decode JWT (same as in user.js)
function decodeJWT(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// ── GET /offers — public list of active offers ────────────────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(503).json({ success: false, error: 'DB not configured' });

    const { data, error } = await sb
      .from('offers')
      .select('id, name, description, points_cost, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /offers error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /offers — admin creates an offer ─────────────────────
router.post('/', checkAdminKey, async (req, res) => {
  try {
    const { name, description, points_cost } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'name required' });
    if (!points_cost || points_cost < 1) return res.status(400).json({ success: false, error: 'points_cost must be > 0' });

    const sb = getSupabase();
    const { data, error } = await sb
      .from('offers')
      .insert({ name: name.trim(), description: (description || '').trim() || null, points_cost: Number(points_cost) })
      .select('id, name, description, points_cost, active, created_at')
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e) {
    console.error('POST /offers error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── DELETE /offers/:id — admin deletes an offer ───────────────
router.delete('/:id', checkAdminKey, async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('offers').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /offers error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /offers/:id/redeem — user spends points ─────────────
router.post('/:id/redeem', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ success: false, error: 'No token' });

    const payload = decodeJWT(token);
    if (!payload || !payload.email) return res.status(401).json({ success: false, error: 'Invalid token' });

    const sb = getSupabase();
    if (!sb) return res.status(503).json({ success: false, error: 'DB not configured' });

    // Get offer
    const { data: offer, error: offerErr } = await sb
      .from('offers')
      .select('id, name, points_cost, active')
      .eq('id', req.params.id)
      .single();
    if (offerErr || !offer) return res.status(404).json({ success: false, error: 'Предложение не найдено' });
    if (!offer.active) return res.status(400).json({ success: false, error: 'Предложение неактивно' });

    // Get user
    const { data: user, error: userErr } = await sb
      .from('users')
      .select('id, total_points')
      .eq('phone_or_email', payload.email)
      .single();
    if (userErr || !user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

    if (user.total_points < offer.points_cost) {
      return res.status(400).json({ success: false, error: 'Недостаточно поинтов' });
    }

    // Deduct points + create redemption record
    await Promise.all([
      sb.rpc('decrement_points', { user_id_arg: user.id, amount_arg: offer.points_cost }),
      sb.from('redemptions').insert({
        user_id: user.id,
        offer_id: offer.id,
        points_spent: offer.points_cost,
      }),
      sb.from('points_log').insert({
        user_id: user.id,
        amount: -offer.points_cost,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        offer_name: offer.name,
        points_spent: offer.points_cost,
        new_balance: user.total_points - offer.points_cost,
      },
    });
  } catch (e) {
    console.error('POST /offers/:id/redeem error:', e);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
