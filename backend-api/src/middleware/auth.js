import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized to access this route' });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id);

      if (!user) {
        res.status(401).json({ success: false, message: 'User not found' });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({ success: false, message: 'User account is deactivated' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error in authentication' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authorized' });
    return;
  }

  if (!roles.includes(req.user.role)) {
    res.status(403).json({ success: false, message: `User role '${req.user.role}' is not authorized to access this route` });
    return;
  }

  next();
};