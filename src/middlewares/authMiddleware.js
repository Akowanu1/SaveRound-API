import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
try {
const authHeader = req.headers.authorization;

if (
!authHeader ||
!authHeader.startsWith('Bearer ') ||
!authHeader.slice(7).trim()
) {
return res.status(401).json({
message: 'Not authorized. Please log in.',
});
}

const token = authHeader.slice(7).trim();

const decoded = jwt.verify(
token,
process.env.JWT_SECRET_KEY
);

const user = await User.findById(decoded.id);

if (!user) {
return res.status(401).json({
message: 'Not authorized. User not found.',
});
}

// Password and verification fields are excluded by the schema.
req.user = user;

next();
} catch (error) {
return res.status(401).json({
message: 'Not authorized. Invalid or expired token.',
});
}
};

export default protect;
