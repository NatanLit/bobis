const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _client;
}

// Public: GET /items?ids=uuid1,uuid2 — used by review form to display names/images
router.get('/', async (req, res) => {
  try {
    const sb = getClient();
    if (!sb) return res.status(503).json({ success: false, error: 'DB not configured' });

    const idsParam = (req.query.ids || '').trim();
    if (!idsParam) return res.json({ success: true, data: [] });

    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ success: true, data: [] });

    const { data, error } = await sb
      .from('items')
      .select('id, name, image_url')
      .in('id', ids);

    if (error) {
      console.error('[/items] error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Preserve order from request
    const byId = Object.fromEntries((data || []).map(i => [i.id, i]));
    const ordered = ids.map(id => byId[id]).filter(Boolean);
    return res.json({ success: true, data: ordered });
  } catch (e) {
    console.error('[/items] exception:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
