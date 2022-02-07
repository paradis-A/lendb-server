import cuid from "cuid";
import { cloneDeep } from "lodash";
import { Serializer } from "./";
// import Normalize from "./normalize";
export default class LenObject {
    public key: string;
    protected ref: string;
    protected created_at: Date;
    protected updated_at: Date;
    protected loadedRawData: any;
    protected childProps: string[];
    protected singular: boolean = false;
    protected operation: "save" | "load" | "destroy" | "exists";
    protected eventHandles: { emit?: boolean; hook?: boolean } = {
        hook: true,
        emit: true,
    };
    
    protected serializer: Serializer;
    constructor(
        ref: string,
        singularOrKey: boolean | string = false,
        serializer?: Serializer
    ) {
        this.operation = "save";
        this.serializer = serializer;
        this.key = cuid();
        if (typeof singularOrKey == "string" && cuid.isCuid(singularOrKey)) {
            this.key = singularOrKey;
        } else if (typeof singularOrKey == "boolean" && singularOrKey) {
            this.singular = singularOrKey;
            this.key = null;
        }
        this.ref = ref;
    }

    async destroy(serverOpts = { emit: false, hook: false }) {
        try {
            let payload: any = {
                key: this.key,
                ref: this.ref,
                operation: "destroy",
                singular: this.singular,
            };
            payload.eventHandles = {
                hook: serverOpts.hook,
                emit: serverOpts.emit,
            };
            let res = await this.serializer.Execute(payload);
            return Promise.resolve(res);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    
    async exists(): Promise<boolean> {
        try {
            let payload = {
                singular: this.singular,
                key: this.key,
                ref: this.ref,
                operation: "exists"
            };
            let res = await this.serializer.Execute(payload);
            return Promise.resolve(res);
        } catch (error) {
            Promise.reject(error);
        }
    }

    async commit(serverOpts = { emit: false, hook: false }): Promise<any> {
        try {
            if (this.ref.includes("*")) {
                return Promise.reject(
                    "Error: Adding or Updating must not contain wildcard path."
                );
            }
            let clone: any | this = {};
            if (this.operation == "save") {
                clone = this.stripNonData(Object.assign({}, this));
            } else if (this.operation == "destroy") {
                clone = Object.assign(
                    {},
                    {
                        operation: clone?.operation,
                        ref: clone.ref,
                        key: clone?.key,
                        sing: clone?.singular,
                    }
                );
            }
            clone.eventHandles = {
                hook: serverOpts.hook,
                emit: serverOpts.emit,
            };
            let res = await this.serializer.Execute(clone);
            this.operation = "save";
            return Promise.resolve(res);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    protected stripNonData(clone: this) {
        delete clone.created_at;
        delete clone.updated_at;
        delete clone.serializer;
        delete clone.childProps;
        delete clone.loadedRawData;
        return clone;
    }

    /**
     * Loads the data from the database with key provided
     * through constructor.
     * Will return null if object do not exist,
     */
    async load(serverOpts = { hook: false }): Promise<this> {
        try {
            let payload: any = {
                operation: "load",
                key: this.key,
                ref: this.ref,
                singular: this.singular,
            };
            payload.eventHandles = { hook: serverOpts.hook };
            let res = await this.serializer.Execute(payload);
            if (res) {
                return Promise.resolve(this.assign(res));
            } else {
                return Promise.resolve(this);
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    // async exists(): Promise<boolean>{
    //     try {
    //         let payload = {operation: "exists", key: this.key, ref: this.ref, singular: this.singular}
    //         let res = await this.serializer.Execute(payload)
    //         return Promise.resolve(res)
    //     } catch (error) {
    //         return Promise.reject(error)
    //     }
    // }

    assign(data: any) {
        let temp = cloneDeep(data);
        delete temp.childProps;
        delete temp.eventHandles;
        delete temp.loadedRawData;
        delete temp.singular;
        delete temp.ref;
        delete temp.serializer;
        delete temp.singular;
        Object.assign(this, temp);
        return this;
    }

    clone() {
        return cloneDeep(this);
    }

    /**
     * Gets the data from LenObject.
     */
    toObject() {
        let temp = cloneDeep(this);
        delete temp.childProps;
        delete temp.eventHandles;
        delete temp.loadedRawData;
        delete temp.singular;
        delete temp.ref;
        delete temp.serializer;
        delete temp.singular;
        return temp;
    }
    /**
     * Mark this Object to be destroyed on calling commit() or commitMany().
     */
    toDestroy(yes = true) {
        this.operation = yes ? "destroy" : "save";
        return this;
    }
}

export interface ObjectLink {
    target: string;
    source: string;
    identity: string;
    fields: { targetField: string; sourceField: string }[];
}
