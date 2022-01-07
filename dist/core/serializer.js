"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
const lodash_1 = require("lodash");
const SEARCH_FIELD = "__search_field__";
class Serializer {
    acebase;
    emitter;
    refHooks;
    authHook;
    auth;
    links;
    searchables;
    constructor(acebaseInstance, emitteryInstance, refHook, authHook, auth, link, searchables) {
        this.acebase = acebaseInstance;
        this.emitter = emitteryInstance;
        this.refHooks = refHook;
        this.authHook = authHook;
        this.links = link;
        this.auth = auth;
        this.searchables = searchables;
    }
    async Execute(payload, server) {
        try {
            let result = {};
            if (Array.isArray(payload)) {
            }
            else {
                const operations = [
                    "save",
                    "load",
                    "query",
                    "destroy",
                    "exists",
                ];
                if (!payload?.operation ||
                    !operations.includes(payload?.operation)) {
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
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    GetHook(event, ref) {
        if (ref && typeof ref == "string" && event) {
            return this.refHooks.find((h) => h.ref == ref && h.event == event);
        }
        else if (event && !ref) {
            return this.authHook.find((a) => a.event == event);
        }
    }
    ExecuteHook(event, ref, data, req, res, user) {
        if (ref && typeof ref == "string" && event) {
            this.refHooks
                .find((h) => h.ref == ref && h.event == event)
                ?.callback(data, req, res, user);
        }
        else if (event && !ref) {
            this.authHook.find((a) => a.event == event)?.callback(data);
        }
    }
    getData(transaction) {
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
    async Destroy(transaction, server) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    }
                    catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                }
                else {
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
                return Promise.reject("Error: Commiting or deleting must not use wildcard within LenObject instance not allowed.");
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
                    if (cuid_1.default.isCuid(splitted[splitted.length - 1])) {
                        splitted.pop();
                        ref = splitted.join("/");
                    }
                }
            }
            // check cuid key
            if (!cuid_1.default.isCuid(key) && !singular) {
                return Promise.reject("Error: Invalid key for the collection. Key: " + key);
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const executeHook = hook == undefined || (hook && typeof hook == "boolean");
            const executeEmit = emit == undefined || (typeof emit == "boolean" && emit);
            const hookRef = singular ? ref : this.toWildCardPath(ref);
            const refference = singular ? ref : ref + "/" + key;
            let instance = this.acebase.ref(refference);
            let oldData = (await instance.get()).val();
            if (singular) {
                oldData = (await this.acebase.ref(ref).get()).val();
            }
            else {
                if (key && cuid_1.default.isCuid(key) && ref && typeof ref == "string") {
                    let splitted = ref.split("/");
                    const last = splitted[splitted.length - 1];
                    if (cuid_1.default.isCuid(last)) {
                        splitted[splitted.length - 1] = key;
                    }
                    else {
                        splitted.push(key);
                    }
                    const joined = splitted.join("/");
                    oldData = (await this.acebase.ref(joined).get()).val();
                }
            }
            if (executeHook)
                this.ExecuteHook("beforeDestroy", hookRef, oldData, server?.req, server?.res, user);
            await this.acebase.ref(refference).remove();
            if (executeHook)
                this.ExecuteHook("afterDestroy", hookRef, oldData, server?.req, server?.res, user);
            //! access level permission when emitting for client side
            if (executeEmit) {
                this.emitter.emit("destroy:" + hookRef, oldData);
            }
            return Promise.resolve(oldData);
        }
        catch (error) {
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
    async Load(transaction, server) {
        try {
            //! Must intercept the ref when the keys that dont belong to them
            //! when ACL implemented
            let user = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    }
                    catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                }
                else {
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
            }
            else {
                if (key && cuid_1.default.isCuid(key) && ref && typeof ref == "string") {
                    let splitted = ref.split("/");
                    const last = splitted[splitted.length - 1];
                    if (cuid_1.default.isCuid(last)) {
                        splitted[splitted.length - 1] = key;
                    }
                    else {
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
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async Save(transaction, server) {
        try {
            //! Must intercept the ref when they query keys that dont belong to them
            //! when ACL implemented
            let user = null;
            if (this.auth?.enabled) {
                let sentToken = server?.req.header("token");
                if (sentToken) {
                    try {
                        user = await this.auth.GetUser(sentToken);
                    }
                    catch (error) {
                        return Promise.reject("Error: Access Denied");
                    }
                }
                else {
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
            if (!cuid_1.default.isCuid(key) && !singular) {
                return Promise.reject("Error: Invalid key for the collection.");
            }
            const hook = eventHandles?.hook;
            const emit = eventHandles?.emit;
            const executeHook = hook == undefined || (typeof hook == "boolean" && hook);
            const executeEmit = emit == undefined || (typeof emit == "boolean" && emit);
            console.log("Execute hook: " + executeHook + "  emit: " + executeEmit);
            let data = this.getData(Object.assign({}, transaction));
            const hookRef = singular ? ref : this.toWildCardPath(ref);
            const refference = singular ? ref : ref + "/" + key;
            !singular || delete data.key;
            let instance = this.acebase.ref(refference);
            const exists = await instance.exists();
            if (exists)
                data.updated_at = new Date(Date.now());
            else
                data.created_at = new Date(Date.now());
            const event = {
                before: exists ? "beforeUpdate" : "beforeAdd",
                after: exists ? "afterUpdate" : "afterAdd",
            };
            if (executeHook) {
                this.ExecuteHook(event.before, hookRef, data, server?.req, server?.res, user);
            }
            if (SEARCH_FIELD in data) {
                delete data[SEARCH_FIELD];
            }
            this.ProcessLink(refference, key, data);
            let searchField = this.generateSearchString(data);
            if (searchField)
                data[SEARCH_FIELD] = searchField;
            await this.ProcessLink(ref, key, data);
            if (exists)
                instance.update(data);
            else
                instance.set(data);
            await this.autoIndex(hookRef, data);
            delete data[searchField];
            let returnData = (await instance.get()).val();
            if (executeHook) {
                this.ExecuteHook(event.after, hookRef, data, server?.req, server?.res, user);
            }
            //! access level permission when emitting for client side
            if (executeEmit) {
                if (exists) {
                    console.log("Emit ref from server is: " + "update:" + hookRef, data);
                    this.emitter.emit("update:" + hookRef, data);
                }
                else {
                    console.log("Emit ref from server is: " + "add:" + hookRef, data);
                    this.emitter.emit("add:" + hookRef, data);
                }
            }
            return Promise.resolve(returnData);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async Upload(req, res, uploadPath) {
        try {
            //@ts-ignore
            // await req.session.start();
            await req.multipart(async (arrbuff) => {
                try {
                    let file = arrbuff.file;
                    if (file) {
                        let tempFilename = file?.name;
                        if (typeof tempFilename == "string" &&
                            tempFilename.split("-$-").length == 2) {
                            let splitted = tempFilename.split("-$-");
                            let key = splitted[0];
                            let filename = splitted[1];
                            let ext = filename.substring(filename.lastIndexOf("."));
                            let savename = (0, cuid_1.default)();
                            ext = ext.split(" ").join("");
                            if (ext != filename)
                                savename = savename + ext;
                            savename = savename.split(" ").join("");
                            let props = {
                                key,
                                filename,
                                savename,
                            };
                            if (await this.acebase
                                .ref("__uploads__/" + key)
                                .exists()) {
                                res.json({ key, filename, url: savename });
                            }
                            await arrbuff.write(uploadPath + savename);
                            await this.acebase
                                .ref("__uploads__/" + key)
                                .set(props);
                            res.end(JSON.stringify({
                                key,
                                filename,
                                url: savename,
                            }));
                        }
                        else {
                            throw new Error("Error: Invalid File");
                        }
                    }
                    else {
                        res.sendStatus(500);
                        res.send("Error: file required");
                    }
                }
                catch (error) {
                    throw Error(error);
                }
            });
        }
        catch (error) {
            res.end(error);
            throw error;
        }
    }
    aggregatedQuery() {
    }
    generateSearchString(data) {
        if ((0, lodash_1.isObject)(data) && !(0, lodash_1.isDate)(data)) {
            let word = "";
            let values = Object.values(data);
            for (const value of values) {
                if (typeof value == "string" || typeof value == "number") {
                    word = word + value;
                }
            }
            return word;
        }
        else {
            return null;
        }
    }
    async Search(ref, word) {
        try {
            let t = (await this.acebase
                .query("__search_/" + ref)
                .filter("word", "like", "*" + word + "*")
                .get({ include: ["key"] })).map((s) => s.val().key);
            return Promise.resolve(t);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    //implement last and first query
    //delete where
    async ProcessLink(ref, key, data) {
        try {
            if (!(0, lodash_1.isObject)(data) || (0, lodash_1.isDate)(data)) {
                return Promise.resolve(null);
            }
            let wildcardRef = this.toWildCardPath(ref);
            let fromSource = this.links.filter((link) => link.source == wildcardRef);
            let fromTarget = this.links.find((link) => link.target == wildcardRef);
            if (fromSource.length) {
                //get the targets and set the update
                for (const source of fromSource) {
                    let updates = {};
                    for (const field of source.fields) {
                        const { sourceField, targetField } = field;
                        if (sourceField in data) {
                            updates[targetField] = data[sourceField];
                        }
                    }
                    const targets = await this.acebase
                        .query(source.target)
                        .filter(source.identity, "==", key)
                        .find();
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
                let source = (await this.acebase
                    .query(target.source)
                    .filter("key", "==", sourceKey)
                    .get())[0].val();
                for (const field of target.fields) {
                    const { sourceField, targetField } = field;
                    if (sourceField in source) {
                        data[targetField] = source[sourceField];
                    }
                }
                return Promise.resolve(data);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async autoIndex(path, data) {
        try {
            if ((0, lodash_1.isObject)(data)) {
                if (path.includes("/")) {
                    const dataArr = Object.entries(data);
                    for (const arr of dataArr) {
                        const field = arr[0];
                        const value = arr[1];
                        path = this.toWildCardPath(path);
                        if ((0, lodash_1.isObject)(value)) {
                            await this.autoIndex(path + "/" + field, value);
                        }
                        else if (Array.isArray(value)) {
                            this.acebase.indexes.create(path, field, {
                                type: "array",
                            });
                        }
                        else if (field == SEARCH_FIELD) {
                            this.acebase.indexes.create(path, field, {
                                type: "fulltext",
                            });
                        }
                        else {
                            this.acebase.indexes.create(path, field);
                        }
                    }
                }
                else if (SEARCH_FIELD in data) {
                    path = this.toWildCardPath(path);
                    this.acebase.indexes.create(path, SEARCH_FIELD, {
                        type: "fulltext",
                    });
                }
            }
            return Promise.resolve(true);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    toWildCardPath(ref) {
        return ref
            .split("/")
            .map((r) => {
            return cuid_1.default.isCuid(r) ? "*" : r;
        })
            .join("/");
    }
    sanitizeRefference(ref) {
        if (ref.startsWith("/")) {
            ref = ref.substring(1);
        }
        if (ref.endsWith("/"))
            ref = ref.substring(0, ref.length - 1);
        return ref;
    }
    async Query(transaction, server) {
        try {
            const { ref, hook } = transaction;
            if (ref.includes("__users__") || ref.includes("__tokens__")) {
                return Promise.reject("Error: cannot access secured refferences use  instance.User() instead.");
            }
            const executeHook = hook == undefined || (typeof hook == "boolean" && hook);
            if (executeHook) {
                this.ExecuteHook("beforeFind", ref, {}, server?.req, server?.res);
            }
            let clone = (0, lodash_1.cloneDeep)(transaction);
            let queryRef = this.acebase.query(ref);
            queryRef = this.applyFilters(clone, queryRef);
            if (clone["searchString"] && typeof clone["searchString"] == "string") {
                queryRef.filter(SEARCH_FIELD, "like", "*" + clone["searchString"] + "*");
            }
            let count = await queryRef.count();
            let data = (await queryRef.get()).map((snap) => snap.val());
            if (executeHook) {
                this.ExecuteHook("afterFind", ref, {}, server?.req, server?.res);
            }
            return { data, count };
        }
        catch (error) {
            if (error?.message.startsWith("Error: This wildcard path query on"))
                return Promise.resolve({ data: [], count: 0 });
            throw new Error(error);
        }
    }
    applyFilters(payload, queryRef) {
        //! Must intercept the filters when they query keys that dont belong to them
        //! when ACL implemented
        if (Array.isArray(payload?.filters) && payload?.filters.length) {
            payload.filters.forEach((f) => {
                queryRef.filter(f[0], f[1], f[2]);
            });
        }
        // else {
        //     queryRef.filter("key", "!=", null);
        // }
        if (Array.isArray(payload?.sorts)) {
            payload.sorts.forEach((s) => {
                if (s.length > 1)
                    queryRef.sort(s[0], s[1]);
                else
                    queryRef.sort(s[0]);
            });
        }
        queryRef.take(payload?.take || 100);
        queryRef.skip(payload?.skip || 0);
        if (payload?.page && payload?.page > 1) {
            if (payload?.take)
                queryRef.skip((payload?.page - 1) * payload?.take);
            else
                queryRef.skip((payload?.page - 1) * 100);
        }
        else {
            queryRef.skip(0);
        }
        return queryRef;
    }
}
exports.default = Serializer;
//# sourceMappingURL=serializer.js.map