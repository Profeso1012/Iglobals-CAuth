"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICAClient = void 0;
exports.createIGlobalsAuth = createIGlobalsAuth;
const client_1 = require("./client");
const middleware_1 = require("./middleware");
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
var client_2 = require("./client");
Object.defineProperty(exports, "ICAClient", { enumerable: true, get: function () { return client_2.ICAClient; } });
function createIGlobalsAuth(config) {
    const client = new client_1.ICAClient(config);
    const instance = client;
    instance.requireAuth = (0, middleware_1.createRequireAuth)(client);
    instance.optionalAuth = (0, middleware_1.createOptionalAuth)(client);
    return instance;
}
