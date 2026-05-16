/**
 * Middleware to protect routes - requires authenticated + authorized user
 */
function requireAuth(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.redirect('/login');
  }

  const authorizedEmails = (process.env.AUTHORIZED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = req.user?.email?.toLowerCase();

  if (authorizedEmails.length > 0 && !authorizedEmails.includes(userEmail)) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Access denied. Your email is not authorized.' });
    }
    return res.redirect('/unauthorized');
  }

  next();
}

module.exports = { requireAuth };
