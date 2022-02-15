"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LenDB = void 0;
const hyper_express_1 = __importDefault(require("hyper-express"));
const acebase_1 = require("acebase");
const core_1 = require("./core");
// import Figlet from "figlet";
const emittery_1 = __importDefault(require("emittery"));
const live_directory_1 = __importDefault(require("live-directory"));
const graceful_fs_1 = __importDefault(require("graceful-fs"));
const cuid_1 = __importDefault(require("cuid"));
const pwaitfor_1 = __importDefault(require("./extras/pwaitfor"));
class LenDB {
    constructor(appname, settings, serverOptions) {
        this.links = [];
        this._uploadPath = "./uploads";
        this.AccessControlList = [];
        this.liveQueryRefferences = [];
        this.Server = new hyper_express_1.default.Server({ max_body_length: 100000000 });
        this.acebase = new acebase_1.AceBase(appname, settings);
        this.auth = new core_1.Auth(this.acebase);
        this.emitter = new emittery_1.default();
        this.hook = new core_1.Hook();
        if (serverOptions?.uploadPath)
            this._uploadPath = serverOptions?.uploadPath;
        if (!graceful_fs_1.default.existsSync(this._uploadPath)) {
            //@ts-ignore
            graceful_fs_1.default.mkdirSync(this._uploadPath, { recursive: true });
        }
        this.LiveAsset = new live_directory_1.default({
            path: this._uploadPath,
            // keep: {
            //     extensions: [".png", ".jpg", ".jpeg"], // We only want to serve files with these extensions
            // },
            ignore: (path) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });
    }
    Query(ref) {
        return new core_1.LenQuery(ref, this.emitter, this.Serializer);
    }
    Object(ref, singularOrKey = false) {
        return new core_1.LenObject(ref, singularOrKey, this.Serializer);
    }
    ACL(options) {
        this.AccessControlList.push(options);
    }
    ObjectLink(settings) {
        this.links.push(settings);
    }
    initialize() {
        this.Server.post("/lenDB", async (req, res) => {
            try {
                res.setHeader("Access-Control-Allow-Origin", req.header("origin"));
                res.setHeader("Access-Control-Allow-Credentials", "true");
                res.setHeader("Vary", "origin");
                const payload = await req.json();
                let result = await this.Serializer.Execute(payload, {
                    req,
                    res,
                });
                res.json(result);
            }
            catch (error) {
                console.log(error);
                res.status(500);
                res.end("Error here");
            }
        });
        this.Server.ws("/lenDB", async (ws) => {
            try {
                let subscriptionKey = null;
                let transaction;
                let queryRef;
                ws.on("message", async (payloadData) => {
                    const payload = JSON.parse(payloadData);
                    //! todo synchronize in short time period
                    if (cuid_1.default.isCuid(payload?.subscriptionKey)) {
                        subscriptionKey = payload?.subscriptionKey;
                        if (queryRef) {
                            queryRef.off();
                        }
                        await (0, pwaitfor_1.default)(() => {
                            return (this.liveQueryRefferences.find((lqr) => lqr.subscriptionKey == subscriptionKey) != undefined);
                        });
                        let liveQueryRefference = this.liveQueryRefferences.find((lqr) => lqr.subscriptionKey == subscriptionKey);
                        if (liveQueryRefference != null ||
                            liveQueryRefference != undefined)
                            transaction = liveQueryRefference.transaction;
                        queryRef = this.Serializer.applyFilters(transaction, this.acebase.query(transaction.ref));
                        if (cuid_1.default.isCuid(subscriptionKey) && transaction) {
                            queryRef.on("add", async (realtimeQueryEvent) => {
                                console.log("add event emitted!!!");
                                const { data, index, count } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                                ws.send(JSON.stringify({
                                    type: "add",
                                    data,
                                    index,
                                    count,
                                }));
                            });
                            queryRef.on("change", async (realtimeQueryEvent) => {
                                const { data, index, count } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                                ws.send(JSON.stringify({
                                    type: "update",
                                    data,
                                    index,
                                    count,
                                }));
                            });
                            queryRef.on("remove", async (realtimeQueryEvent) => {
                                const { data, index, count } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                                const newData = (await queryRef.get()).map((v) => v.val());
                                ws.send(JSON.stringify({
                                    type: "destroy",
                                    data,
                                    index,
                                    count,
                                    newData,
                                }));
                            });
                            await queryRef.get({ include: ["key"] });
                        }
                    }
                    if (payload?.ping) {
                    }
                });
                //! todo close the connection when it does not ping for certain time
                ws.on("close", (code) => {
                    if (code == 1000 && subscriptionKey) {
                        ws.off("add:" + subscriptionKey, () => { });
                        ws.off("update:" + subscriptionKey, () => { });
                        ws.off("destroy:" + subscriptionKey, () => { });
                        ws.close();
                        if (queryRef) {
                            queryRef.off();
                        }
                    }
                });
            }
            catch (error) {
                console.log(error);
            }
        });
        this.Server.post("/ping", async (req, res) => {
            res.json({ pong: true });
        });
        this.Server.post("/lenDB_Auth", async (req, res) => {
            //the server must respond with client when taking request that will match the token
            //suggestion: put client key on the end of the token
            try {
                res.setHeader("Access-Control-Allow-Origin", req.header("origin"));
                res.setHeader("Access-Control-Allow-Credentials", "true");
                res.setHeader("Vary", "origin");
                const payload = await req.json();
                if (payload) {
                    if (payload.type) {
                        if (payload.type == "register") {
                            delete payload.type;
                            let result = await this.auth.Register(payload);
                            res.cookie("lenDB_token", result.token, result.expiration * 3.6e6, {
                                httpOnly: true,
                            });
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        }
                        else if (payload.type == "login") {
                            let result = await this.auth.Login(payload.username, payload.password);
                            res.cookie("lenDB_token", result.token, result.expiration * 3.6e6, {
                                httpOnly: true,
                            });
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        }
                        else if (payload.type == "logout") {
                            if ("lenDB_token" in req?.cookies) {
                                await this.auth.Logout(req.cookies["lenDB_token"]);
                            }
                            res.removeCookie("lenDB_token");
                            res.json({ message: "Logged out succesfully" });
                        }
                        else if (payload.type == "authenticate") {
                            let token = req.cookies["lenDB_token"];
                            console.log(token);
                            if (token) {
                                let result = await this.auth.Authenticate(token);
                                res.cookie("lenDB_token", result.token, result.expiration * 3.6e6, {
                                    httpOnly: true,
                                });
                                const { client_key, data } = result;
                                res.json({ client_key, data });
                            }
                            else {
                                res.json({});
                            }
                        }
                        else if (payload.type == "update") {
                        }
                    }
                    else {
                        res.status(500);
                        res.send("Require valid payload");
                    }
                }
                else {
                    res.status(500);
                    res.send("Require valid payload");
                }
            }
            catch (error) {
                console.log("the error is:" + error);
                res.status(500);
                res.end(error?.toString());
            }
        });
        this.Server.get("/uploads/*", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            const path = req.path.replace("/uploads", "");
            const file = this.LiveAsset.get(path);
            //@ts-ignore
            if (file === undefined)
                return res.status(404).send();
            return res.type(file.extension).send(file.buffer);
        });
        this.Server.get("/lenDB_upload/:key", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            try {
                //@ts-ignore
                let key = req.path_parameters.key;
                let file = this.acebase.ref("__uploads__" + key);
                const exists = await file.exists();
                if (!exists) {
                    res.json({ key, filename: null, url: null });
                }
                else {
                    res.json((await file.get()).val());
                }
            }
            catch (error) {
                res.end(error);
            }
        });
        this.Server.post("/lenDB_upload", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            await this.Serializer.Upload(req, res, this._uploadPath);
        });
        this.Server.ws("/lenDB_live", (ws) => {
            let unsubscriber = null;
            ws.on("message", (data) => {
                // if (unsubscriber) {
                //     unsubscriber();
                // }
                unsubscriber = null;
                const query = JSON.parse(data);
                if (!("filters" in query) ||
                    !("sorts" in query) ||
                    !("ref" in query) ||
                    !("page" in query) ||
                    !("limit" in query) ||
                    !("skip" in query)) {
                    ws.close(500, JSON.stringify({ error: "Invalid Data" }));
                }
                let queryRef = this.acebase.query(query.ref);
                this.Serializer.applyFilters(query, queryRef);
                queryRef
                    .on("add", (snap) => {
                    const res = { type: "add", data: snap.snapshot.val() };
                    ws.send(JSON.stringify(res));
                })
                    .on("change", (snap) => {
                    const res = {
                        type: "update",
                        data: snap.snapshot.val(),
                    };
                    ws.send(JSON.stringify(res));
                })
                    .on("remove", (snap) => {
                    const res = {
                        type: "destroy",
                        data: snap.snapshot.val(),
                    };
                    ws.send(JSON.stringify(res));
                })
                    .get()
                    .then((snap) => {
                    const res = {
                        type: "initial",
                        data: snap.map((s) => s.val()),
                    };
                    ws.send(JSON.stringify(res));
                });
                unsubscriber = () => {
                    queryRef.off("add");
                    queryRef.off("changed");
                    queryRef.off("remove");
                };
            });
            ws.on("close", (code) => {
                console.log("a connection has been closed");
                if (code == 1000 && unsubscriber) {
                    unsubscriber();
                }
            });
        });
    }
    async start(port = 5757, host = "localhost") {
        try {
            this.initialize();
            await this.acebase.ready();
            this.acebase.indexes.create("__uploads__", "key");
            this.Serializer = new core_1.Serializer(this.acebase, this.emitter, this.hook.refHooks, this.hook.authHooks, null, this.links, this.Server.uws_instance);
            let status = await this.Server.listen(port, host);
            console.log(`Server is running at ${host}:${port}`);
            this.emitter.on("setLiveQueryRefference", (query) => {
                this.liveQueryRefferences.push(query);
            });
            return Promise.resolve(status);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}
exports.LenDB = LenDB;
exports.default = LenDB;
//# sourceMappingURL=index.js.map