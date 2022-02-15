import Emittery from "emittery";
export declare class Queue {
    emitter: Emittery;
    protected lists: {
        [any: string]: Function[];
    };
    constructor(emitter: Emittery);
    getQueue(ref: string): void;
    count(ref: string): void;
    add(ref: string, callback: () => void): void;
}
