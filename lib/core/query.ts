import Emittery from "emittery";
import cuid from "cuid";
import { cloneDeep, isObject } from "lodash";
import { Serializer } from "./";
import Normalize from "./normalize";
import { AceBase } from "acebase";
import { DataReferenceQuery } from "acebase-core";
export default class LenQuery {
    protected ref: string;
    filters: any = {};
    sorts: { [any: string]: "ASC" | "DESC" | null } = {};
    skip: number = 0;
    limit: number = 100;
    page: number = 0;
    listener: iLiveQuery;
    #live = false;
    #liveRef: DataReferenceQuery;
    #acebase: AceBase;
    protected aggregates: Aggregate;
    protected operation: string;
    protected exclusion: string[] = [];
    protected inclusion: string[] = [];
    searchString: string;
    protected serializer: Serializer;
    protected emitter: Emittery;
    protected unsubscribePrevious: Function = null;
    protected hook: boolean;
    constructor(ref: string, emitter: Emittery, serializer: Serializer, acebase: AceBase) {
        this.serializer = serializer;
        this.emitter = emitter;
        this.ref = ref;
        this.operation = "query";
        this.hook = false;
        this.#acebase = acebase;
    }

    like(field: string, value: any, pattern: "both" | "left" | "right") {
        let val = "*" + value + "*";
        if (pattern == "left") val = "*" + value;
        if (pattern == "right") val = value + "*";
        this.filters[field + "[like]"] = val;
        return this;
    }

    notLike(field: string, value: string, pattern: "both" | "left" | "right") {
        let val = "*" + value + "*";
        if (pattern == "left") val = "*" + value;
        if (pattern == "right") val = value + "*";
        this.filters[field + "[!like]"] = val;
        return this;
    }

    gt(field: string, value: any) {
        this.filters[field + "[>]"] = value;
        return this;
    }

    gte(field: string, value: any) {
        this.filters[field + "[>=]"] = value;
        return this;
    }

    between(field: string, value: any) {
        this.filters[field + "[between]"] = value;
        return this;
    }

    notBetween(field: string, value: any) {
        this.filters[field + "[!between]"] = value;
        return this;
    }

    lt(field: string, value: any) {
        this.filters[field + "[<]"] = value;
        return this;
    }

    lte(field: string, value: any) {
        this.filters[field + "[<=]"] = value;
        return this;
    }

    eq(field: string, value: any) {
        this.filters[field + "[==]"] = value;
        return this;
    }

    notEq(field: string, value: any) {
        this.filters[field + "[!=]"] = value;
        return this;
    }

    in(field: string, value: any[]) {
        this.filters[field + "[in]"] = value;
        return this;
    }

    notIn(field: string, value: any[]) {
        this.filters[field + "[!in]"] = value;
        return this;
    }

    matches(field: string, value: any[]) {
        this.filters[field + "[matches]"] = value;
        return this;
    }

    notMatches(field: string, value: any[]) {
        this.filters[field + "[!matches]"] = value;
        return this;
    }

    has(field: string, value: any[]) {
        this.filters[field + "[has]"] = value;
        return this;
    }

    notHas(field: string, value: any[]) {
        this.filters[field]["!has"] = value;
        return this;
    }

    contains(field: string, value: any[]) {
        this.filters[field]["contains"] = value;
        return this;
    }

    notContains(field: string, value: any[]) {
        this.filters[field]["!contains"] = value;
        return this;
    }

    sort(field: string, asc = false) {
        this.sorts[field] = asc ? "ASC" : "DESC";
        return this;
    }

    exclude(fields: string[]) {
        this.exclusion = fields;
    }

    include(fields: string[]) {
        this.inclusion = fields;
    }

    search(word: string) {
        this.searchString = word;
        return this;
    }

    on(cb: (event: iLiveQuery) => void) {
        let events = new iLiveQuery();
        cb(events);
        this.listener = events;
        this.#live = true;
    }

    protected stripNonQuery(clone: this) {
        delete clone.serializer;
        delete clone.emitter;
        delete clone.unsubscribePrevious;
        delete clone.listener;
        return clone;
    }

    protected toWildCardPath(ref: string) {
        return ref
            .split("/")
            .map((r) => {
                return cuid.isCuid(r) ? "*" : r;
            })
            .join("/");
    }

    aggregate(groupBy: string, cb: (ops: Aggregate) => void | Aggregate) {
        this.aggregates = new Aggregate(groupBy);
        cb(this.aggregates);
        return this;
    }

