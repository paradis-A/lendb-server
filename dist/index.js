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
//@ts-ignore
const live_directory_1 = __importDefault(require("live-directory"));
const graceful_fs_1 = __importDefault(require("graceful-fs"));
class LenDB {
    constructor(appname, settings, serverOptions) {
        this.links = [];
        this._uploadPath = "./uploads";
        this.AccessControlList = [];
        this.liveQueryRefferences = [];
        this.Server = new hyper_express_1.default.Server({ max_body_length: Infinity });
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
            ignore: (path) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });
    }
    Query(ref) {
        return new core_1.LenQuery(ref, this.emitter, this.Serializer, this.acebase);
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
                ws.on("message", async (payloadData) => {
                    let queryRef;
                    const payload = JSON.parse(payloadData);
                    let transaction;
                    subscriptionKey = payload?.subscriptionKey;
                    transaction = payload?.query;
                    queryRef = this.Serializer.applyFilters(transaction, this.acebase.query(transaction.ref));
                    queryRef.on("add", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                        ws.send(JSON.stringify({
                            type: "add",
                            data,
                            index,
                            count,
                            newData,
                        }));
                    });
                    queryRef.on("change", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                        ws.send(JSON.stringify({
                            type: "update",
                            data,
                            index,
                            count,
                            newData,
                        }));
                    });
                    queryRef.on("remove", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(transaction, realtimeQueryEvent);
                        ws.send(JSON.stringify({
                            type: "destroy",
                            data,
                            index,
                            count,
                            newData,
                        }));
                    });
                    if (payload?.reconnect == true) {
                        queryRef.get({ exclude: ["*"] });
                    }
                    else {
                        queryRef.get({ exclude: ["*"] });
                        let queryResult = await this.Serializer.Execute(transaction);
                        let data = queryResult.data || [];
                        let count = queryResult.count || 0;
                        ws.send(JSON.stringify({ type: "initialdata", data, count }));
                    }
                    ws.on("close", (code) => {
                        if (queryRef) {
                            queryRef.off();
                        }
                        if (code == 1000 && subscriptionKey) {
                            // ws.close();
                            if (queryRef) {
                                queryRef.off();
                            }
                        }
                    });
                });
                //! todo close the connection when it does not ping for certain time
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
                            res.cookie("lenDB_token", result.token, Infinity, {
                                httpOnly: true,
                            });
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        }
                        else if (payload.type == "login") {
                            let result = await this.auth.Login(payload.username, payload.password);
                            res.cookie("lenDB_token", result.token, Infinity, {
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
                        else if (payload.type == "authenticate_ws") {
                            let token = req.cookies["lenDB_token"];
                            if (!token) {
                                res.json({ public: true });
                            }
                            else {
                                let result = await this.auth.AuthenticateWS(token);
                                res.json({ key: result.key });
                            }
                        }
                        else if (payload.type == "authenticate") {
                            let token = req.cookies["lenDB_token"];
                            if (token) {
                                let result = await this.auth.Authenticate(token);
                                res.cookie("lenDB_token", result.token, Infinity, {
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
                        res.status(403);
                        res.send("Require valid payload");
                    }
                }
                else {
                    res.status(403);
                    res.send("Require valid payload");
                }
            }
            catch (error) {
                res.status(403);
                res.json({ message: error });
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
        this.Server.ws("/lenDB_LiveObject", async (ws) => { });
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
    }
    async start(port = 5757, host = "localhost") {
        try {
            this.initialize();
            await this.acebase.ready();
            await this.acebase.indexes.create("__uploads__", "key");
            await this.acebase.indexes.create("__tokens__", "key", {
                type: "fulltext",
                config: { maxLength: Infinity },
            });
            this.Serializer = new core_1.Serializer(this.acebase, this.emitter, this.hook.refHooks, this.hook.authHooks, null, this.links, this.Server.uws_instance);
            let status = await this.Server.listen(port, host);
            console.log(`Server is running at ${host}:${port}`);
            return Promise.resolve(status);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}
exports.LenDB = LenDB;
exports.default = LenDB;
