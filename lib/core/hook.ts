import Request from "hyper-express/types/components/http/Request";
import Response from "hyper-express/types/components/http/Response";
export let Authhooks: iAuthHook[] = [];
export let RefHooks: iRefHook[] = [];
import iLenQueryFilter from "extras/queryfilter";
import {Account} from "./auth"
export default class Hook {
    protected _refhooks: iRefHook[] = [];
    protected _authHooks: iAuthHook[] = [];
    protected addOrReplaceRefHook(hook?: iRefHook) {
        const { ref: table, event } = hook;
        const el = this._refhooks.findIndex(
            (h) => h.ref == table && h.event == event
        );
        if (el == -1) {
            this._refhooks.push(hook);
        } else {
            this.refHooks[el] = hook;
        }
    }
    
    protected addOrReplaceAuthHook(hook?: iAuthHook) {

    }
    
    beforeAdd(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeAdd" });
    }

    afterAdd(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterAdd" });
    }

    beforeUpdate(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeUpdate" });
    }

    afterUpdate(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterUpdate" });
    }

    beforeDestroy(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({
            ref: ref,
            callback,
            event: "beforeDestroy",
        });
    }
    
    afterDestroy(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterDestroy" });
    }

    beforeFind(ref: string, callback: (query: iLenQueryFilter) => any) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeFind" });
    }

    afterFind(ref: string, callback: (data: any[]) => any) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterFind" });
    }

    liveAdd(ref:string, callback: (data:any)=> any ){
        this.addOrReplaceRefHook({ref,callback,event: "liveAdd"})
    }

    liveUpdate(ref:string, callback: (data:any)=> any ){
        this.addOrReplaceRefHook({ref,callback,event: "liveUpdate"})
    }

    liveDestroy(ref:string, callback: (data:any)=> any ){
        this.addOrReplaceRefHook({ref,callback,event: "liveDestroy"})
    }
    
    beforeLoad(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeLoad" });
    }

    afterLoad(
        ref: string,
        callback: (data: any, req?: Request, res?: Response) => any
    ) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterLoad" });
    }

    beforeLogin(
        callback: (usernameOrEmail: string, password: string) => void
    ) {}

    //todo Auth Hooks

    afterLogin(callback: (userdetails: any) => void) {}

    beforeTokenLogin(callback: (token: string) => void) {}

    afterTokenLogin(callback: (data: any) => void) {}

    beforeRegister(callback: (data: any) => void) {}

    afterRegister(callback: (data: any) => void) {}

    get refHooks() {
        return this._refhooks;
    }

    get authHooks() {
        return this._authHooks;
    }
}

export function RegisterHook(hook: (hook: Hook) => void) {
    let temp = new Hook();
    hook(temp);
    RefHooks = temp.refHooks;
    Authhooks = temp.authHooks;
}

export type iRefEvent =
    | "beforeAdd"
    | "afterAdd"
    | "liveAdd"
    | "liveDestroy"
    | "liveUpdate"
    | "beforeUpdate"
    | "afterUpdate"
    | "beforeDestroy"
    | "afterDestroy"
    | "beforeFind"
    | "afterFind"
    | "beforeLoad"
    | "afterLoad";

export interface iRefHook {
    event: iRefEvent;
    ref: string;
    callback: (e: any, req: Request, res: Response, user: Account) => any;
}

export type iAuthEvent =
    | "beforeLogin"
    | "afterLogin"
    | "beforeTokenLogin"
    | "afterTokenLogin"
    | "beforeRegister"
    | "afterRegister";

export interface iAuthHook {
    event: iAuthEvent;
    callback: (e: any) => void;
}