    async execute(
        options: { page?: number; limit?: number; hook?: boolean } = {
            hook: false,
        }
    ): Promise<{ data: any[]; count: number }> {
        try {
            if (this.ref.includes("__users__") || this.ref.includes("__tokens__")) {
                return Promise.reject("Error: cannot access secured refferences use  instance.User() instead.");
            }
            const { page, limit, hook } = options;
            this.hook = hook;
            let clone = this.stripNonQuery(cloneDeep(this));
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

            if (clone.filters && isObject(clone.filters) && Object.entries(clone.filters).length) {
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
                            if (filter == "in" && !Array.isArray(value)) throw new Error("Invalid filter");
                            if (filter == "between" && !Array.isArray(value)) throw new Error("Invalid filter");
                            const alphaOperators = {
                                eq: "==",
                                neq: "!=",
                                gt: ">",
                                gte: ">=",
                                lt: "<",
                                lte: "<=",
                            };
                            if (filter.startsWith("not")) {
                                let transformedFilter = Object.keys(alphaOperators).includes(
                                    filter.substring(2).toLowerCase()
                                )
                                    ? alphaOperators[filter.substring(2).toLowerCase()]
                                    : filter.substring(2).toLowerCase();
                                tempFilters.push([field, transformedFilter, value]);
                            } else {
                                tempFilters.push([field, filter, value]);
                            }
                        } else {
                            throw new Error("Invalid filter");
                        }
                    } else {
                        if (Array.isArray(value)) {
                            tempFilters.push([key, "in", value]);
                        } else {
                            tempFilters.push([key, "==", value]);
                        }
                    }
                }
                //@ts-ignore
                clone.filters = tempFilters;
            } else {
                //@ts-ignore
                clone.filters = [];
            }
            if (clone.aggregates && clone?.aggregates.list.length) {
                const { groupBy, list } = clone.aggregates;
                //@ts-ignore
                clone.aggregates = { groupBy, list };
            }
            if (clone.sorts && isObject(clone.sorts) && Object.entries(clone.sorts).length) {
                let tempSorts = [];
                for (const entry of Object.entries(clone.sorts)) {
                    let key = entry[0];
                    let value = entry[1];
                    if (value == "ASC") {
                        tempSorts.push([key, true]);
                    } else if (value == "DESC") {
                        tempSorts.push([key, false]);
                    }
                }
                //@ts-ignore
                clone.sorts = tempSorts;
            }
            if (page && typeof page == "number") clone.page = page;
            if (limit && typeof limit == "number") clone.limit = limit;
            if (this.#live && this.listener.callbacks.length) {
                await this.createListener(clone);
            } else {
                this.#liveRef = this.serializer.applyFilters(clone, this.#acebase.query(clone.ref));
                let res = await this.serializer.Execute(clone);
                let tempData = res?.data;
                if (tempData && Array.isArray(tempData)) {
                    tempData = tempData.map((data) => {
                        return Normalize(data);
                    });
                }
                res.data = tempData;
                return Promise.resolve(res);
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected async createListener(transaction) {
        try {
            this.#liveRef.on("add", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("add")(result);
                });
            });
            this.#liveRef.on("change", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("add")(result);
                });
            });
            this.#liveRef.on("change", (rqe) => {
                this.serializer.LivePayload(transaction, rqe).then((result) => {
                    this.listener.getEvent("add")(result);
                });
            });
            await this.#liveRef.find();
            let res = await this.serializer.Execute(transaction);
            //turns off when execute called again and if on() not called before execute this function will not be executed
            this.#live = false;
            return Promise.resolve({ data: res.data, cout: res.count });
        } catch (error) {
            return Promise.reject(error);
        }
    }
    unsubscribe() {}
}

class Aggregate {
    list: {
        field: string;
        operation: "SUM" | "COUNT" | "MIN" | "MAX" | "AVG";
        alias: string;
    }[] = [];
    groupBy: string;
    constructor(groupBy: string) {
        this.groupBy = groupBy;
    }

    sum(field: string, alias: string) {
        this.list.push({ field, operation: "SUM", alias });
        return this;
    }

    count(field: string, alias: string) {
        this.list.push({ field, operation: "COUNT", alias });
        return this;
    }

    min(field: string, alias: string) {
        this.list.push({ field, operation: "MIN", alias });
        return this;
    }

    max(field: string, alias: string) {
        this.list.push({ field, operation: "MAX", alias });
        return this;
    }

    avg(field: string, alias: string) {
        this.list.push({ field, operation: "AVG", alias });
        return this;
    }
}

class iLiveQuery {
    callbacks: Function[] = [];
    protected add: Function = null;
    protected update: Function = null;
    protected destroy: Function = null;
    onAdd(cb: (e: any) => void) {
        this.add = cb;
    }

    onUpdate(cb: (e: any) => void) {
        this.update = cb;
    }

    onDestroy(cb: (e: any) => void) {
        this.destroy = cb;
    }

    getEvent(event: "add" | "update" | "destroy") {
        if (event == "add") return this.add;
        if (event == "update") return this.update;
        if (event == "destroy") return this.update;
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
