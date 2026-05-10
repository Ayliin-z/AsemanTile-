// backend/middleware/roleMiddleware.js
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user; // بعد از احراز هویت (مثلاً توسط verifyToken)
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    next();
  };
};

module.exports = { allowRoles };