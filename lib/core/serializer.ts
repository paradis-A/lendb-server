// import Save from "./save"
import type Request from "hyper-express/types/components/http/Request";
import type Response from "hyper-express/types/components/http/Request";
import cuid from "cuid";
import { AceBase } from "acebase";
import { iRefHook, iAuthHook, iAuthEvent, iRefEvent } from "./hook";
import type Emittery from "emittery";
import { DataReferenceQuery } from "acebase-core";
import { cloneDeep, isObject } from "lodash";
import Auth, {Account} from "./auth";
export default class Serializer {
    protected acebase: AceBase;
    protected emitter: Emittery;
    protected refHooks: iRefHook[];
    protected authHook: iAuthHook[];
    protected auth: Auth 
    constructor(
        acebaseInstance: AceBase,
        emitteryInstance: Emittery,
        refHook: iRefHook[],
        authHook: iAuthHook[],
        auth?: Auth
    ) {
        this.acebase = acebaseInstance;
        this.emitter = emitteryInstance;
        this.refHooks = refHook;
        this.authHook = authHook;
        this.auth = auth
    }

    async Execute(
        payload: any,
        server?: { req?: Request; res?: Response }
    ): Promise<any> {
        try {
            let result = {};
            if (Array.isArray(payload)) {
            } else {
                const operations = [
                    "save",
                    "load",
                    "query",
                    "destroy",
                    "exists",
                ];
                if (
                    !payload?.operation ||
                    !operations.includes(payload?.operation)
                ) {
                    return Promise.reject("Error: Invalid operation.");
                }
                let transaction = payload;
                switch (transaction?.operation) {
                    case "save": {
                        result = await this.Save(transaction, server);
                        break;
                    }
                    case "query": {
                        result = await this.Query(transaction, server);
                        break;
                    }
                    case "load": {
                        result = await this.Load(transaction, server);
                        break;
                    }
                    case "destroy": {
                        result = await this.Destroy(transaction, server);
                        break;
                    }
                    default:
                        break;
                }
            }
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected GetHook(event: iAuthEvent | iRefEvent, ref?: string) {
        if (ref && typeof ref == "string" && event) {
            return this.refHooks.find((h) => h.ref == ref && h.event == event);
        } else if (event && !ref) {
            return this.authHook.find((a) => a.event == event);
        }
    }

    protected ExecuteHook(
        event: iAuthEvent | iRefEvent,
        ref: string,
        data: any,
        req?: Request,
        res?: Response,
        user?: Account
    ): any {
        if (ref && typeof ref == "string" && event) {
            return this.refHooks
                .find((h) => h.ref == ref && h.event == event)
                ?.callback(data, req, res,user);
        } else if (event && !ref) {
            this.authHook.find((a) => a.event == event)?.callback(data);
        }
    }

    protected getData(transaction: any) {
        let temp = transaction;
        delete temp.operation;
        delete temp._page;
        delete temp.created_at;
        delete temp.updated_at;
        delete temp.created_by;
        delete temp.updated_by;
        delete temp.ref;
        delete temp.singular;
        delete temp.hook;
        delete temp.rawData;
        delete temp.emit;
        delete temp.eventHandles;
        delete temp.childPropsNames;
        return temp;
    }

    protected async Destroy(
        transaction: any,
        server: { req?: Request; res?: Response }
    ) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user: Account = null
            if(this.auth?.enabled){
                let sentToken = server?.req.header("token")
                if(sentToken){
                    try {
                         user = await this.auth.GetUser(sentToken)
                    } catch (error) {
                        return Promise.reject("Error: Access Denied")
                    }
                }else{
                    return Promise.reject("Error: Access Denied")
                }
            }
            const { key, singular, eventHandles } = transaction;
            let ref = this.sanitizeRefference(transaction?.ref);
            //secure refs
            if(ref.includes("__users__") || ref.includes( "__tokens__")){
                return Promise.reject("Error: Cannot access secured refferences use  instance.User() instead.")
            }
            //wilcard path
            if (ref.includes("*")) {
                return Promise.reject(
                    "Error: Commiting or deleting must not use wildcard within LenObject instance not allowed."
                );
            }
            //check if path have cuid
            // if (singular) {
            //     const splitted = ref.split("/");
            //     if (splitted.some((r) => cuid.isCuid(r))) {
            //         return Promise.reject(
            //             "Error: Cannot save singular object reffered from a collection with cuid."
            //         );
            //     }
            // }
            // if(!singular){
            //     const splitted = ref.split("/")
            //     if(splitted.length > 1){
            //         if(cuid.isCuid(splitted[splitted.length - 1])){
            //             splitted.pop()
            //             ref = splitted.join("/")
            //         }
            //     }
            // }
            if (!singular) {
                const splitted = ref.split("/");
                if (splitted.length > 1) {
                    if (cuid.isCuid(splitted[splitted.length - 1])) {
                        splitted.pop();
                        ref = splitted.join("/");
                    }
                }
            }
            // check cuid key
            if (!cuid.isCuid(key) && !singular) {
                return Promise.reject(
                    "Error: Invalid key for the collection. Key: " + key
                );
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const executeHook =
                hook == undefined || (hook && typeof hook == "boolean");
            const executeEmit =
                emit == undefined || (typeof emit == "boolean" && emit);
            const hookRef = singular ? ref : this.toWildCardPath(ref);
            const refference = singular ? ref : ref + "/" + key;
            let instance = this.acebase.ref(refference);
            let oldData: any = (await instance.get()).val();
            if (singular) {
                oldData = (await this.acebase.ref(ref).get()).val();
            } else {
                if (key && cuid.isCuid(key) && ref && typeof ref == "string") {
                    let splitted = ref.split("/");
                    const last = splitted[splitted.length - 1];
                    if (cuid.isCuid(last)) {
                        splitted[splitted.length - 1] = key;
                    } else {
                        splitted.push(key);
                    }
                    const joined = splitted.join("/");
                    oldData = (await this.acebase.ref(joined).get()).val();
                }
            }
            if (executeHook)
                this.ExecuteHook(
                    "beforeDestroy",
                    hookRef,
                    oldData,
                    server?.req,
                    server?.res,
                    user
                );
            await this.acebase.ref(refference).remove();
            if (executeHook)
                this.ExecuteHook(
                    "afterDestroy",
                    hookRef,
                    oldData,
                    server?.req,
                    server?.res,
                    user
                );
            //! access level permission when emitting for client side
            this.emitter.emit("destroy:", oldData)
            return Promise.resolve(oldData);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    // protected async Exists(transaction: any) {
    //     try {
    //         const { key, ref, singular } = transaction;
    //         let result = false;

    //         if (singular) {
    //             result = await this.acebase.ref(ref).exists();
    //         } else {
    //             let splitted = ref.split("/");
    //             const last = splitted[splitted.length - 1];
    //             if (cuid.isCuid(last)) {
    //                 splitted[splitted.length - 1] = key;
    //             } else {
    //                 splitted.push(key);
    //             }
    //             const joined = splitted.join("/");
    //             console.log(joined);
    //             result = await this.acebase.ref(joined).exists();
    //         }
    //     } catch (error) {}
    // }

    protected async Load(
        transaction: any,
        server: { req?: Request; res?: Response }
    ) {
        try {
            //! Must intercept the ref when the keys that dont belong to them
            //! when ACL implemented
            let user: Account = null
            if(this.auth?.enabled){
                let sentToken = server?.req.header("token")
                if(sentToken){
                    try {
                         user = await this.auth.GetUser(sentToken)
                    } catch (error) {
                        return Promise.reject("Error: Access Denied")
                    }
                }else{
                    return Promise.reject("Error: Access Denied")
                }
            }
            const { key, singular, eventHandles } = transaction;
            let ref = this.sanitizeRefference(transaction?.ref);
            let result = {};
            const hook = eventHandles?.hook;
            const executeHook =
                hook == undefined || (hook && typeof hook == "boolean");

            if (executeHook)
                this.ExecuteHook(
                    "beforeLoad",
                    this.toWildCardPath(ref),
                    {},
                    server?.req,
                    server?.res,
                    user
                );

            if (singular) {
                result = (await this.acebase.ref(ref).get()).val();
            } else {
                if (key && cuid.isCuid(key) && ref && typeof ref == "string") {
                    let splitted = ref.split("/");
                    const last = splitted[splitted.length - 1];
                    if (cuid.isCuid(last)) {
                        splitted[splitted.length - 1] = key;
                    } else {
                        splitted.push(key);
                    }
                    const joined = splitted.join("/");
                    console.log(joined);
                    result = (await this.acebase.ref(joined).get()).val();
                }
            }

            if (executeHook)
            this.ExecuteHook(
                "afterLoad",
                this.toWildCardPath(ref),
                {},
                server?.req,
                server?.res,
                user
            );
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected async Save(
        transaction: any,
        server: { req?: Request; res?: Response }
    ) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user: Account = null
            if(this.auth?.enabled){
                let sentToken = server?.req.header("token")
                if(sentToken){
                    try {
                         user = await this.auth.GetUser(sentToken)
                    } catch (error) {
                        return Promise.reject("Error: Access Denied")
                    }
                }else{
                    return Promise.reject("Error: Access Denied")
                }
            }
            const { eventHandles, key, singular } = transaction;
            let ref = this.sanitizeRefference(transaction.ref);
            //wilcard path
            if (ref.includes("*")) {
                return Promise.reject(
                    "Error: Adding or Updating must not contain wildcard path"
                );
            }
            //check if path have cuid
            // if (singular) {
            //     const splitted = ref.split("/");
            //     if (splitted.some((r) => cuid.isCuid(r))) {
            //         return Promise.reject(
            //             "Error: Cannot save singular object reffered from a collection with cuid."
            //         );
            //     }
            // }
            //cuid key check
            if (!cuid.isCuid(key) && !singular) {
                return Promise.reject(
                    "Error: Invalid key for the collection."
                );
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const executeHook =
                hook == undefined || (typeof hook == "boolean" && hook);
            const executeEmit =
                emit == undefined || (typeof emit == "boolean" && emit);
            let data = this.getData(Object.assign({}, transaction));
            const hookRef = singular ? ref : this.toWildCardPath(ref);
            const refference = singular ? ref : ref + "/" + key;
            !singular || delete data.key;
            let instance = this.acebase.ref(refference);
            const exists = await instance.exists();
            if (exists) data.updated_at = new Date(Date.now());
            else data.created_at = new Date(Date.now());
            const event: {
                before: iAuthEvent | iRefEvent;
                after: iAuthEvent | iRefEvent;
            } = {
                before: exists ? "beforeUpdate" : "beforeAdd",
                after: exists ? "afterUpdate" : "afterAdd",
            };
            if (executeHook) {
                data =  this.ExecuteHook(
                    event.before,
                    hookRef,
                    data,
                    server?.req,
                    server?.res,
                    user
                );
            }
            if (singular) instance.update(data);
            else instance.set(data);
            await this.autoIndex(hookRef, data);
            let returnData = (await instance.get()).val();
            if (executeHook) {
                this.ExecuteHook(
                    event.after,
                    hookRef,
                    data,
                    server?.req,
                    server?.res,
                    user
                );
            }
             //! access level permission when emitting for client side
            if (executeEmit) {
                console.log("_____________Executing emits!__________")
                if(exists){
                    console.log("Emit ref from server is: " + "update:" + hookRef, data)
                    this.emitter.emit("update:" + hookRef, data)
                }else{
                    console.log("Emit ref from server is: " + "add:" + hookRef, data)
                    this.emitter.emit("add:" + hookRef, data)
                }
            }
            return Promise.resolve(returnData);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected async autoIndex(path: string, data: any) {
        try {
            if (isObject(data)) {
                const dataArr = Object.entries(data);
                for (const arr of dataArr) {
                    const field = arr[0];
                    const value = arr[1];
                    path = this.toWildCardPath(path);
                    if (isObject(value)) {
                        await this.autoIndex(path + "/" + field, value);
                    } else if (Array.isArray(value)) {
                        this.acebase.indexes.create(path, field, {
                            type: "array",
                        });
                    } else {
                        this.acebase.indexes.create(path, field);
                    }
                }
            }
            return Promise.resolve(true);
        } catch (error) {
            return Promise.reject(error);
        }
    }


    protected toWildCardPath(ref: string) {
        return ref
            .split("/")
            .map((r) => {
                return cuid.isCuid(r) ? "*" : r;
            })
            .join("/");
    }

    protected sanitizeRefference(ref: string) {
        if (ref.startsWith("/")) {
            ref = ref.substring(1);
        }
        if (ref.endsWith("/")) ref = ref.substring(0, ref.length - 1);
        return ref;
    }

    protected async Query(
        transaction: any,
        server: { req?: Request; res?: Response }
    ): Promise<{ data: any[]; count: number }> {
        try {
            const { ref, hook } = transaction;
            if (ref.includes("__users__") || ref.includes("__tokens__")) {
                return Promise.reject(
                    "Error: cannot access secured refferences use  instance.User() instead."
                );
            }
            const executeHook =
                hook == undefined || (typeof hook == "boolean" && hook);
            if (executeHook) {
                this.ExecuteHook("beforeFind", ref, server?.req, server?.res);
            }
            let clone = cloneDeep(transaction);
            let queryRef = this.acebase.query(ref);
            queryRef = this.applyFilters(clone, queryRef);
            let count = await queryRef.count();
            let data = (await queryRef.get()).map((snap) => snap.val());
            if (executeHook) {
                this.ExecuteHook("afterFind", ref, server?.req, server?.res);
            }
            return { data, count };
        } catch (error) {
            if (error?.message.startsWith("Error: This wildcard path query on"))
                return Promise.resolve({ data: [], count: 0 });
            throw new Error(error);
        }
    }

    protected applyFilters(payload: any, queryRef: DataReferenceQuery) {
        //! Must intercept the filters when they query keys that dont belong to them
        //! when ACL implemented
        if (Array.isArray(payload?.filters) && payload?.filters.length) {
            payload.filters.forEach((f) => {
                queryRef.filter(f[0], f[1], f[2]);
            });
        } else {
            queryRef.filter("key", "!=", null);
        }
        if (Array.isArray(payload?.sorts)) {
            payload.sorts.forEach((s) => {
                if (s.length > 1) queryRef.sort(s[0], s[1]);
                else queryRef.sort(s[0]);
            });
        }
        queryRef.take(payload?.take || 100);
        queryRef.skip(payload?.skip || payload?.page || 0);
        return queryRef;
    }
}
