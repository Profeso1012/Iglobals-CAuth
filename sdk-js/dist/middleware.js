"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequireAuth = createRequireAuth;
exports.createOptionalAuth = createOptionalAuth;
function createRequireAuth(ica) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token missing or malformed.', status: 401 });
            return;
        }
        const token = authHeader.split(' ')[1];
        try {
            const payload = await ica.verifyToken(token);
            req.icaUser = payload;
            next();
        }
        catch (err) {
            res.status(401).json({ error: 'unauthorized', error_description: err.message, status: 401 });
        }
    };
}
function createOptionalAuth(ica) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        try {
            const payload = await ica.verifyToken(token);
            req.icaUser = payload;
        }
        catch (err) {
            // Ignore errors for optional auth
        }
        next();
    };
}
