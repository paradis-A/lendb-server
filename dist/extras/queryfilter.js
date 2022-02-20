"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class iLenQueryFilter {
    constructor() {
        this.filters = [];
        this.skip = 0;
        this.limit = 100;
        this.page = 0;
        this.exclusion = [];
        this.inclusion = [];
        this.sorts = [];
    }
    like(field, value, pattern) {
        let val = "*" + value + "*";
        if (pattern == "left")
            val = "*" + value;
        if (pattern == "right")
            val = value + "*";
        this.filters.push([field, "like", val]);
        return this;
    }
    notLike(field, value, pattern) {
        let val = "*" + value + "*";
        if (pattern == "left")
            val = "*" + value;
        if (pattern == "right")
            val = value + "*";
        this.filters.push([field, "!like", val]);
        return this;
    }
    gt(field, value) {
        this.filters.push([field, ">", value]);
        return this;
    }
    gte(field, value) {
        this.filters.push([field, ">=", value]);
        return this;
    }
    between(field, value) {
        this.filters.push([field, "between", value]);
        return this;
    }
    notBetween(field, value) {
        this.filters.push([field, "!notBetween", value]);
        return this;
    }
    lt(field, value) {
        this.filters.push([field, "<", value]);
        return this;
    }
    lte(field, value) {
        this.filters.push([field, "<=", value]);
        return this;
    }
    eq(field, value) {
        this.filters.push([field, "==", value]);
        return this;
    }
    notEq(field, value) {
        this.filters.push([field, "!=", value]);
        return this;
    }
    in(field, value) {
        this.filters.push([field, "in", value]);
        return this;
    }
    notIn(field, value) {
        this.filters.push([field, "!in", value]);
        return this;
    }
    matches(field, value) {
        this.filters.push([field, "matches", value]);
        return this;
    }
    notMatches(field, value) {
        this.filters.push([field, "!matches", value]);
        return this;
    }
    has(field, value) {
        this.filters.push([field, "has", value]);
        return this;
    }
    notHas(field, value) {
        this.filters.push([field, "!has", value]);
        return this;
    }
    contains(field, value) {
        this.filters.push([field, "contains", value]);
        return this;
    }
    notContains(field, value) {
        this.filters.push([field, "!contains", value]);
        return this;
    }
    sort(field, asc = false) {
        this.sorts.push([field, asc]);
        return this;
    }
    exclude(fields) {
        this.exclusion = fields;
        return this;
    }
    include(fields) {
        this.inclusion = fields;
        return this;
    }
}
exports.default = iLenQueryFilter;
