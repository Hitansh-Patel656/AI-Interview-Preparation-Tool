// authMiddleware.js
// Verifies the JWT access token from the Authorization header
// and attaches { id } to req.user for use in controllers.

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Token expired" });
            }
            return res.status(401).json({ message: "Invalid token" });
        }

        // Reject refresh tokens being used as access tokens
        if (payload.type === "refresh") {
            return res.status(401).json({ message: "Invalid token type" });
        }

        req.user = { id: payload.sub };
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = authMiddleware;