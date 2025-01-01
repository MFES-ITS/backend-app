const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_RESET;

const authenticateReset = (req, res, next) => {
  const authHeader = req.header('Reset-Token');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied. Missing Reset-Token in header.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid code.' });
  }
};

module.exports = authenticateReset;