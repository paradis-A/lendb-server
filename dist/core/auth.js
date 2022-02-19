"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_simple_1 = __importDefault(require("jwt-simple"));
const cuid_1 = __importDefault(require("cuid"));
class Auth {
    // protected req: Request
    // protected res: Response
    constructor(acebase) {
        this.enabled = false;
        this.defaultRole = "user";
        this.acebase = acebase;
    }
    SetDefaultRole(role) {
        this.defaultRole = role;
    }
    async Login(usernameOrEmail, password) {
        try {
            let userinfo;
            if (this.isValidEmail(usernameOrEmail)) {
                userinfo = (await this.acebase.query("__users__").filter("email", "==", usernameOrEmail).get()).map((v) => v)[0];
            }
            else {
                userinfo = (await this.acebase.query("__users__").filter("username", "==", usernameOrEmail).get()).map((v) => v.val())[0];
            }
            if (!userinfo?.username) {
                return Promise.reject("Error: username/email and password does not match.");
            }
            let decodedPass = jwt_simple_1.default.decode(userinfo.password, userinfo.jwtKey);
            if (decodedPass == password) {
                const client_key = (0, cuid_1.default)();
                let token = jwt_simple_1.default.encode(userinfo.key, (0, cuid_1.default)());
                token = token.substring(0, 101) + "." + client_key;
                await this.acebase.ref("__tokens__/" + token).set({
                    userKey: userinfo.key,
                });
                delete userinfo.password;
                delete userinfo.jwtKey;
                //set token with client key
                return Promise.resolve({
                    client_key,
                    token,
                    data: userinfo,
                });
            }
            else {
                return Promise.reject("Error: username/email and password does not match.");
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async AuthenticateWS(token) {
        try {
            let ref = this.acebase.ref("__tokens__/" + token);
            if ((await ref.exists()) == false) {
                return Promise.reject("Invalid Token");
            }
            else {
                let key = token.substring(token.length - 25);
                let ws_ref = this.acebase.ref("__ws_keys__/" + key);
                if ((await ws_ref.exists()) == false) {
                    ws_ref.set({
                        key,
                        token,
                    });
                }
                return { token, key };
            }
        }
        catch (error) {
            return Promise.reject("Authentication Failed");
        }
    }
    async VerifyWSKey() { }
    async Authenticate(token) {
        try {
            let ref = this.acebase.ref("__tokens__/" + token);
            if (!(await ref.exists())) {
                return Promise.reject("Invalid Token");
            }
            else {
                let verifiedToken = (await ref.get()).val();
                let userDetails = (await this.acebase.ref("__users__/" + verifiedToken?.userKey).get()).val();
                let client_key = token.substring(token.length - 25);
                //! set client key on token
                delete userDetails.password;
                delete userDetails.jwtKey;
                return Promise.resolve({
                    data: userDetails,
                    client_key,
                    token,
                });
            }
        }
        catch (error) {
            return Promise.reject("Invalid Token");
        }
    }
    static UserList() { }
    async GetUser(token) {
        let res = (await this.acebase.query("__tokens__").filter("token", "==", token).get()).map((snap) => {
            return snap.val();
        });
        if (res.length) {
            let userToken = res[0];
            if (userToken?.userKey) {
                let userDetails = (await this.acebase.ref("__users__/" + userToken.userKey).get()).val();
                delete userDetails.password;
                delete userDetails.jwtKey;
                return Promise.resolve(userDetails);
            }
        }
        return Promise.reject("Not found");
    }
    async Logout(token) {
        try {
            let key = (await this.acebase.query("__tokens__").filter("token", "==", token).get()).map((v) => v.val())[0]
                ?.key;
            if (key) {
                await this.acebase.ref("__tokens__/" + key).remove();
            }
            return Promise.resolve("Successfully logged out.");
        }
        catch (error) {
            throw new Error(error);
        }
    }
    isValidEmail(email) {
        return String(email)
            .toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    }
    async Register(credentials) {
        try {
            if (typeof credentials.username != "string") {
                return Promise.reject("argument username expected to be string");
            }
            if (typeof credentials.password != "string") {
                return Promise.reject("argument password expected to be string");
            }
            if (typeof credentials.email != "string" || !this.isValidEmail(credentials.email)) {
                return Promise.reject("invalid email");
            }
            let jwtKey = (0, cuid_1.default)();
            const userKey = (0, cuid_1.default)();
            let tokenizedPassword = jwt_simple_1.default.encode(credentials.password, jwtKey);
            let obj = {
                email: credentials.email,
                username: credentials.username,
                password: tokenizedPassword,
                role: this.defaultRole,
                jwtKey,
                key: userKey,
                created_at: new Date(Date.now()),
            };
            //check if email exists
            if (await this.acebase.query("__users__").filter("username", "==", obj.username).exists()) {
                return Promise.reject("Username already exists");
            }
            //check if username exists
            if (await this.acebase.query("__users__").filter("email", "==", obj.password).exists()) {
                return Promise.reject("Email already exists");
            }
            await this.acebase.ref("__users__/" + userKey).set(obj);
            const client_key = (0, cuid_1.default)();
            let token = jwt_simple_1.default.encode((0, cuid_1.default)(), (0, cuid_1.default)());
            token = token.substring(0, 101) + "." + client_key;
            await this.acebase.ref("__tokens__/" + token).set({
                userKey: userKey,
            });
            delete credentials.password;
            let data = {
                ...credentials,
                key: userKey,
                role: obj.role,
                created_at: obj.created_at,
            };
            return Promise.resolve({
                data,
                token,
                client_key,
            });
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}
exports.default = Auth;
//# sourceMappingURL=auth.js.map