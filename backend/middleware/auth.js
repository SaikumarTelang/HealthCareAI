const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        req.user = { role: 'patient', id: 'dev-user' };
        return next();
      }
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      req.user = { role: 'patient', id: 'dev-user' };
      return next();
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const clinicianAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    return auth(req, res, () => {
      if (req.user.role === 'clinician' || req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ message: 'Access denied: Clinicians only' });
      }
    });
  }

  if (process.env.NODE_ENV === 'development') {
    req.user = {
      role: 'clinician',
      id: 'dev-clinician',
      name: 'Dr. Developer',
      department: 'all'
    };
    return next();
  }

  res.status(401).json({ message: 'No token, authorization denied' });
};

module.exports = {
  auth,
  clinicianAuth
};
