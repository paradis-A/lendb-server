import type Request from "hyper-express/types/components/http/Request";
import type Response from "hyper-express/types/components/http/Response";
import type { TemplatedApp } from "../extras/uws";
import { AceBase } from "acebase";
import { iRefHook, iAuthHook, iAuthEvent, iRefEvent } from "./hook";
import type Emittery from "emittery";
import { DataReferenceQuery } from "acebase-core";
import Auth, { Account } from "./auth";
import type { ObjectLink } from "./";
import { RealtimeQueryEvent } from "acebase-core/types/data-reference";
export default class Serializer {
    protected acebase: AceBase;
    protected emitter: Emittery;
    protected refHooks: iRefHook[];
    protected authHook: iAuthHook[];
    protected auth: Auth;
    protected links: ObjectLink[];
    protected publisher: TemplatedApp;
    protected searchables: {
        ref: string;
        fields: string;
    }[];
    constructor(acebaseInstance: AceBase, emitteryInstance: Emittery, refHook: iRefHook[], authHook: iAuthHook[], auth?: Auth, link?: ObjectLink[], publisher?: TemplatedApp);
    Execute(payload: any, server?: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    protected ExecuteHook(event: iAuthEvent | iRefEvent, ref: string, data: any, req?: Request, res?: Response, user?: Account): any;
    protected getData(transaction: any): any;
    protected Destroy(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    protected Exists(transaction: any): Promise<boolean>;
    protected Load(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<{}>;
    protected Save(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    Upload(req: Request, res: Response, uploadPath: string): Promise<void>;
    protected generateSearchString(data: any): string;
    protected Search(ref: string, word: string): Promise<string[]>;
    protected ProcessLink(ref: string, key: string, data: any): Promise<any>;
    searchAndGroup(ref: string, transation: any, groupVar: string[]): void;
    protected autoIndex(path: string, data: any): Promise<boolean>;
    protected toWildCardPath(ref: string): string;
    protected sanitizeRefference(ref: string): string;
    protected Query(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<{
        data: any[];
        count: number;
    }>;
    LivePayload(transaction: {
        skip: number;
        limit: number;
        page: number;
        exclusion: string[];
        inclusion: string[];
        sort: any[];
        filters: any[];
        ref: string;
        searchString: string;
    }, eventEmitted: RealtimeQueryEvent): Promise<{
        data: any;
        count: number;
        index: number;
        newData: any[];
    }>;
    applyFilters(payload: any, queryRef: DataReferenceQuery): DataReferenceQuery;
}
