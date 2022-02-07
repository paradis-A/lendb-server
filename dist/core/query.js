"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
const lodash_1 = require("lodash");
const normalize_1 = __importDefault(require("./normalize"));
class LenQuery {
    constructor(ref, emitter, serializer, acebase) {
        this.filters = {};
        this.sorts = {};
        this.skip = 0;
        this.limit = 100;
        this.page = 0;
        this.exclusion = [];
        this.inclusion = [];
        this.unsubscribePrevious = null;
        this.serializer = serializer;
        this.emitter = emitter;
        this.ref = ref;
        this.operation = "query";
        this.hook = false;
    }
    like(field, value, pattern) {
        let val = "*" + value + "*";
        if (pattern == "left")
            val = "*" + value;
        if (pattern == "right")
            val = value + "*";
        this.filters[field + "[like]"] = val;
        return this;
    }
    notLike(field, value, pattern) {
        let val = "*" + value + "*";
        if (pattern == "left")
            val = "*" + value;
        if (pattern == "right")
            val = value + "*";
        this.filters[field + "[!like]"] = val;
        return this;
    }
    gt(field, value) {
        this.filters[field + "[>]"] = value;
        return this;
    }
    gte(field, value) {
        this.filters[field + "[>=]"] = value;
        return this;
    }
    between(field, value) {
        this.filters[field + "[between]"] = value;
        return this;
    }
    notBetween(field, value) {
        this.filters[field + "[!between]"] = value;
        return this;
    }
    lt(field, value) {
        this.filters[field + "[<]"] = value;
        return this;
    }
    lte(field, value) {
        this.filters[field + "[<=]"] = value;
        return this;
    }
    eq(field, value) {
        this.filters[field + "[eq]"] = value;
        return this;
    }
    notEq(field, value) {
        this.filters[field + "[!=]"] = value;
        return this;
    }
    in(field, value) {
        this.filters[field + "[in]"] = value;
        return this;
    }
    notIn(field, value) {
        this.filters[field + "[!in]"] = value;
        return this;
    }
    matches(field, value) {
        this.filters[field + "[matches]"] = value;
        return this;
    }
    notMatches(field, value) {
        this.filters[field + "[!matches]"] = value;
        return this;
    }
    has(field, value) {
        this.filters[field + "[has]"] = value;
        return this;
    }
    notHas(field, value) {
        this.filters[field]["!has"] = value;
        return this;
    }
    contains(field, value) {
        this.filters[field]["contains"] = value;
        return this;
    }
    notContains(field, value) {
        this.filters[field]["!contains"] = value;
        return this;
    }
    sort(field, asc = false) {
        this.sorts[field] = asc ? "ASC" : "DESC";
        return this;
    }
    exclude(fields) {
        this.exclusion = fields;
    }
    include(fields) {
        this.inclusion = fields;
    }
    search(word) {
        this.searchString = word;
        return this;
    }
    stripNonQuery(clone) {
        delete clone.serializer;
        delete clone.emitter;
        delete clone.unsubscribePrevious;
        return clone;
    }
    toWildCardPath(ref) {
        return ref
            .split("/")
            .map((r) => {
            return cuid_1.default.isCuid(r) ? "*" : r;
        })
            .join("/");
    }
    async fetch(options = {
        hook: false,
    }) {
        try {
            if (this.ref.includes("__users__") || this.ref.includes("__tokens__")) {
                return Promise.reject("Error: cannot access secured refferences use  instance.User() instead.");
            }
            const { page, limit, hook } = options;
            this.hook = hook;
            let clone = this.stripNonQuery((0, lodash_1.cloneDeep)(this));
            if (page && typeof page == "number")
                clone.page = page;
            if (limit && typeof limit == "number")
                clone.limit = limit;
            let res = await this.serializer.Execute(clone);
            let tempData = res?.data;
            if (tempData && Array.isArray(tempData)) {
                tempData = tempData.map(data => {
                    return (0, normalize_1.default)(data);
                });
            }
            res.data = tempData;
            return Promise.resolve(res);
        }
        catch (error) {
            // if(error?.message.startsWith("Error: This wildcard path query")){
            //     return Promise.resolve({data: [], count: []})
            // }
            return Promise.reject(error);
        }
    }
}
exports.default = LenQuery;
class iLiveQuery {
    constructor() {
        this.callbacks = [];
        this.add = null;
        this.update = null;
        this.destroy = null;
    }
    onAdd(cb) {
        this.add = cb;
    }
    onUpdate(cb) {
        this.update = cb;
    }
    onDestroy(cb) {
        this.destroy = cb;
    }
    getEvent(event) {
        if (event == "add")
            return this.add;
        if (event == "update")
            return this.update;
        if (event == "destroy")
            return this.update;
    }
}
//# sourceMappingURL=query.js.map