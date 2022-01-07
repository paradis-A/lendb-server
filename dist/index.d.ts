import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import { Serializer, LenQuery, LenObject, Hook, Auth, ObjectLink } from "./core";
export type { LenObject, LenQuery } from "./core";
import Emittery from "emittery";
import LiveDirectory from "live-directory";
export declare class LenDB {
    protected Serializer: Serializer;
    readonly acebase: AceBase;
    readonly emitter: Emittery;
    readonly hook: Hook;
    readonly auth: Auth;
    protected links: ObjectLink[];
    protected _uploadPath: string;
    readonly Server: HyperExpress.Server;
    protected LiveAsset: LiveDirectory;
    constructor(appname: string, settings?: AceBaseLocalSettings);
    Query(ref: string): LenQuery;
    Object(ref: string, singularOrKey?: boolean | string): LenObject;
    ObjectLink(settings: ObjectLink): void;
    initialize(): void;
    get uploadPath(): string;
    set uploadPath(v: string);
    start(port?: number, host?: string): Promise<HyperExpress.compressors.us_listen_socket>;
}
export default LenDB;
