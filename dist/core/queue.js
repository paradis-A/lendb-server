"use strict";
//! This is implemented to lock writes to a refference.
//! i.e. you want to update a refference with a value aggregated from other refference
//! this will lock the refference you want to update then will get value from other refference when
//! writing is already done
//! then emitter will trigger a certain pub key from when task is done
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    constructor(emitter) {
        this.emitter = emitter;
    }
    getQueue(ref) {
    }
    count(ref) {
    }
    add(ref, callback) {
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map