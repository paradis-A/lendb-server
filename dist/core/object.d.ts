import { Serializer } from "./";
export default class LenObject {
    key: string;
    protected ref: string;
    protected created_at: Date;
    protected updated_at: Date;
    protected loadedRawData: any;
    protected childProps: string[];
    protected singular: boolean;
    protected operation: "save" | "load" | "destroy" | "exists";
    protected serializer: Serializer;
    constructor(ref: string, singularOrKey?: boolean | string, serializer?: Serializer);
    destroy(serverOpts?: {
        emit: boolean;
        hook: boolean;
    }): Promise<any>;
    exists(): Promise<boolean>;
    commit(serverOpts?: {
        emit: boolean;
        hook: boolean;
        queue: boolean;
    }): Promise<any>;
    protected stripNonData(clone: this): this;
    /**
     * Loads the data from the database with key provided
     * through constructor.
     * Will return null if object do not exist,
     */
    load(serverOpts?: {
        hook: boolean;
    }): Promise<this>;
    assign(data: any): this;
    clone(): this;
    /**
     * Gets the data from LenObject.
     */
    toObject(): this;
    /**
     * Mark this Object to be destroyed on calling commit() or commitMany().
     */
    toDestroy(yes?: boolean): this;
}
export interface ObjectLink {
    target: string;
    source: string;
    identity: string;
    fields: {
        targetField: string;
        sourceField: string;
    }[];
}
