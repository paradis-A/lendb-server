export { default as LenObject } from "./object";
export { default as Serializer } from "./serializer";
export { default as LenQuery } from "./query";
export { default as Hook } from "./hook";
export { default as Auth } from "./auth";
export interface ObjectLink {
    target: string;
    source: string;
    identity: string;
    fields: {
        targetField: string;
        sourceField: string;
    }[];
}
