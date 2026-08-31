exports.ensureAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  next();
};
exports.ensureAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'moderator')
    return res.status(403).json({ error: 'Admin only' });
  next();
};
