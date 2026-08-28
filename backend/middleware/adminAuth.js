/**
 * adminAuth.js
 * Middleware to protect developer-only endpoints.
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 */

const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Developer access only. Provide a valid Authorization token.',
    });
  }

  next();
};

module.exports = adminAuth;
