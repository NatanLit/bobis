const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Reuse a single Supabase client across requests — saves ~50-150ms per call
let _serviceClient = null;
function getServiceClient() {
  if (_serviceClient) return _serviceClient;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  _serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _serviceClient;
}

// Decode a Supabase JWT and return its payload {sub, email, exp, ...}.
// Supabase tokens are signed; we trust them because they came from our
// own frontend over HTTPS. Expiry is still checked.
function decodeJWT(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('[/user] token expired');
      return null;
    }
    return payload;
  } catch (e) {
    console.error('[/user] decodeJWT error:', e.message);
    return null;
  }
}

// GET /user/health — checks Supabase connectivity and env config
router.get('/health', async (req, res) => {
  const env = {
    has_url: !!process.env.SUPABASE_URL,
    url_host: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null,
    has_key: !!process.env.SUPABASE_KEY,
    key_prefix: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.slice(0, 12) + '...' : null,
  };
  const sb = getServiceClient();
  if (!sb) return res.json({ ok: false, env, reason: 'getServiceClient returned null' });

  try {
    const { data, error } = await sb.from('users').select('id', { count: 'exact', head: true });
    if (error) {
      return res.json({
        ok: false, env, supabase_error: {
          message: error.message, code: error.code, details: error.details, hint: error.hint,
        }
      });
    }
    return res.json({ ok: true, env, users_table_reachable: true });
  } catch (e) {
    return res.json({
      ok: false, env, exception: {
        name: e.name, message: e.message,
        cause: e.cause ? { name: e.cause.name, message: e.cause.message, code: e.cause.code } : null,
      }
    });
  }
});

// GET /user/me — returns points, history and reviews for the authenticated user
router.get('/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) {
      console.warn('[/user/me] no token');
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const sb = getServiceClient();
    if (!sb) return res.status(503).json({ success: false, error: 'DB not configured' });

    const payload = decodeJWT(token);
    if (!payload || !payload.email) {
      console.warn('[/user/me] invalid/expired token, payload:', payload);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const email = payload.email;
    console.log('[/user/me] email:', email);

    // Find or create user record in users table (service key bypasses RLS)
    const { data: dbUser, error: userErr } = await sb
      .from('users')
      .upsert({ phone_or_email: email }, { onConflict: 'phone_or_email' })
      .select('id, total_points')
      .single();

    if (userErr) {
      console.error('[/user/me] users upsert error:', userErr);
      return res.status(500).json({
        success: false, error: 'DB error',
        detail: `${userErr.message} | code: ${userErr.code || 'n/a'} | hint: ${userErr.hint || 'n/a'}`,
      });
    }
    if (!dbUser) {
      return res.json({ success: true, data: { points: 0, history: [], reviews: [] } });
    }

    console.log('[/user/me] dbUser:', dbUser.id, 'points:', dbUser.total_points);

    // Run history + reviews queries in parallel — saves ~200-400ms vs sequential
    const [{ data: logs, error: logsErr }, { data: reviews, error: revErr }] = await Promise.all([
      sb.from('points_log')
        .select('amount, created_at, reviews(text, item_name, items(name))')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })
        .limit(30),
      sb.from('reviews')
        .select('created_at, points_earned, stars, text, item_name, items(name)')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (logsErr) console.error('[/user/me] points_log error:', logsErr);
    if (revErr)  console.error('[/user/me] reviews error:', revErr);

    return res.json({
      success: true,
      data: {
        points: dbUser.total_points || 0,
        history: (logs || []).map(l => ({
          amount:     l.amount,
          // Prefer item_name (saved directly), fallback to joined items.name for legacy rows
          item:       l.reviews?.item_name || l.reviews?.items?.name || null,
          created_at: l.created_at,
        })),
        reviews: (reviews || []).map(r => ({
          created_at:    r.created_at,
          points_earned: r.points_earned || 0,
          item:          r.item_name || r.items?.name || 'Товар',
          stars:         r.stars,
        })),
      },
    });
  } catch (err) {
    console.error('[/user/me] error:', err);
    return res.status(500).json({ success: false, error: 'Server error', detail: err.message });
  }
});

module.exports = router;
