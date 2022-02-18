import {AceBase} from "acebase"
export interface ACL {
    key?: string;
    ref: string;
    role: string;
    read?: ACLPermision;
    add?: ACLPermision;
    update?: ACLPermision;
    destroy?: ACLPermision;
}

export interface ACLPermision {
    allow?: boolean;
    fields?: "*" | string[];
    level?: "own" | "all";
    ownIdenfier?: string;
}



