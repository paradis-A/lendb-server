import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import {
    Serializer,
    LenQuery,
    LenObject,
    Hook,
    Auth,
    ObjectLink,
} from "./core";
export type { LenObject, LenQuery } from "./core";
import Figlet from "figlet";
import Emittery from "emittery";
import LiveDirectory from "live-directory";
import fs from "graceful-fs";
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
    constructor(appname: string, settings?: AceBaseLocalSettings) {
        this.Server = new HyperExpress.Server({ max_body_length: 100000000 });
        this.acebase = new AceBase(appname, settings);
        for (let i = 0; i < 8; i++) {
            process.stdout.moveCursor(0, -1); // up one line
            process.stdout.clearLine(1); //
        }
        let title = Figlet.textSync("LenDB Server\r\r", "Doom").replace(
            /^(?=\n)$|^\s*|\s*$|\n\n+/gm,
            ""
        );
        this.auth = new Auth(this.acebase);
        this.emitter = new Emittery();
        this.hook = new Hook();
        this.LiveAsset = new LiveDirectory({
            path: "./uploads", // We want to provide the system path to the folder. Avoid using relative paths.
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

    ObjectLink(settings: ObjectLink) {
        this.links.push(settings);
    }

    initialize() {
        this.Server.post("/lenDB", async (req, res) => {
            try {
                const payload = await req.json();
                res.setHeader("Access-Control-Allow-Origin", "*");
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

        this.Server.post("/lenDB_Auth", async (req, res) => {});

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
            if (!fs.existsSync(this._uploadPath)) {
                //@ts-ignore
                fs.mkdir(this._uploadPath, () => {});
            }
            res.setHeader("Access-Control-Allow-Origin", "*");
            await this.Serializer.Upload(req, res, this._uploadPath);
        });

        this.Server.ws("/lenDB_live", (ws) => {
            let unsubscriber: Function = null;
            ws.on("message", (data) => {
                if (unsubscriber) {
                    unsubscriber();
                }
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
                if (code == 1000 && unsubscriber) {
                    unsubscriber();
                }
            });
        });
    }

    public get uploadPath(): string {
        return this._uploadPath;
    }

    public set uploadPath(v: string) {
        this.LiveAsset = new LiveDirectory({
            path: v, // We want to provide the system path to the folder. Avoid using relative paths.
            ignore: (path) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });
        this._uploadPath = v;
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
                this.links
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
