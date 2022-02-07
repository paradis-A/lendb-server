import Emittery from "emittery";
import cuid from "cuid";
import { cloneDeep } from "lodash";
import { Serializer } from "./";
import Normalize from "./normalize";
import { AceBase } from "acebase";
export default class LenQuery {
    protected ref: string;
    filters: any = {};
    sorts: { [any: string]: "ASC" | "DESC" | null } = {};
    skip: number = 0;
    limit: number = 100;
    page: number = 0;
    protected operation: string;
    protected exclusion: string[] = [];
    protected inclusion: string[] = [];
    searchString: string;
    protected serializer: Serializer;
    protected emitter: Emittery;
    protected unsubscribePrevious: Function = null;
    protected hook: boolean;
    constructor(
        ref: string,
        emitter: Emittery,
        serializer: Serializer,
        acebase?: AceBase
    ) {
        this.serializer = serializer;
        this.emitter = emitter;
        this.ref = ref;
        this.operation = "query";
        this.hook = false;
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
        this.filters[field + "[eq]"] = value;
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

    protected stripNonQuery(clone: this) {
        delete clone.serializer;
        delete clone.emitter;
        delete clone.unsubscribePrevious;
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

    async fetch(
        options: { page?: number; limit?: number; hook?: boolean } = {
            hook: false,
        }
    ): Promise<{ data: any; count: number }> {
        try {
            if (
                this.ref.includes("__users__") ||
                this.ref.includes("__tokens__")
            ) {
                return Promise.reject(
                    "Error: cannot access secured refferences use  instance.User() instead."
                );
            }
            const { page, limit, hook } = options;
            this.hook = hook;
            let clone = this.stripNonQuery(cloneDeep(this));
            if (page && typeof page == "number") clone.page = page;
            if (limit && typeof limit == "number") clone.limit = limit;
            let res = await this.serializer.Execute(clone);
            let tempData = res?.data;
            if (tempData && Array.isArray(tempData)) {
                tempData = tempData.map((data) => {
                    return Normalize(data);
                });
            }
            res.data = tempData;
            return Promise.resolve(res);
        } catch (error) {
            // if(error?.message.startsWith("Error: This wildcard path query")){
            //     return Promise.resolve({data: [], count: []})
            // }
            return Promise.reject(error);
        }
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
