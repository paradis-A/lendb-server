import { AceBase } from "acebase";
export default class Auth {
    protected acebase: AceBase;
    enabled: boolean;
    protected tokenExpiration: number;
    protected defaultRole: string;
    constructor(acebase: AceBase);
    SetDefaultRole(role: string): void;
    SetTokenExpiration(hours: number): void;
    Login(usernameOrEmail: string, password: string): Promise<{
        client_key: string;
        token: string;
        data: any;
        expiration: number;
    }>;
    AuthenticateWS(token: string): Promise<{
        key: string;
        token: string;
    }>;
    VerifyWSKey(): Promise<void>;
    Authenticate(token: string): Promise<{
        data: any;
        client_key: string;
        token: string;
        expiration: number;
    }>;
    static UserList(): void;
    GetUser(token: string): Promise<Account>;
    Logout(token: any): Promise<string>;
    isValidEmail(email: string): RegExpMatchArray;
    Register(credentials: any): Promise<{
        data: any;
        expiration: number;
        token: string;
        client_key: string;
    }>;
}
export interface Account {
    key?: string;
    username?: string;
    email?: string;
    role?: string;
}
