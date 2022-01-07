"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_simple_1 = __importDefault(require("jwt-simple"));
const cuid_1 = __importDefault(require("cuid"));
const lodash_1 = require("lodash");
class Auth {
    acebase;
    enabled = false;
    tokenExpiration = 100000; //100000 hours
    updateTokenMinutes = 1440; //60 mins X 24 hours = 1 day
    defaultRole = "user";
    // protected req: Request
    // protected res: Response
    constructor(acebase) {
        this.acebase = acebase;
    }
    SetDefaultRole(role) {
        this.defaultRole = role;
    }
    SetTokenExpiration(hours) {
        this.tokenExpiration = hours;
    }
    async Login(usernameOrEmail, password) {
        try {
            let isEmail = await this.acebase
                .query("__users__")
                .filter("email", "==", usernameOrEmail)
                .exists();
            let isUsername = await this.acebase
                .query("__users__")
                .filter("username", "==", usernameOrEmail)
                .exists();
            if (isEmail || isUsername) {
                let userinfo;
                if (isEmail)
                    userinfo = (await this.acebase
                        .query("__users__")
                        .filter("email", "==", usernameOrEmail)
                        .get()).map((v) => v)[0];
                if (isUsername)
                    userinfo = (await this.acebase
                        .query("__users__")
                        .filter("username", "==", usernameOrEmail)
                        .get()).map((v) => v.val())[0];
                let decodedPass = jwt_simple_1.default.decode(userinfo.password, userinfo.jwtKey);
                if (decodedPass == password) {
                    const token = jwt_simple_1.default.encode(password, (0, cuid_1.default)());
                    const tokenKey = (0, cuid_1.default)();
                    await this.acebase.ref("__tokens__/" + tokenKey).set({
                        key: tokenKey,
                        userID: userinfo.id,
                        token,
                        expiration: Date.now() * this.tokenExpiration,
                    });
                    delete userinfo.password;
                    delete userinfo.jwtKey;
                    return Promise.resolve({
                        token,
                        ...userinfo,
                    });
                }
                else {
                    return Promise.reject("Error: username/email and password does not match.");
                }
            }
            else {
                return Promise.reject("Error: username/email and password does not match.");
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async LoginWithToken(token) {
        try {
            const res = (await this.acebase
                .query("__token__")
                .filter("token", "==", token)
                .get()).map((v) => v.val())[0];
            if (res) {
                if (res?.expiration <= Date.now()) {
                    return Promise.reject("Error: Access token expired");
                }
                else {
                    let userID = res?.userID;
                    const tokenKey = (0, cuid_1.default)();
                    let userinfo = (await this.acebase.ref("__users__/" + userID).get()).val();
                    const newToken = jwt_simple_1.default.encode(userinfo.password, (0, cuid_1.default)());
                    delete userinfo.password;
                    delete userinfo.jwtKey;
                    await this.acebase.ref("__tokens__/" + tokenKey).set({
                        token: newToken,
                        key: tokenKey,
                        userID: userinfo?.id
                    });
                    return Promise.resolve({
                        token: newToken,
                        ...userinfo
                    });
                }
            }
            else {
                return Promise.reject("Error: Access token invalid.");
            }
        }
        catch (error) { }
    }
    static UserList() {
    }
    async GetUser(token) {
        let res = (await this.acebase
            .query("__tokens__")
            .filter("token", "==", token)
            .get()).map((snap) => {
            return snap.val();
        });
        if (res.length) {
            let userToken = res[0];
            if (userToken?.userID) {
                let userDetails = (await this.acebase
                    .ref("__users__/" + userToken.userID)
                    .get()).val();
                delete userDetails.password;
                delete userDetails.jwtKey;
                return Promise.resolve(userDetails);
            }
        }
        return Promise.reject("Not found");
    }
    async Logout(token) {
        try {
            let key = (await this.acebase.query("__tokens__").filter("token", "==", token).get())[0]?.key;
            if (key) {
                await this.acebase.ref("__tokens__/" + key).remove();
            }
            return Promise.resolve("Successfully logged out.");
        }
        catch (error) {
            throw new Error(error);
        }
    }
    async Register(username, password, email, details) {
        this.acebase = global.database;
        let jwtKey = (0, cuid_1.default)();
        let tokenizedPassword = jwt_simple_1.default.encode(password, jwtKey);
        let obj = {
            email,
            username,
            password: tokenizedPassword,
            role: this.defaultRole,
            jwtKey,
        };
        const userID = (0, cuid_1.default)();
        if ((0, lodash_1.isObject)(details))
            obj = {
                key: userID,
                email,
                username,
                password: tokenizedPassword,
                jwtKey,
                ...details,
                created_at: Date.now(),
            };
        await this.acebase.ref("__users__/" + userID).set(obj);
        const expiration = Date.now() * this.tokenExpiration;
        const token = jwt_simple_1.default.encode(password, (0, cuid_1.default)());
        const tokenKey = (0, cuid_1.default)();
        await this.acebase
            .ref("__tokens__/" + tokenKey)
            .set({ key: tokenKey, userID, token, expiration });
    }
}
exports.default = Auth;
//# sourceMappingURL=auth.js.map