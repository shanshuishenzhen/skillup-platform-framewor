const jwt = require('jsonwebtoken');

// This is the same secret key used in routes/auth.js
// In a real app, this should be an environment variable
const JWT_SECRET = 'your_jwt_secret_key';

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Attach user from payload to the request object
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
