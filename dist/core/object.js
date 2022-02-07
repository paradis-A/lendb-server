"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
const lodash_1 = require("lodash");
const normalize_1 = __importDefault(require("./normalize"));
class LenObject {
    constructor(ref, singularOrKey = false, serializer) {
        this.singular = false;
        this.eventHandles = {
            hook: true,
            emit: true,
        };
        this.operation = "save";
        this.serializer = serializer;
        this.key = (0, cuid_1.default)();
        if (typeof singularOrKey == "string" && cuid_1.default.isCuid(singularOrKey)) {
            this.key = singularOrKey;
        }
        else if (typeof singularOrKey == "boolean" && singularOrKey) {
            this.singular = singularOrKey;
            this.key = null;
        }
        this.ref = ref;
    }
    async destroy(serverOpts = { emit: false, hook: false }) {
        try {
            let payload = {
                key: this.key,
                ref: this.ref,
                operation: "destroy",
                singular: this.singular,
            };
            payload.eventHandles = {
                hook: serverOpts.hook,
                emit: serverOpts.emit,
            };
            let res = await this.serializer.Execute(payload);
            return Promise.resolve(res);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async commit(serverOpts = { emit: false, hook: false }) {
        try {
            if (this.ref.includes("*")) {
                return Promise.reject("Error: Adding or Updating must not contain wildcard path.");
            }
            let clone = {};
            if (this.operation == "save") {
                clone = this.stripNonData(Object.assign({}, this));
            }
            else if (this.operation == "destroy") {
                clone = Object.assign({}, {
                    operation: clone?.operation,
                    ref: clone.ref,
                    key: clone?.key,
                    sing: clone?.singular,
                });
            }
            clone.eventHandles = {
                hook: serverOpts.hook,
                emit: serverOpts.emit,
            };
            let res = await this.serializer.Execute(clone);
            this.operation = "save";
            return Promise.resolve(res);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    stripNonData(clone) {
        delete clone.created_at;
        delete clone.updated_at;
        delete clone.serializer;
        delete clone.childProps;
        delete clone.loadedRawData;
        return clone;
    }
    /**
     * Loads the data from the database with key provided
     * through constructor.
     * Will return null if object do not exist,
     */
    async load(serverOpts = { hook: false }) {
        try {
            let payload = {
                operation: "load",
                key: this.key,
                ref: this.ref,
                singular: this.singular,
            };
            payload.eventHandles = { hook: serverOpts.hook };
            let res = await this.serializer.Execute(payload);
            if (res) {
                return Promise.resolve((0, normalize_1.default)(res));
            }
            else {
                return Promise.resolve({ key: this.key });
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    // async exists(): Promise<boolean>{
    //     try {
    //         let payload = {operation: "exists", key: this.key, ref: this.ref, singular: this.singular}
    //         let res = await this.serializer.Execute(payload)
    //         return Promise.resolve(res)
    //     } catch (error) {
    //         return Promise.reject(error)
    //     }
    // }
    assign(data) {
        let temp = (0, lodash_1.cloneDeep)(data);
        delete temp.childProps;
        delete temp.eventHandles;
        delete temp.loadedRawData;
        delete temp.singular;
        delete temp.ref;
        delete temp.serializer;
        delete temp.singular;
        Object.assign(this, temp);
        return this;
    }
    clone() {
        return (0, lodash_1.cloneDeep)(this);
    }
    /**
     * Gets the data from LenObject.
     */
    toObject() {
        let temp = (0, lodash_1.cloneDeep)(this);
        delete temp.childProps;
        delete temp.eventHandles;
        delete temp.loadedRawData;
        delete temp.singular;
        delete temp.ref;
        delete temp.serializer;
        delete temp.singular;
        return temp;
    }
    /**
     * Mark this Object to be destroyed on calling commit() or commitMany().
     */
    toDestroy(yes = true) {
        this.operation = yes ? "destroy" : "save";
        return this;
    }
}
exports.default = LenObject;
//# sourceMappingURL=object.js.map