require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Session store ──────────────────────────────────────────────────────────
let sessionStore;
if (process.env.MONGODB_URI) {
  const MongoStore = require('connect-mongo');
  sessionStore = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
  console.log('[Server] Using MongoDB session store');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'cga-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

// ── Passport ───────────────────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || '';
    const user = {
      id: profile.id,
      name: profile.displayName,
      email,
      avatar: profile.photos?.[0]?.value || ''
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ── Static files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Login page
app.get('/login', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Unauthorized page
app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unauthorized.html'));
});

// Dashboard (protected)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User info endpoint (for frontend)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user?.name, email: req.user?.email, avatar: req.user?.avatar });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[CGA] Running on http://localhost:${PORT}`);
  console.log(`[CGA] Cache TTL: ${process.env.CACHE_TTL_SECONDS || 60}s`);
});
