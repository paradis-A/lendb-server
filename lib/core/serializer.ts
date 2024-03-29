// import Save from "./save"
import type Request from "hyper-express/types/components/http/Request";
import type Response from "hyper-express/types/components/http/Response";
import type { TemplatedApp } from "../extras/uws";
import cuid from "cuid";
import { AceBase } from "acebase";
import { iRefHook, iAuthHook, iAuthEvent, iRefEvent } from "./hook";
import type Emittery from "emittery";
import { DataReferenceQuery } from "acebase-core";
import { cloneDeep, isDate, isNumber, isObject, orderBy, unionBy, unionWith, uniq } from "lodash";
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
    protected searchables: { ref: string; fields: string }[];
    // protected Queue: { [ref: string]: Queue };
    constructor(
        acebaseInstance: AceBase,
        emitteryInstance: Emittery,
        refHook: iRefHook[],
        authHook: iAuthHook[],
        auth?: Auth,
        link?: ObjectLink[],
        publisher?: TemplatedApp
    ) {
        this.acebase = acebaseInstance;
        this.emitter = emitteryInstance;
        this.refHooks = refHook;
        this.authHook = authHook;
        this.links = link;
        this.auth = auth;
        this.publisher = publisher;
        // this.searchables = searchables;
    }

    async Execute(payload: any, server?: { req?: Request; res?: Response }): Promise<any> {
        try {
            let result = {};
            let resultArray = [];
            if (Array.isArray(payload)) {
                //run acl and schema validation here
                //cache the old value and rollback when error occurs
                for (const transaction of payload) {
                    if (!["save", "destroy"].includes(transaction?.operation)) {
                        throw new Error("Error: Invalid operation");
                    }
                    if (transaction?.operation == "save") {
                        resultArray.push(await this.Save(transaction, server));
                    } else if (transaction?.operation == "destroy") {
                        resultArray.push(await this.Destroy(transaction, server));
                    }
                }
                return resultArray;
            } else {
                const operations = ["save", "load", "query", "destroy", "exists"];
                if (!payload?.operation || !operations.includes(payload?.operation)) {
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
                    case "exists": {
                        result = await this.Exists(transaction);
                        break;
                    }
                    case "destroy": {
                        result = await this.Destroy(transaction, server);
                        break;
                    }
                    case "aggregate": {
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

    protected ExecuteHook(
        event: iAuthEvent | iRefEvent,
        ref: string,
        data: any,
        req?: Request,
        res?: Response,
        user?: Account
    ) {
        if (ref && typeof ref == "string" && event) {
            return this.refHooks.find((h) => h.ref == ref && h.event == event)?.callback(data, req, res, user);
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
        const entries = Object.entries(transaction);
        for (const entry of entries) {
            const key = entry[0];
            const value = entry[0];
            if (Array.isArray(value) && !value.length) {
                delete transaction[key];
            }
        }
        return temp;
    }

    protected async Destroy(transaction: any, server: { req?: Request; res?: Response }) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user: Account = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    } catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                } else {
                    return Promise.reject("Error: Access Denied");
                }
            }
            const { key, singular, eventHandles } = transaction;
            let ref = this.sanitizeRefference(transaction?.ref);
            //secure refs
            if (ref.includes("__users__") || ref.includes("__tokens__")) {
                return Promise.reject("Error: Cannot access secured refferences use  instance.User() instead.");
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
                return Promise.reject("Error: Invalid key for the collection. Key: " + key);
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const executeHook = hook == undefined || (hook && typeof hook == "boolean");
            const executeEmit = emit == undefined || (typeof emit == "boolean" && emit);
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
            if (executeHook) this.ExecuteHook("beforeDestroy", hookRef, oldData, server?.req, server?.res, user);
            await this.acebase.ref(refference).remove();
            if (executeHook) this.ExecuteHook("afterDestroy", hookRef, oldData, server?.req, server?.res, user);
            //! access level permission when emitting for client side
            if (executeEmit) {
                this.emitter.emit("destroy:" + hookRef, oldData);
            }

            return Promise.resolve(oldData);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    protected async Exists(transaction: any) {
        try {
            const { key, ref, singular } = transaction;
            let result = false;
            if (singular) {
                result = await this.acebase.ref(ref).exists();
            } else {
                let splitted: string[] = ref.split("/");
                if (splitted.some((s) => s.includes("*"))) {
                    return Promise.reject("Wildcards not supported on checking if refference exists");
                }
                // if(cuid.isCuid(splitted[splitted.length - 1])) return Promise.reject("")
                splitted.push(key);
                const joined = splitted.join("/");
                result = await this.acebase.ref(joined).exists();
            }
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected async Load(transaction: any, server: { req?: Request; res?: Response }) {
        try {
            //! Must intercept the ref when the keys that dont belong to them
            //! when ACL implemented
            let user: Account = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    } catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                } else {
                    return Promise.reject("Error: Access Denied");
                }
            }
            const { key, singular, eventHandles } = transaction;
            let ref = this.sanitizeRefference(transaction?.ref);
            let result = {};
            const hook = eventHandles?.hook;
            const executeHook = hook == undefined || (hook && typeof hook == "boolean");
            if (executeHook)
                this.ExecuteHook("beforeLoad", this.toWildCardPath(ref), {}, server?.req, server?.res, user);

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
                this.ExecuteHook("afterLoad", this.toWildCardPath(ref), {}, server?.req, server?.res, user);
            return Promise.resolve(result);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected async Save(transaction: any, server: { req?: Request; res?: Response }) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user: Account = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    } catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                } else {
                    return Promise.reject("Error: Access Denied");
                }
            }
            const { eventHandles, key, singular } = transaction;
            let ref = this.sanitizeRefference(transaction.ref);
            //wilcard path
            if (ref.includes("*")) {
                return Promise.reject("Error: Adding or Updating must not contain wildcard path");
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
                return Promise.reject("Error: Invalid key for the collection.");
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const queue = eventHandles?.queue;
            const executeHook = hook == undefined || (typeof hook == "boolean" && hook);
            const executeEmit = emit == undefined || (typeof emit == "boolean" && emit);
            let data: any = this.getData(Object.assign({}, transaction));
            const hookRef = singular ? ref : this.toWildCardPath(ref);
            const refference = singular ? ref : ref + "/" + key;
            !singular || delete data.key;
            let instance = this.acebase.ref(refference);
            const exists = await instance.exists();
            const event: {
                before: iAuthEvent | iRefEvent;
                after: iAuthEvent | iRefEvent;
            } = {
                before: exists ? "beforeUpdate" : "beforeAdd",
                after: exists ? "afterUpdate" : "afterAdd",
            };
            if (executeHook) {
                const hookData = await this.ExecuteHook(event.before, hookRef, data, server?.req, server?.res, user);
                if (hookData && isObject(hookData) && !isDate(hookData)) {
                    console.log(hookData);
                    Object.assign(data, hookData);
                }
            }
            if (exists) data.updated_at = new Date(Date.now());
            else data.created_at = new Date(Date.now());
            for (const entry of Object.entries(data)) {
                //@ts-ignore
                if (isDate(entry[0])) {
                    //@ts-ignore
                    data[entry[0]] = new Date(entry[1]);
                }
            }
            this.ProcessLink(refference, key, data);
            await this.ProcessLink(ref, key, data);
            if (exists) instance.update(data);
            else instance.set(data);
            if (!singular) {
                let indexes = await this.acebase.indexes.get();
                if (
                    !indexes.find((i) => {
                        return i.path == ref && key == "key";
                    })
                ) {
                    this.acebase.indexes.create(ref, "key");
                }
            }
            let returnData = (await instance.get()).val();
            if (executeHook) {
                await this.ExecuteHook(event.after, hookRef, returnData, server?.req, server?.res, user);
            }

            //! access level permission when emitting for client side
            if (executeEmit) {
                if (exists) {
                    this.emitter.emit("update:" + hookRef, returnData);
                } else {
                    this.emitter.emit("add:" + hookRef, returnData);
                }
            }
            return Promise.resolve(returnData);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async Upload(req: Request, res: Response, uploadPath: string) {
        try {
            //@ts-ignore
            // await req.session.start();
            await req.multipart(async (arrbuff) => {
                try {
                    let file = arrbuff.file;
                    if (file) {
                        let tempFilename = file?.name;
                        if (typeof tempFilename == "string" && tempFilename.split("-$-").length == 2) {
                            let splitted = tempFilename.split("-$-");
                            let key = splitted[0];
                            let filename = splitted[1];
                            let ext = filename.substring(filename.lastIndexOf("."));
                            let savename = cuid();
                            ext = ext.split(" ").join("");
                            if (ext != filename) savename = savename + ext;
                            savename = savename.split(" ").join("");
                            let props = {
                                key,
                                filename,
                                savename,
                            };
                            if (await this.acebase.ref("__uploads__/" + key).exists()) {
                                res.json({ key, filename, url: savename });
                            }
                            await arrbuff.write(uploadPath + savename);
                            await this.acebase.ref("__uploads__/" + key).set(props);
                            res.end(
                                JSON.stringify({
                                    key,
                                    filename,
                                    url: savename,
                                })
                            );
                        } else {
                            throw new Error("Error: Invalid File");
                        }
                    } else {
                        res.sendStatus(500);
                        res.send("Error: file required");
                    }
                } catch (error) {
                    throw Error(error);
                }
            });
        } catch (error) {
            res.end(error);
            throw error;
        }
    }

    // protected aggregatedQuery() {}
    protected generateSearchString(data: any) {
        if (isObject(data) && !isDate(data)) {
            let word = "";
            let values = Object.values(data);
            for (const value of values) {
                if (typeof value == "string" || typeof value == "number") {
                    word = word + value;
                }
            }
            return word;
        } else {
            return null;
        }
    }

    //implement last and first query
    //delete where

    protected async ProcessLink(ref: string, key: string, data: any) {
        try {
            if (!isObject(data) || isDate(data)) {
                return Promise.resolve(null);
            }

            let wildcardRef = this.toWildCardPath(ref);
            let fromSource = this.links.filter((link) => link.source == wildcardRef);

            let fromTarget = this.links.find((link) => link.target == wildcardRef);

            if (fromSource.length) {
                //get the targets and set the update
                for (const source of fromSource) {
                    let updates: any = {};
                    for (const field of source.fields) {
                        const { sourceField, targetField } = field;
                        if (sourceField in data) {
                            updates[targetField] = data[sourceField];
                        }
                    }
                    const targets = await this.acebase.query(source.target).filter(source.identity, "==", key).find();
                    for (const snap of targets) {
                        await snap.update(updates);
                    }
                }
            }

            if (fromTarget) {
                //get the value from source then set to target
                let target = fromTarget;
                const sourceKey = data[target.identity];
                if (!sourceKey) {
                    return Promise.reject(null);
                }
                let source = (await this.acebase.query(target.source).filter("key", "==", sourceKey).get())[0].val();
                for (const field of target.fields) {
                    const { sourceField, targetField } = field;
                    if (sourceField in source) {
                        data[targetField] = source[sourceField];
                    }
                }
                return Promise.resolve(data);
            }
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
                return Promise.reject("Error: cannot access secured refferences use  instance.User() instead.");
            }
            let clone = cloneDeep(transaction);
            let queryRef = this.acebase.query(ref);
            const executeHook = hook == undefined || (typeof hook == "boolean" && hook);
            if (executeHook) {
                const hookedQuery = this.ExecuteHook("beforeFind", ref, clone, server?.req, server?.res);
                if (hookedQuery) {
                    clone = hookedQuery;
                }
            }
            queryRef = this.applyFilters(clone, queryRef);
            const { aggregates, limit, exclusion, inclusion } = clone;
            let count = 0;
            let data: any[] = [];
            if (isObject(aggregates) && !isDate(aggregates)) {
                queryRef.take(Infinity);
                let groups = {};
                let countRefs: { [fieldGroup: string]: number } = {};
                let sumRefs: { [path: string]: number } = {};
                let undefinedRefs: {
                    [path: string]: string;
                } = {};
                //@ts-ignore
                let inclusions: string[] = [aggregates.groupBy];
                //@ts-ignore
                for (const aggregation of aggregates.list) {
                    if (!inclusions.includes(aggregation.field) && aggregation.type != "COUNT") {
                        inclusions.push(aggregation.field);
                    }
                }
                //@ts-ignore
                const groupKey = aggregates.groupBy;
                let searchedGroup: string[] = [];
                //unwind group keys
                const searchAndGroup = async (groupRes: string[]) => {
                    try {
                        let tempGroups = groupRes;
                        let groupQuery = this.applyFilters(clone, this.acebase.query(ref));
                        if (tempGroups.length) {
                            groupQuery.filter(groupKey, "!in", tempGroups);
                        }
                        groupQuery.take(Infinity);
                        await groupQuery.forEach({ include: inclusions }, async (snap) => {
                            if (Object.keys(tempGroups).length == limit) {
                                return false;
                            }
                            let value = snap.val();
                            let group = value != undefined ? value[groupKey] : null;
                            if (group != undefined && !tempGroups.includes(group)) {
                                tempGroups.push(group);
                                await searchAndGroup(tempGroups);
                                return false;
                            }
                        });
                        searchedGroup = [...tempGroups];
                        return Promise.resolve(false);
                    } catch (error) {
                        throw error;
                    }
                };
                await searchAndGroup(searchedGroup);
                for (const sg of searchedGroup) {
                    groups[sg] = {};
                }
                if (!searchedGroup.length) {
                    data = [];
                    count = 0;
                } else {
                    await queryRef.filter("type", "in", searchedGroup).forEach({ include: inclusions }, (snap) => {
                        if (Object.keys(groups).length == limit) {
                            return false;
                        }
                        let value = snap.val();
                        let group = value[groupKey];
                        //@ts-ignore
                        for (const aggregation of aggregates.list) {
                            if (!(aggregation.alias in groups[group])) {
                                if (aggregation.operation == "MIN") {
                                    groups[group][aggregation.alias] = value[aggregation.field];
                                } else if (aggregation.operation == "MAX") {
                                    groups[group][aggregation.alias] = value[aggregation.field];
                                } else if (aggregation.operation == "SUM") {
                                    groups[group][aggregation.alias] = value[aggregation.field];
                                } else if (aggregation.operation == "AVG") {
                                    if (!(`${group}.${aggregation.alias}` in undefinedRefs))
                                        undefinedRefs[`${group}.${aggregation.alias}`] = aggregation.operation;
                                    if (!(`${group}.${aggregation.alias}` in sumRefs)) {
                                        sumRefs[`${group}.${aggregation.alias}`] = value[aggregation.field];
                                    } else {
                                        sumRefs[`${group}.${aggregation.alias}`] += value[aggregation.field];
                                    }
                                } else if (aggregation.operation == "COUNT" || aggregation.operation == "AVG") {
                                    if (!(`${group}.${aggregation.alias}` in undefinedRefs))
                                        undefinedRefs[`${group}.${aggregation.alias}`] = aggregation.operation;
                                    if (!(group in countRefs)) {
                                        countRefs[group] = 1;
                                    } else {
                                        countRefs[group] += 1;
                                    }
                                }
                            } else {
                                if (aggregation.operation == "MIN") {
                                    groups[group][aggregation.alias] =
                                        groups[group][aggregation.alias] < value[aggregation.field]
                                            ? groups[group][aggregation.alias]
                                            : value[aggregation.field];
                                } else if (aggregation.operation == "MAX") {
                                    groups[group][aggregation.alias] =
                                        groups[group][aggregation.alias] > value[aggregation.field]
                                            ? groups[group][aggregation.alias]
                                            : value[aggregation.field];
                                } else if (aggregation.operation == "SUM") {
                                    groups[group][aggregation.alias] =
                                        groups[group][aggregation.alias] + value[aggregation.field];
                                } else if (aggregation.operation == "AVG") {
                                    if (!(`${group}.${aggregation.alias}` in undefinedRefs))
                                        undefinedRefs[`${group}.${aggregation.alias}`] = aggregation.operation;
                                    if (!(`${group}.${aggregation.alias}` in sumRefs)) {
                                        sumRefs[`${group}.${aggregation.alias}`] = value[aggregation.field];
                                    } else {
                                        sumRefs[`${group}.${aggregation.alias}`] += value[aggregation.field];
                                    }
                                } else if (aggregation.operation == "COUNT") {
                                    if (!(`${group}.${aggregation.alias}` in undefinedRefs))
                                        undefinedRefs[`${group}.${aggregation.alias}`] = aggregation.operation;
                                    if (!(group in countRefs)) {
                                        countRefs[group] = 1;
                                    } else {
                                        countRefs[group] += 1;
                                    }
                                }
                            }
                        }
                    });

                    for (const undefinedRef of Object.entries(undefinedRefs)) {
                        let keySplit = undefinedRef[0].split(".");
                        const group = keySplit[0];
                        const alias = keySplit[1];
                        const op = undefinedRef[1];
                        let count = countRefs[group];
                        let avg = sumRefs[undefinedRef[0]] / count;
                        if (count == undefined) {
                            //throw error
                        }
                        if (typeof avg != "number" || avg == NaN) {
                            //throw error
                        }

                        if (!groups[group]) groups[group] = {};
                        if (op == "AVG") groups[group][alias] = avg;
                        if (op == "COUNT") groups[group][alias] = count;
                    }
                    count = Object.entries(groups).length;
                    data = Object.entries(groups).map((g) => {
                        //@ts-ignore
                        return { [groupKey]: g[0], ...g[1] };
                    });
                }
            } else {
                if(transaction?.compoundFilter?.length){
                    let compoundResult = await this.compound(transaction)
                    data = compoundResult.data
                    count = compoundResult.count
                }else{
                    if ((Array.isArray(exclusion) && exclusion.length) || (Array.isArray(inclusion) && inclusion.length)) {
                        if (exclusion?.length && inclusion?.length) {
                            data = (
                                await queryRef.get({
                                    exclude: exclusion,
                                    include: inclusion,
                                })
                            ).map((snap) => snap.val());
                        } else if (exclusion?.length) {
                            data = (await queryRef.get({ exclude: exclusion })).map((snap) => snap.val());
                        } else if (inclusion?.length) {
                            data = (await queryRef.get({ include: inclusion })).map((snap) => snap.val());
                        }
                    } else {
                        data = (await queryRef.get()).map((snap) => snap.val());
                    }
                    queryRef.take(Infinity);
                    count = await queryRef.count();
                }
            }
            //! todo return decorated data
            if (executeHook) {
                const afterHookData = this.ExecuteHook("afterFind", ref, { data, count }, server?.req, server?.res);
                if (Array.isArray(afterHookData?.data) && isNumber(afterHookData?.count)) {
                    return {
                        data: afterHookData.data,
                        count: afterHookData.count,
                    };
                }
            }
            return { data, count };
        } catch (error) {
            if (error?.message.startsWith("Error: This wildcard path query on"))
                return Promise.resolve({ data: [], count: 0 });
            throw new Error(error);
        }
    }

    async compound(transaction) {
        try {
            let queryResults = [];
            let keys = []
            let count = 0;
            for (const filter of transaction.compoundFilter) {
                let tempQuery = this.acebase.query(transaction.ref);
                tempQuery = this.applyFilters(transaction, tempQuery);
                let resultkeys = queryResults.map(qr=>qr.key)
                if(queryResults.length && resultkeys.length ){
                    tempQuery.filter("key","!in",resultkeys)
                }
                tempQuery.filter(filter[0], filter[1], filter[2]);
                keys = uniq([...keys, ...(await tempQuery.find()).map(dr=>dr.key)]) 
                count += await tempQuery.take(Infinity).count()
            }
            const { exclusion, inclusion } = transaction;
            if ((Array.isArray(exclusion) && exclusion.length) || (Array.isArray(inclusion) && inclusion.length)) {
                if (exclusion?.length && inclusion?.length) {
                    queryResults = (await Promise.all(keys.map(key=>{
                        return this.acebase.ref(transaction.ref + "/" + key).get({ include: inclusion,exclude: exclusion })
                    }))).map(ds=>ds.val())
                } else if (exclusion?.length) {
                    queryResults = (await Promise.all(keys.map(key=>{
                        return this.acebase.ref(transaction.ref + "/" + key).get({ exclude: exclusion })
                    }))).map(ds=>ds.val())
                } else if (inclusion?.length) {
                    queryResults = (await Promise.all(keys.map(key=>{
                        return this.acebase.ref(transaction.ref + "/" + key).get({include: inclusion })
                    }))).map(ds=>ds.val())
                }
            } else {
                queryResults = (await Promise.all(keys.map(key=>{
                    return this.acebase.ref(transaction.ref + "/" + key).get()
                }))).map(ds=>ds.val())
            }
            if (transaction?.sorts?.length) {
                const sortingKeys = transaction.sorts.map((t) => t[0]);
                const sortingValues = transaction.sorts.map((t) => (t[1] ? "asc" : "desc"));
                queryResults = orderBy(queryResults, sortingKeys, sortingValues);
            } else {
                queryResults = orderBy(queryResults, ["rev_ticks", "asc"]);
            }
            queryResults =  queryResults.slice(0,transaction?.limit)
            return Promise.resolve({ data: queryResults, count });
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async LivePayload(
        transaction: {
            skip: number;
            limit: number;
            page: number;
            exclusion: string[];
            inclusion: string[];
            sort: any[];
            filters: any[];
            ref: string;
        },
        eventEmitted: RealtimeQueryEvent
    ) {
        try {
            let index = -1;
            let count = 0;
            let data: any[] = [];
            let newData: any = {};
            //@ts-ignore
            delete transaction.subscriptionKey;
            //@ts-ignore
            transaction.live = false;
            let res = await this.Query(transaction, null);
            if (eventEmitted?.snapshot) {
                if (Object.keys(eventEmitted.snapshot.val()).length == 1) {
                    newData = (await eventEmitted.snapshot.ref.get()).val();
                } else newData = eventEmitted.snapshot.val();
            } else {
                newData = (await eventEmitted.ref.get()).val();
            }
            index = res.data.findIndex((v) => v == newData.key);
            data = res.data;
            count = res.count;
            return { newData, count, index, data };
        } catch (error) {
            return Promise.reject(error);
        }
    }

    applyFilters(payload: any, queryRef: DataReferenceQuery) {
        //! Must intercept the filters when they query keys that dont belong to them
        //! when ACL implemented
        if (Array.isArray(payload?.filters) && payload?.filters.length) {
            payload.filters.forEach((f) => {
                queryRef.filter(f[0], f[1], f[2]);
            });
        }
        if (Array.isArray(payload?.sorts)) {
            payload.sorts.forEach((s) => {
                if (s.length > 1) queryRef.sort(s[0], s[1]);
                else queryRef.sort(s[0]);
            });
        }
        queryRef.take(payload?.limit || 100);
        queryRef.skip(payload?.skip || 0);
        if (payload?.page && payload?.page > 1) {
            if (payload?.take) queryRef.skip((payload?.page - 1) * payload?.limit);
            else queryRef.skip((payload?.page - 1) * 100);
        } else {
            queryRef.skip(0);
        }
        return queryRef;
    }
}
