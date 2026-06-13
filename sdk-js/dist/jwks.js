"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWKSService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const errors_1 = require("./errors");
class JWKSService {
    client;
    constructor(jwksUri) {
        this.client = (0, jwks_rsa_1.default)({
            jwksUri,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 3600000, // 1 hour
        });
    }
    getKey = (header, callback) => {
        this.client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                return callback(err);
            }
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        });
    };
    verifyToken(token, expectedAud, expectedIss) {
        return new Promise((resolve, reject) => {
            jsonwebtoken_1.default.verify(token, this.getKey, {
                audience: expectedAud,
                issuer: expectedIss,
                algorithms: ['RS256'],
            }, (err, decoded) => {
                if (err) {
                    reject(new errors_1.ICAError('invalid_token', err.message, 401));
                }
                else {
                    resolve(decoded);
                }
            });
        });
    }
}
exports.JWKSService = JWKSService;
