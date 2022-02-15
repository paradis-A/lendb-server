import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import {
    Serializer,
    LenQuery,
    LenObject,
    Hook,
    Auth,
    ObjectLink,
    ACL as ACLConfig,
} from "./core";
export type { LenObject, LenQuery } from "./core";
// import Figlet from "figlet";
import Emittery from "emittery";
import LiveDirectory from "live-directory";
import fs from "graceful-fs";
import cuid from "cuid";
import { DataReferenceQuery } from "acebase-core";
import { add, clone, cloneDeep } from "lodash";
import wait from "wait";
import pWaitFor from "./extras/pwaitfor";
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
    constructor(
        appname: string,
        settings?: AceBaseLocalSettings,
        serverOptions?: { uploadPath: string }
    ) {
        this.Server = new HyperExpress.Server({ max_body_length: 100000000 });
        this.acebase = new AceBase(appname, settings);
        this.auth = new Auth(this.acebase);
        this.emitter = new Emittery();
        this.hook = new Hook();
        if (serverOptions?.uploadPath)
            this._uploadPath = serverOptions?.uploadPath;
        if (!fs.existsSync(this._uploadPath)) {
            //@ts-ignore
            fs.mkdirSync(this._uploadPath, { recursive: true });
        }
        this.LiveAsset = new LiveDirectory({
            path: this._uploadPath, // We want to provide the system path to the folder. Avoid using relative paths.
            // keep: {
            //     extensions: [".png", ".jpg", ".jpeg"], // We only want to serve files with these extensions
            // },
            ignore: (path) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });
    }
    
    Query(ref: string) {
        return new LenQuery(ref, this.emitter, this.Serializer);
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
                res.setHeader(
                    "Access-Control-Allow-Origin",
                    req.header("origin")
                );
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
                let transaction: {
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
                let queryRef: DataReferenceQuery;
                ws.on("message", async (payloadData) => {
                    const payload = JSON.parse(payloadData);
                    //! todo synchronize in short time period
                    if (cuid.isCuid(payload?.subscriptionKey)) {
                        subscriptionKey = payload?.subscriptionKey;
                        if (queryRef) {
                            queryRef.off();
                        }
                        await pWaitFor(() => {
                            return (
                                this.liveQueryRefferences.find(
                                    (lqr) =>
                                        lqr.subscriptionKey == subscriptionKey
                                ) != undefined
                            );
                        });
                        let liveQueryRefference =
                            this.liveQueryRefferences.find(
                                (lqr) => lqr.subscriptionKey == subscriptionKey
                            );
                        if (
                            liveQueryRefference != null ||
                            liveQueryRefference != undefined
                        )
                            transaction = liveQueryRefference.transaction;
                        queryRef = this.Serializer.applyFilters(
                            transaction,
                            this.acebase.query(transaction.ref)
                        );
                        if (cuid.isCuid(subscriptionKey) && transaction) {
                            queryRef.on("add", async (realtimeQueryEvent) => {
                                console.log("add event emitted!!!");
                                const { data, index, count } =
                                    await this.Serializer.LivePayload(
                                        transaction,
                                        realtimeQueryEvent
                                    );
                                ws.send(
                                    JSON.stringify({
                                        type: "add",
                                        data,
                                        index,
                                        count,
                                    })
                                );
                            });
                            queryRef.on(
                                "change",
                                async (realtimeQueryEvent) => {
                                    const { data, index, count } =
                                        await this.Serializer.LivePayload(
                                            transaction,
                                            realtimeQueryEvent
                                        );
                                    ws.send(
                                        JSON.stringify({
                                            type: "update",
                                            data,
                                            index,
                                            count,
                                        })
                                    );
                                }
                            );
                            queryRef.on(
                                "remove",
                                async (realtimeQueryEvent) => {
                                    const { data, index, count } =
                                        await this.Serializer.LivePayload(
                                            transaction,
                                            realtimeQueryEvent
                                        );
                                    const newData = (await queryRef.get()).map(
                                        (v) => v.val()
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
                                }
                            );
                            await queryRef.get({ include: ["key"] });
                        }
                    }

                    if (payload?.ping) {
                    }
                });
                //! todo close the connection when it does not ping for certain time
                ws.on("close", (code) => {
                    if (code == 1000 && subscriptionKey) {
                        ws.off("add:" + subscriptionKey, () => {});
                        ws.off("update:" + subscriptionKey, () => {});
                        ws.off("destroy:" + subscriptionKey, () => {});
                        ws.close();
                        if (queryRef) {
                            queryRef.off();
                        }
                    }
                });
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
                res.setHeader(
                    "Access-Control-Allow-Origin",
                    req.header("origin")
                );
                res.setHeader("Access-Control-Allow-Credentials", "true");
                res.setHeader("Vary", "origin");
                const payload = await req.json();
                if (payload) {
                    if (payload.type) {
                        if (payload.type == "register") {
                            delete payload.type;
                            let result = await this.auth.Register(payload);
                            res.cookie(
                                "lenDB_token",
                                result.token,
                                result.expiration * 3.6e6,
                                {
                                    httpOnly: true,
                                }
                            );
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        } else if (payload.type == "login") {
                            let result = await this.auth.Login(
                                payload.username,
                                payload.password
                            );
                            res.cookie(
                                "lenDB_token",
                                result.token,
                                result.expiration * 3.6e6,
                                {
                                    httpOnly: true,
                                }
                            );
                            const { data, client_key } = result;
                            res.json({ data, client_key });
                        } else if (payload.type == "logout") {
                            if ("lenDB_token" in req?.cookies) {
                                await this.auth.Logout(
                                    req.cookies["lenDB_token"]
                                );
                            }
                            res.removeCookie("lenDB_token");
                            res.json({ message: "Logged out succesfully" });
                        } else if (payload.type == "authenticate") {
                            let token: any = req.cookies["lenDB_token"];
                            console.log(token);
                            if (token) {
                                let result = await this.auth.Authenticate(
                                    token
                                );
                                res.cookie(
                                    "lenDB_token",
                                    result.token,
                                    result.expiration * 3.6e6,
                                    {
                                        httpOnly: true,
                                    }
                                );
                                const { client_key, data } = result;
                                res.json({ client_key, data });
                            } else {
                                res.json({});
                            }
                        } else if (payload.type == "update") {
                        }
                    } else {
                        res.status(500);
                        res.send("Require valid payload");
                    }
                } else {
                    res.status(500);
                    res.send("Require valid payload");
                }
            } catch (error) {
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
            if (file === undefined) return res.status(404).send();
            return res.type(file.extension).send(file.buffer);
        });

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

        this.Server.ws("/lenDB_live", (ws) => {
            let unsubscriber: Function = null;
            ws.on("message", (data) => {
                // if (unsubscriber) {
                //     unsubscriber();
                // }
                unsubscriber = null;
                const query = JSON.parse(data);
                if (
                    !("filters" in query) ||
                    !("sorts" in query) ||
                    !("ref" in query) ||
                    !("page" in query) ||
                    !("limit" in query) ||
                    !("skip" in query)
                ) {
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
            this.emitter.on("setLiveQueryRefference", (query) => {
                this.liveQueryRefferences.push(query);
            });
            return Promise.resolve(status);
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

export default LenDB;
