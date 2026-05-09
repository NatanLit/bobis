const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getServiceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// Verify a user JWT and return the auth user, or null on failure
async function verifyToken(token) {
  if (!token) return null;
  // Use a fresh client with the user's token in the Authorization header
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error) {
    console.error('[/user] token verify error:', error.message);
    return null;
  }
  return data?.user || null;
}

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

    const authUser = await verifyToken(token);
    if (!authUser) return res.status(401).json({ success: false, error: 'Invalid token' });

    const email = authUser.email;
    console.log('[/user/me] email:', email);

    // Find or create user record in users table (service key bypasses RLS)
    const { data: dbUser, error: userErr } = await sb
      .from('users')
      .upsert({ phone_or_email: email }, { onConflict: 'phone_or_email' })
      .select('id, total_points')
      .single();

    if (userErr) {
      console.error('[/user/me] users upsert error:', userErr);
      return res.status(500).json({ success: false, error: 'DB error', detail: userErr.message });
    }
    if (!dbUser) {
      return res.json({ success: true, data: { points: 0, history: [], reviews: [] } });
    }

    console.log('[/user/me] dbUser:', dbUser.id, 'points:', dbUser.total_points);

    // Get points history
    const { data: logs, error: logsErr } = await sb
      .from('points_log')
      .select('amount, created_at, reviews(text, items(name))')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (logsErr) console.error('[/user/me] points_log error:', logsErr);

    // Get reviews for purchases view
    const { data: reviews, error: revErr } = await sb
      .from('reviews')
      .select('created_at, points_earned, stars, text, items(name)')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (revErr) console.error('[/user/me] reviews error:', revErr);

    return res.json({
      success: true,
      data: {
        points: dbUser.total_points || 0,
        history: (logs || []).map(l => ({
          amount:     l.amount,
          item:       l.reviews?.items?.name || null,
          created_at: l.created_at,
        })),
        reviews: (reviews || []).map(r => ({
          created_at:    r.created_at,
          points_earned: r.points_earned || 0,
          item:          r.items?.name || 'Товар',
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
