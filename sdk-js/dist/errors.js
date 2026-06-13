"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICAError = void 0;
class ICAError extends Error {
    error;
    error_description;
    status;
    constructor(error, error_description, status) {
        super(`${error}: ${error_description}`);
        this.name = 'ICAError';
        this.error = error;
        this.error_description = error_description;
        this.status = status;
        Object.setPrototypeOf(this, ICAError.prototype);
    }
}
exports.ICAError = ICAError;
