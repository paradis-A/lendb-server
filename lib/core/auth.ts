import { AceBase } from "acebase";
import jwt from "jwt-simple"
import cuid from "cuid";
import {isObject} from "lodash"
export default class Auth {
    protected acebase: AceBase
    public enabled = false
    protected tokenExpiration: number = 100000; //100000 hours
    protected updateTokenMinutes: number = 1440 //60 mins X 24 hours = 1 day
    protected defaultRole: string = "user"
    // protected req: Request
    // protected res: Response
    constructor(acebase: AceBase){
        this.acebase = acebase
    }
    
    SetDefaultRole(role: string) {
        this.defaultRole = role;
    }

    SetTokenExpiration(hours: number) {
        this.tokenExpiration = hours;
    }

    async Login(usernameOrEmail: string, password: string) {
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
                let userinfo: any;
                if (isEmail)
                    userinfo = (
                        await this.acebase
                            .query("__users__")
                            .filter("email", "==", usernameOrEmail)
                            .get()
                    ).map((v) => v)[0];
                if (isUsername)
                    userinfo = (
                        await this.acebase
                            .query("__users__")
                            .filter("username", "==", usernameOrEmail)
                            .get()
                    ).map((v) => v.val())[0];
                let decodedPass = jwt.decode(
                    userinfo.password,
                    userinfo.jwtKey
                );
                if (decodedPass == password) {
                    const token = jwt.encode(password, cuid());
                    const tokenKey = cuid()
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
                } else {
                    return Promise.reject(
                        "Error: username/email and password does not match."
                    );
                }
            } else {
                return Promise.reject(
                    "Error: username/email and password does not match."
                );
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async LoginWithToken(token: string) {
        try {
            const res = (
                await this.acebase
                    .query("__token__")
                    .filter("token", "==", token)
                    .get()
            ).map((v) => v.val())[0];
            if(res){
                if(res?.expiration <= Date.now()){
                    return Promise.reject("Error: Access token expired")
                }else{
                    let userID = res?.userID
                    const tokenKey = cuid()
                    let userinfo = (await this.acebase.ref("__users__/" + userID).get()).val()
                    const newToken = jwt.encode(userinfo.password,cuid());
                    delete userinfo.password
                    delete userinfo.jwtKey
                    await this.acebase.ref("__tokens__/" + tokenKey).set({
                        token: newToken,
                        key: tokenKey,
                        userID: userinfo?.id
                    })
                    return Promise.resolve({
                        token: newToken,
                        ...userinfo
                    })
                }
            }else{
                return Promise.reject("Error: Access token invalid.")
            }
        } catch (error) {}
    }

    static UserList() {

    }
    
    async GetUser(token: string): Promise<Account> {
        let res = (
            await this.acebase
                .query("__tokens__")
                .filter("token", "==", token)
                .get()
        ).map((snap) => {
            return snap.val();
        });
        if (res.length) {
            let userToken = res[0];
            if (userToken?.userID) {
                let userDetails = (
                    await this.acebase
                        .ref("__users__/" + userToken.userID)
                        .get()
                ).val();
                delete userDetails.password;
                delete userDetails.jwtKey;
                return Promise.resolve(userDetails);
            }
        }
        return Promise.reject("Not found");
    }



    async Logout(token:string){
        try {
            let key = (await this.acebase.query("__tokens__").filter("token","==",token).get())[0]?.key;
            if(key){
                await this.acebase.ref("__tokens__/" + key).remove();
            }
            return Promise.resolve("Successfully logged out.")
        } catch (error) {
            throw new Error(error)
        }
    }

    async Register(
        username: string,
        password: string,
        email: string,
        details: any
    ) {
        this.acebase = global.database;
        let jwtKey = cuid();
        let tokenizedPassword = jwt.encode(password, jwtKey);
        let obj: any = {
            email,
            username,
            password: tokenizedPassword,
            role: this.defaultRole,
            jwtKey,
        };

        const userID = cuid()
        if (isObject(details))
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
        const token = jwt.encode(password, cuid());
        const tokenKey = cuid()
        await this.acebase
            .ref("__tokens__/" + tokenKey )
            .set({ key: tokenKey ,userID, token, expiration });
    }
}

export interface Account{
    key?: string,
    username?: string,
    email?: string,
    role?: string
}