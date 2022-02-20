"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = void 0;
const ptimeout_1 = __importDefault(require("./ptimeout"));
async function pWaitFor(condition, options = {}) {
    const { interval = 20, timeout = Number.POSITIVE_INFINITY, before = true } = options;
    let retryTimeout;
    const promise = new Promise((resolve, reject) => {
        const check = async () => {
            try {
                const value = await condition();
                if (typeof value !== 'boolean') {
                    throw new TypeError('Expected condition to return a boolean');
                }
                if (value === true) {
                    //@ts-ignore
                    resolve();
                }
                else {
                    retryTimeout = setTimeout(check, interval);
                }
            }
            catch (error) {
                reject(error);
            }
        };
        if (before) {
            check();
        }
        else {
            retryTimeout = setTimeout(check, interval);
        }
    });
    if (timeout !== Number.POSITIVE_INFINITY) {
        try {
            //@ts-ignore
            return await (0, ptimeout_1.default)(promise, timeout);
        }
        catch (error) {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            throw error;
        }
    }
    return promise;
}
exports.default = pWaitFor;
var ptimeout_2 = require("./ptimeout");
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return ptimeout_2.TimeoutError; } });
