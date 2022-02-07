import HyperExpress from "hyper-express";
import { AceBase, AceBaseLocalSettings } from "acebase";
import { Serializer, LenQuery, LenObject, Hook, Auth, ObjectLink, ACL as ACLConfig } from "./core";
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
    protected AccessControlList: ACLConfig[];
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
    }[];
    constructor(appname: string, settings?: AceBaseLocalSettings, serverOptions?: {
        uploadPath: string;
    });
    Query(ref: string): LenQuery;
    Object(ref: string, singularOrKey?: boolean | string): LenObject;
    ACL(options: ACLConfig): void;
    ObjectLink(settings: ObjectLink): void;
    initialize(): void;
    start(port?: number, host?: string): Promise<HyperExpress.compressors.us_listen_socket>;
}
export default LenDB;
