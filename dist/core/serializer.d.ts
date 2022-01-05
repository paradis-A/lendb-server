import type Request from "hyper-express/types/components/http/Request";
import type Response from "hyper-express/types/components/http/Response";
import { AceBase } from "acebase";
import { iRefHook, iAuthHook, iAuthEvent, iRefEvent } from "./hook";
import type Emittery from "emittery";
import { DataReferenceQuery } from "acebase-core";
import Auth, { Account } from "./auth";
export default class Serializer {
    protected acebase: AceBase;
    protected emitter: Emittery;
    protected refHooks: iRefHook[];
    protected authHook: iAuthHook[];
    protected auth: Auth;
    constructor(acebaseInstance: AceBase, emitteryInstance: Emittery, refHook: iRefHook[], authHook: iAuthHook[], auth?: Auth);
    Execute(payload: any, server?: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    protected GetHook(event: iAuthEvent | iRefEvent, ref?: string): iAuthHook | iRefHook;
    protected ExecuteHook(event: iAuthEvent | iRefEvent, ref: string, data: any, req?: Request, res?: Response, user?: Account): void;
    protected getData(transaction: any): any;
    protected Destroy(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    protected Load(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<{}>;
    protected Save(transaction: any, server: {
        req?: Request;
        res?: Response;
    }): Promise<any>;
    Upload(req: Request, res: Response): Promise<void>;
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
    applyFilters(payload: any, queryRef: DataReferenceQuery): DataReferenceQuery;
}
