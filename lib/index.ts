import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import { Serializer, LenQuery, LenObject, Hook, Auth } from "./core";
export type { LenObject, LenQuery } from "./core";
import Figlet from "figlet";
import Emittery from "emittery";
export class LenDB {
    protected Serializer: Serializer;
    readonly acebase: AceBase;
    protected emitter: Emittery;
    readonly hook: Hook;
    readonly auth: Auth;
    readonly Server: HyperExpress.Server;
    constructor(appname: string, settings?: AceBaseLocalSettings) {
        this.Server = new HyperExpress.Server();
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
    }

    Query(ref: string) {
        return new LenQuery(ref, this.emitter, this.Serializer);
    }

    Object(ref: string, singularOrKey: boolean | string = false) {
        return new LenObject(ref, singularOrKey, this.Serializer);
    }

    initialize() {
        this.Server.post("/lenDB", async (req, res) => {
            try {
                const payload = await req.json();
                res.setHeader("Access-Control-Allow-Origin", "*");
                console.log(payload);
                let result = await this.Serializer.Execute(payload);
                res.json(result);
            } catch (error) {
                console.log(error);
                res.status(500);
                res.end("Error here");
            }
        });
        this.Server.post("/lenDB_Auth", async (req, res) => {
            res.send("Hello World");
        });

        this.Server.ws("/lenDB_live", (ws) => {
            ws.send("Welcome");
            ws.on("message", (data) => {
                console.log("data");
            });
        });
    }

    async start(port = 5757, host = "localhost") {
        try {
            this.initialize();
            await this.acebase.ready();
            this.Serializer = new Serializer(
                this.acebase,
                this.emitter,
                this.hook.refHooks,
                this.hook.authHooks
            );

            let status = await this.Server.listen(port, host);
            console.log(`Server is running at ${host}:${port}`);
            console.log(status);
            return Promise.resolve(status);
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

export default LenDB;
