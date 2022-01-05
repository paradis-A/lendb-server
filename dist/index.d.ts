import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import { Serializer, LenQuery, LenObject, Hook, Auth } from "./core";
export type { LenObject, LenQuery } from "./core";
import Emittery from "emittery";
import LiveDirectory from "live-directory";
export declare class LenDB {
    protected Serializer: Serializer;
    readonly acebase: AceBase;
    protected emitter: Emittery;
    readonly hook: Hook;
    readonly auth: Auth;
    readonly Server: HyperExpress.Server;
    readonly LiveAsset: LiveDirectory;
    constructor(appname: string, settings?: AceBaseLocalSettings);
    Query(ref: string): LenQuery;
    Object(ref: string, singularOrKey?: boolean | string): LenObject;
    initialize(): void;
    start(port?: number, host?: string): Promise<HyperExpress.compressors.us_listen_socket>;
}
export default LenDB;
