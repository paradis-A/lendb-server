import { AceBase } from "acebase";
export default class Auth {
    protected acebase: AceBase;
    enabled: boolean;
    protected tokenExpiration: number;
    protected updateTokenMinutes: number;
    protected defaultRole: string;
    constructor(acebase: AceBase);
    SetDefaultRole(role: string): void;
    SetTokenExpiration(hours: number): void;
    Login(usernameOrEmail: string, password: string): Promise<any>;
    LoginWithToken(token: string): Promise<any>;
    static UserList(): void;
    GetUser(token: string): Promise<Account>;
    Logout(token: string): Promise<string>;
    Register(username: string, password: string, email: string, details: any): Promise<void>;
}
export interface Account {
    key?: string;
    username?: string;
    email?: string;
    role?: string;
}
