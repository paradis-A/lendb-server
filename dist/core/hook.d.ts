import type LenQuery from "./query";
import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
export declare let Authhooks: iAuthHook[];
export declare let RefHooks: iRefHook[];
import { Account } from "./auth";
export default class Hook {
    protected _refhooks: iRefHook[];
    protected _authHooks: iAuthHook[];
    protected addOrReplaceRefHook(hook?: iRefHook): void;
    protected addOrReplaceAuthHook(hook?: iAuthHook): void;
    beforeAdd(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    afterAdd(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    beforeUpdate(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    afterUpdate(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    beforeDestroy(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    afterDestroy(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    beforeFind(ref: string, callback: (query: LenQuery) => any): void;
    afterFind(ref: string, callback: (data: any) => any): void;
    befereLoad(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    afterLoad(ref: string, callback: (data: any, req?: Request, res?: Response) => any): void;
    beforeLogin(callback: (usernameOrEmail: string, password: string) => void): void;
    afterLogin(callback: (userdetails: any) => void): void;
    beforeTokenLogin(callback: (token: string) => void): void;
    afterTokenLogin(callback: (data: any) => void): void;
    beforeRegister(callback: (data: any) => void): void;
    afterRegister(callback: (data: any) => void): void;
    get refHooks(): iRefHook[];
    get authHooks(): iAuthHook[];
}
export declare function RegisterHook(hook: (hook: Hook) => void): void;
export declare type iRefEvent = "beforeAdd" | "afterAdd" | "beforeUpdate" | "afterUpdate" | "beforeDestroy" | "afterDestroy" | "beforeFind" | "afterFind" | "beforeLoad" | "afterLoad";
export interface iRefHook {
    event: iRefEvent;
    ref: string;
    callback: (e: any, req: Request, res: Response, user: Account) => any;
}
export declare type iAuthEvent = "beforeLogin" | "afterLogin" | "beforeTokenLogin" | "afterTokenLogin" | "beforeRegister" | "afterRegister";
export interface iAuthHook {
    event: iAuthEvent;
    callback: (e: any) => void;
}
