const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// GET /user/me — returns points, history and reviews for the authenticated user
router.get('/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ success: false, error: 'No token' });

    const sb = getSupabase();
    if (!sb) return res.status(503).json({ success: false, error: 'DB not configured' });

    // Verify token with Supabase Auth
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: 'Invalid token' });

    const email = user.email;

    // Find or create user record in users table
    const { data: dbUser } = await sb
      .from('users')
      .upsert({ phone_or_email: email }, { onConflict: 'phone_or_email' })
      .select('id, total_points')
      .single();

    if (!dbUser) {
      return res.json({ success: true, data: { points: 0, history: [], reviews: [] } });
    }

    // Get points history
    const { data: logs } = await sb
      .from('points_log')
      .select('amount, created_at, reviews(text, items(name))')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Get reviews for purchases view
    const { data: reviews } = await sb
      .from('reviews')
      .select('created_at, points_earned, stars, text, items(name)')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

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
    console.error('GET /user/me error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
