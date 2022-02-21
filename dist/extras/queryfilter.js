"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class iLenQueryFilter {
    constructor() {
        this.filters = {};
        this.sorts = {};
        this.skip = 0;
        this.limit = 100;
        this.page = 0;
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
}
exports.default = iLenQueryFilter;
