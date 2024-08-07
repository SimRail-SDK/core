"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exception = exception;
function exception(code, message) {
    const error = Error(message);
    error.name = code;
    return error;
}
//# sourceMappingURL=index.js.map