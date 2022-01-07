"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LenDB = void 0;
const hyper_express_1 = __importDefault(require("hyper-express"));
const acebase_1 = require("acebase");
const core_1 = require("./core");
const figlet_1 = __importDefault(require("figlet"));
const emittery_1 = __importDefault(require("emittery"));
const live_directory_1 = __importDefault(require("live-directory"));
const graceful_fs_1 = __importDefault(require("graceful-fs"));
class LenDB {
    Serializer;
    acebase;
    emitter;
    hook;
    auth;
    links = [];
    _uploadPath = "./uploads";
    Server;
    LiveAsset;
    constructor(appname, settings) {
        this.Server = new hyper_express_1.default.Server({ max_body_length: 100000000 });
        this.acebase = new acebase_1.AceBase(appname, settings);
        for (let i = 0; i < 8; i++) {
            process.stdout.moveCursor(0, -1); // up one line
            process.stdout.clearLine(1); //
        }
        let title = figlet_1.default.textSync("LenDB Server\r\r", "Doom").replace(/^(?=\n)$|^\s*|\s*$|\n\n+/gm, "");
        this.auth = new core_1.Auth(this.acebase);
        this.emitter = new emittery_1.default();
        this.hook = new core_1.Hook();
        this.LiveAsset = new live_directory_1.default({
            path: "./uploads",
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
    ObjectLink(settings) {
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
            }
            catch (error) {
                console.log(error);
                res.status(500);
                res.end("Error here");
            }
        });
        this.Server.post("/lenDB_Auth", async (req, res) => { });
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
            if (!graceful_fs_1.default.existsSync(this._uploadPath)) {
                //@ts-ignore
                graceful_fs_1.default.mkdir(this._uploadPath, () => { });
            }
            res.setHeader("Access-Control-Allow-Origin", "*");
            await this.Serializer.Upload(req, res, this._uploadPath);
        });
        this.Server.ws("/lenDB_live", (ws) => {
            let unsubscriber = null;
            ws.on("message", (data) => {
                if (unsubscriber) {
                    unsubscriber();
                }
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
                if (code == 1000 && unsubscriber) {
                    unsubscriber();
                }
            });
        });
    }
    get uploadPath() {
        return this._uploadPath;
    }
    set uploadPath(v) {
        this.LiveAsset = new live_directory_1.default({
            path: v,
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
            this.Serializer = new core_1.Serializer(this.acebase, this.emitter, this.hook.refHooks, this.hook.authHooks, null, this.links);
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
//# sourceMappingURL=index.js.map