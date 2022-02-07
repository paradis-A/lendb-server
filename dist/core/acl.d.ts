export interface ACL {
    ref: string;
    read: ACLPermision;
    add: ACLPermision;
    update: ACLPermision;
    destroy: ACLPermision;
}
export interface ACLPermision {
    allow: boolean;
    fields: "*" | string[];
    level: "own" | "all";
    ownIdenfier: string;
}