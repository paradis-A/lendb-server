import Emittery from "emittery";
import { Serializer } from "./";
export default class LenQuery {
    protected filters: any[];
    protected ref: string;
    skip: number;
    limit: number;
    page: number;
    protected operation: string;
    protected exclusion: string[];
    protected inclusion: string[];
    protected sorts: any[];
    protected serializer: Serializer;
    protected emitter: Emittery;
    protected unsubscribePrevious: Function;
    protected hook: boolean;
    constructor(ref: string, emitter: Emittery, serializer: Serializer);
    like(field: string, value: any, pattern: "both" | "left" | "right"): this;
    notLike(field: string, value: string, pattern: "both" | "left" | "right"): this;
    gt(field: string, value: any): this;
    gte(field: string, value: any): this;
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
    sort(field: string, asc?: boolean): void;
    exclude(fields: string[]): void;
    include(fields: string[]): void;
    protected stripNonQuery(clone: this): this;
    watch(cb: (event: iLiveQuery) => void, fetchOptions?: {
        page?: number;
        limit?: number;
        hook?: boolean;
    }): Promise<any>;
    protected toWildCardPath(ref: string): string;
    fetch(options?: {
        page?: number;
        limit?: number;
        hook?: boolean;
    }): Promise<any>;
}
declare class iLiveQuery {
    callbacks: Function[];
    protected add: Function;
    protected update: Function;
    protected destroy: Function;
    onAdd(cb: (e: any) => void): void;
    onUpdate(cb: (e: any) => void): void;
    onDestroy(cb: (e: any) => void): void;
    getEvent(event: "add" | "update" | "destroy"): Function;
}
export {};
