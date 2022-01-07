export { default as LenObject } from "./object";
export { default as Serializer } from "./serializer";
//we dont want to export this as class to pass emitter
export { default as LenQuery } from "./query";
export { default as Hook } from "./hook";
export { default as Auth } from "./auth";
export interface ObjectLink {
    target: string;
    source: string;
    identity: string;
    fields: {targetField: string, sourceField: string}[];
};
