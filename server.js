require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const reviewRouter = require('./routes/review');
const couponRouter = require('./routes/coupon');
const adminRouter  = require('./routes/admin');
const userRouter   = require('./routes/user');

const app = express();

app.use(express.json({ limit: '10mb' }));
// extensions: ['html'] lets /admin-login work without .html
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Friendly admin URLs
app.get('/admin', (req, res) => res.redirect('/admin-login.html'));
app.get('/panel', (req, res) => res.redirect('/admin-login.html'));

const ipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много запросов. Попробуйте через час.' },
});

app.use('/review', ipLimiter, reviewRouter);
app.use('/coupon', couponRouter);
app.use('/admin',  adminRouter);
app.use('/user',   userRouter);

app.get('/thanks.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'thanks.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
