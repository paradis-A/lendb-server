"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterHook = exports.RefHooks = exports.Authhooks = void 0;
exports.Authhooks = [];
exports.RefHooks = [];
class Hook {
    _refhooks = [];
    _authHooks = [];
    addOrReplaceRefHook(hook) {
        const { ref: table, event } = hook;
        const el = this._refhooks.findIndex((h) => h.ref == table && h.event == event);
        if (el == -1) {
            this._refhooks.push(hook);
        }
        else {
            this.refHooks[el] = hook;
        }
    }
    addOrReplaceAuthHook(hook) {
    }
    beforeAdd(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeAdd" });
    }
    afterAdd(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterAdd" });
    }
    beforeUpdate(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeUpdate" });
    }
    afterUpdate(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterUpdate" });
    }
    beforeDestroy(ref, callback) {
        this.addOrReplaceRefHook({
            ref: ref,
            callback,
            event: "beforeDestroy",
        });
    }
    afterDestroy(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterDestroy" });
    }
    beforeFind(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeFind" });
    }
    afterFind(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterFind" });
    }
    befereLoad(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "beforeLoad" });
    }
    afterLoad(ref, callback) {
        this.addOrReplaceRefHook({ ref: ref, callback, event: "afterLoad" });
    }
    beforeLogin(callback) { }
    //todo Auth Hooks
    afterLogin(callback) { }
    beforeTokenLogin(callback) { }
    afterTokenLogin(callback) { }
    beforeRegister(callback) { }
    afterRegister(callback) { }
    get refHooks() {
        return this._refhooks;
    }
    get authHooks() {
        return this._authHooks;
    }
}
exports.default = Hook;
function RegisterHook(hook) {
    let temp = new Hook();
    hook(temp);
    exports.RefHooks = temp.refHooks;
    exports.Authhooks = temp.authHooks;
}
exports.RegisterHook = RegisterHook;
