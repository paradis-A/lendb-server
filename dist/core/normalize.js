"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
const lodash_1 = require("lodash");
function Normalize(data) {
    let res = {};
    if ((0, lodash_1.isObject)(data)) {
        let entries = Object.entries(data);
        for (const entry of entries) {
            const key = entry[0];
            const value = entry[1];
            if ((0, lodash_1.isObject)(value) && !(0, lodash_1.isDate)(value)) {
                let keys = Object.keys(value);
                let tempObj = {};
                if (keys.every((k) => cuid_1.default.isCuid(k))) {
                    tempObj = Object.values(value).map(t => Normalize(t));
                }
                else {
                    tempObj = value;
                }
                // console.log(Normalize(tempObj))
                res[key] = tempObj;
            }
            else {
                res[key] = value;
            }
        }
    }
    return res;
}
exports.default = Normalize;
