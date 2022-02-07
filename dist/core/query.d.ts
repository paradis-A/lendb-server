import Emittery from "emittery";
import { Serializer } from "./";
import { AceBase } from "acebase";
export default class LenQuery {
    protected ref: string;
    filters: any;
    sorts: {
        [any: string]: "ASC" | "DESC" | null;
    };
    skip: number;
    limit: number;
    page: number;
    protected operation: string;
    protected exclusion: string[];
    protected inclusion: string[];
    searchString: string;
    protected serializer: Serializer;
    protected emitter: Emittery;
    protected unsubscribePrevious: Function;
    protected hook: boolean;
    constructor(ref: string, emitter: Emittery, serializer: Serializer, acebase?: AceBase);
    like(field: string, value: any, pattern: "both" | "left" | "right"): this;
    notLike(field: string, value: string, pattern: "both" | "left" | "right"): this;
    gt(field: string, value: any): this;
    gte(field: string, value: any): this;
    between(field: string, value: any): this;
    notBetween(field: string, value: any): this;
    lt(field: string, value: any): this;
    lte(field: string, value: any): this;
    eq(field: string, value: any): this;
    notEq(field: string, value: any): this;
    in(field: string, value: any[]): this;
    notIn(field: string, value: any[]): this;
    matches(field: string, value: any[]): this;
    notMatches(field: string, value: any[]): this;
    has(field: string, value: any[]): this;
    notHas(field: string, value: any[]): this;
    contains(field: string, value: any[]): this;
    notContains(field: string, value: any[]): this;
    sort(field: string, asc?: boolean): this;
    exclude(fields: string[]): void;
    include(fields: string[]): void;
    search(word: string): this;
    protected stripNonQuery(clone: this): this;
    protected toWildCardPath(ref: string): string;
    fetch(options?: {
        page?: number;
        limit?: number;
        hook?: boolean;
    }): Promise<{
        data: any;
        count: number;
    }>;
}
