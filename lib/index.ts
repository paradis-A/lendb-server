import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import { Serializer, LenQuery, LenObject, Hook, Auth, ObjectLink, ACL as ACLConfig } from "./core";
export type { LenObject, LenQuery } from "./core";
// import Figlet from "figlet";
import Emittery from "emittery";
//@ts-ignore
import LiveDirectory from "live-directory";
import fs from "graceful-fs";
import { DataReferenceQuery } from "acebase-core";
export class LenDB {
    protected Serializer: Serializer;
    readonly acebase: AceBase;
    readonly emitter: Emittery;
    readonly hook: Hook;
    readonly auth: Auth;
    protected links: ObjectLink[] = [];
    protected _uploadPath: string = "./uploads";
    readonly Server: HyperExpress.Server;
    protected LiveAsset: LiveDirectory;
    protected AccessControlList: ACLConfig[] = [];
    protected liveQueryRefferences: {
        transaction: {
            skip: number;
            limit: number;
            page: number;
            exclusion: string[];
            inclusion: string[];
            sort: any[];
            filters: any[];
            ref: string;
            searchString: string;
        };
        subscriptionKey: string;
    }[] = [];
    constructor(appname: string, settings?: AceBaseLocalSettings, serverOptions?: { uploadPath: string }) {
        this.Server = new HyperExpress.Server({ max_body_length: Infinity });
        this.acebase = new AceBase(appname, settings);
        this.auth = new Auth(this.acebase);
        this.emitter = new Emittery();
        this.hook = new Hook();
        if (serverOptions?.uploadPath) this._uploadPath = serverOptions?.uploadPath;
        if (!fs.existsSync(this._uploadPath)) {
            //@ts-ignore
            fs.mkdirSync(this._uploadPath, { recursive: true });
        }
        this.LiveAsset = new LiveDirectory({
            path: this._uploadPath, // We want to provide the system path to the folder. Avoid using relative paths.
            ignore: (path) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });
    }

    Query(ref: string) {
        return new LenQuery(ref, this.emitter, this.Serializer,this.acebase);
    }

    Object(ref: string, singularOrKey: boolean | string = false) {
        return new LenObject(ref, singularOrKey, this.Serializer);
    }

    ACL(options: ACLConfig) {
        this.AccessControlList.push(options);
    }

    ObjectLink(settings: ObjectLink) {
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
            } catch (error) {
                console.log(error);
                res.status(500);
                res.end("Error here");
            }
        });
        
        this.Server.ws("/lenDB", async (ws) => {
            try {
                let subscriptionKey = null;
                ws.on("message", async (payloadData) => {
                    let queryRef: DataReferenceQuery;
                    const payload = JSON.parse(payloadData);
                    let transaction: {
                        skip: number;
                        limit: number;
                        page: number;
                        exclusion: string[];
                        inclusion: string[];
                        sort: any[];
                        filters: any[];
                        ref: string;
                    };
                    subscriptionKey = payload?.subscriptionKey;
                    transaction = payload?.query;
                    queryRef = this.Serializer.applyFilters(transaction, this.acebase.query(transaction.ref));
                    queryRef.on("add", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(
                            transaction,
                            realtimeQueryEvent
                        );
                        ws.send(
                            JSON.stringify({
                                type: "add",
                                data,
                                index,
                                count,
                                newData,
                            })
                        );
                    });
                    queryRef.on("change", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(
                            transaction,
                            realtimeQueryEvent
                        );
                        ws.send(
                            JSON.stringify({
                                type: "update",
                                data,
                                index,
                                count,
                                newData,
                            })
                        );
                    });
                    queryRef.on("remove", async (realtimeQueryEvent) => {
                        const { data, index, count, newData } = await this.Serializer.LivePayload(
                            transaction,
                            realtimeQueryEvent
                        );
                        ws.send(
                            JSON.stringify({
                                type: "destroy",
                                data,
                                index,
                                count,
                                newData,
                            })
                        );
                    });
                    if (payload?.reconnect == true) {
                        queryRef.get({exclude: ["*"]})
                    } else {
                        queryRef.get({exclude: ["*"]})
                        let queryResult = await this.Serializer.Execute(transaction)
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
            } catch (error) {
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
                        } else if (payload.type == "login") {
                            let result = await this.auth.Login(payload.username, payload.password);
                            res.cookie("lenDB_token", result.token, Infinity, {
                                httpOnly: true,
                            });
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        } else if (payload.type == "logout") {
                            if ("lenDB_token" in req?.cookies) {
                                await this.auth.Logout(req.cookies["lenDB_token"]);
                            }
                            res.removeCookie("lenDB_token");
                            res.json({ message: "Logged out succesfully" });
                        } else if (payload.type == "authenticate_ws") {
                            let token: any = req.cookies["lenDB_token"];
                            if (!token) {
                                res.json({ public: true });
                            } else {
                                let result = await this.auth.AuthenticateWS(token);
                                res.json({ key: result.key });
                            }
                        } else if (payload.type == "authenticate") {
                            let token: any = req.cookies["lenDB_token"];
                            if (token) {
                                let result = await this.auth.Authenticate(token);
                                res.cookie("lenDB_token", result.token, Infinity, {
                                    httpOnly: true,
                                });
                                const { client_key, data } = result;
                                res.json({ client_key, data });
                            } else {
                                res.json({});
                            }
                        } else if (payload.type == "update") {
                        }
                    } else {
                        res.status(403);
                        res.send("Require valid payload");
                    }
                } else {
                    res.status(403);
                    res.send("Require valid payload");
                }
            } catch (error) {
                res.status(403);
                res.json({ message: error });
            }
        });

        this.Server.get("/uploads/*", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            const path = req.path.replace("/uploads", "");
            const file = this.LiveAsset.get(path);
            //@ts-ignore
            if (file === undefined) return res.status(404).send();
            return res.type(file.extension).send(file.buffer);
        });

        this.Server.ws("/lenDB_LiveObject", async (ws) => {});

        this.Server.get("/lenDB_upload/:key", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            try {
                //@ts-ignore
                let key: any = req.path_parameters.key;
                let file = this.acebase.ref("__uploads__" + key);
                const exists = await file.exists();
                if (!exists) {
                    res.json({ key, filename: null, url: null });
                } else {
                    res.json((await file.get()).val());
                }
            } catch (error) {
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
            await this.acebase.indexes.create("__tokens__", "key");
            this.Serializer = new Serializer(
                this.acebase,
                this.emitter,
                this.hook.refHooks,
                this.hook.authHooks,
                null,
                this.links,
                this.Server.uws_instance
            );
            let status = await this.Server.listen(port, host);
            console.log(`Server is running at ${host}:${port}`);
            return Promise.resolve(status);
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

export default LenDB;
