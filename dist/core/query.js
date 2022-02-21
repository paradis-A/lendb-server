"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _LenQuery_live, _LenQuery_liveRef, _LenQuery_acebase;
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
        _LenQuery_live.set(this, false);
        _LenQuery_liveRef.set(this, void 0);
        _LenQuery_acebase.set(this, void 0);
        this.exclusion = [];
        this.inclusion = [];
        this.unsubscribePrevious = null;
        this.serializer = serializer;
        this.emitter = emitter;
        this.ref = ref;
        this.operation = "query";
        this.hook = false;
        __classPrivateFieldSet(this, _LenQuery_acebase, acebase, "f");
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
        this.filters[field + "[==]"] = value;
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
    on(cb) {
        let events = new iLiveQuery();
        cb(events);
        this.listener = events;
        __classPrivateFieldSet(this, _LenQuery_live, true, "f");
    }
    stripNonQuery(clone) {
        delete clone.serializer;
        delete clone.emitter;
        delete clone.unsubscribePrevious;
        delete clone.listener;
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
    aggregate(groupBy, cb) {
        this.aggregates = new Aggregate(groupBy);
        cb(this.aggregates);
        return this;
    }
    async execute(options = {
        hook: false,
    }) {
        try {
            if (this.ref.includes("__users__") || this.ref.includes("__tokens__")) {
                return Promise.reject("Error: cannot access secured refferences use  instance.User() instead.");
            }
            const { page, limit, hook } = options;
            this.hook = hook;
            let clone = this.stripNonQuery((0, lodash_1.cloneDeep)(this));
            //clear white spaces ons earch string
            if (clone.searchString) {
                let noWhiteSpace = clone.searchString.split(" ");
                if (noWhiteSpace.every((v) => v == "")) {
                    delete clone.searchString;
                }
                if (!clone.searchString.length) {
                    delete clone.searchString;
                }
            }
            if (clone.filters && (0, lodash_1.isObject)(clone.filters) && Object.entries(clone.filters).length) {
                let tempFilters = [];
                for (const entry of Object.entries(clone.filters)) {
                    let key = entry[0];
                    let value = entry[1];
                    if (key.includes("[") || key.includes("]")) {
                        let start = key.indexOf("[");
                        let end = key.indexOf("]");
                        if (start == -1 || end == -1) {
                            throw new Error("Filter must be enclosed with []");
                        }
                        let filter = key.substring(start + 1, end);
                        let field = key.substring(0, start);
                        if (operatorBasis.includes(filter)) {
                            if (filter == "in" && !Array.isArray(value))
                                throw new Error("Invalid filter");
                            if (filter == "between" && !Array.isArray(value))
                                throw new Error("Invalid filter");
                            const alphaOperators = {
                                eq: "==",
                                neq: "!=",
                                gt: ">",
                                gte: ">=",
                                lt: "<",
                                lte: "<=",
                            };
                            if (filter.startsWith("not")) {
                                let transformedFilter = Object.keys(alphaOperators).includes(filter.substring(2).toLowerCase())
                                    ? alphaOperators[filter.substring(2).toLowerCase()]
                                    : filter.substring(2).toLowerCase();
                                tempFilters.push([field, transformedFilter, value]);
                            }
                            else {
                                tempFilters.push([field, filter, value]);
                            }
                        }
                        else {
                            throw new Error("Invalid filter");
                        }
                    }
                    else {
                        if (Array.isArray(value)) {
                            tempFilters.push([key, "in", value]);
                        }
                        else {
                            tempFilters.push([key, "==", value]);
                        }
                    }
                }
                //@ts-ignore
                clone.filters = tempFilters;
            }
            else {
                //@ts-ignore
                clone.filters = [];
            }
            if (clone.aggregates && clone?.aggregates.list.length) {
                const { groupBy, list } = clone.aggregates;
                //@ts-ignore
                clone.aggregates = { groupBy, list };
            }
            if (clone.sorts && (0, lodash_1.isObject)(clone.sorts) && Object.entries(clone.sorts).length) {
                let tempSorts = [];
                for (const entry of Object.entries(clone.sorts)) {
                    let key = entry[0];
                    let value = entry[1];
                    if (value == "ASC") {
                        tempSorts.push([key, true]);
                    }
                    else if (value == "DESC") {
                        tempSorts.push([key, false]);
                    }
                }
                //@ts-ignore
                clone.sorts = tempSorts;
            }
            if (page && typeof page == "number")
                clone.page = page;
            if (limit && typeof limit == "number")
                clone.limit = limit;
            if (__classPrivateFieldGet(this, _LenQuery_live, "f") && this.listener.callbacks.length) {
                await this.createListener(clone);
            }
            else {
                let res = await this.serializer.Execute(clone);
                let tempData = res?.data;
                if (tempData && Array.isArray(tempData)) {
                    tempData = tempData.map((data) => {
                        return (0, normalize_1.default)(data);
                    });
                }
                res.data = tempData;
                return Promise.resolve(res);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async createListener(transaction) {
        try {
            this.unsubscribe();
            __classPrivateFieldSet(this, _LenQuery_liveRef, this.serializer.applyFilters(transaction, __classPrivateFieldGet(this, _LenQuery_acebase, "f").query(transaction.ref)), "f");
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").on("add", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("add")(result);
                });
            });
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").on("change", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("update")(result);
                });
            });
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").on("remove", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("destroy")(result);
                });
            });
            await __classPrivateFieldGet(this, _LenQuery_liveRef, "f").find();
            let res = await this.serializer.Execute(transaction);
            //turns off when execute called again and if on() not called before execute this function will not be executed
            __classPrivateFieldSet(this, _LenQuery_live, false, "f");
            return Promise.resolve({ data: res.data, cout: res.count });
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    unsubscribe() {
        if (__classPrivateFieldGet(this, _LenQuery_liveRef, "f")) {
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").off("add", () => { });
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").off("change", () => { });
            __classPrivateFieldGet(this, _LenQuery_liveRef, "f").off("remove", () => { });
            __classPrivateFieldSet(this, _LenQuery_liveRef, null, "f");
        }
    }
}
exports.default = LenQuery;
_LenQuery_live = new WeakMap(), _LenQuery_liveRef = new WeakMap(), _LenQuery_acebase = new WeakMap();
class Aggregate {
    constructor(groupBy) {
        this.list = [];
        this.groupBy = groupBy;
    }
    sum(field, alias) {
        this.list.push({ field, operation: "SUM", alias });
        return this;
    }
    count(field, alias) {
        this.list.push({ field, operation: "COUNT", alias });
        return this;
    }
    min(field, alias) {
        this.list.push({ field, operation: "MIN", alias });
        return this;
    }
    max(field, alias) {
        this.list.push({ field, operation: "MAX", alias });
        return this;
    }
    avg(field, alias) {
        this.list.push({ field, operation: "AVG", alias });
        return this;
    }
}
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
const operatorBasis = [
    "eq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "in",
    "neq",
    "has",
    "notHas",
    "contains",
    "notContains",
    "notLike",
    "between",
    "notIn",
    "notBetween",
    "matches",
    "notEq",
    "notMatches",
    "!eq",
    "!has",
    "!contains",
    "!like",
    "!between",
    "!in",
    "!matches",
    "==",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
];
