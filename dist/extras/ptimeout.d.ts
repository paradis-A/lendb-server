export declare class TimeoutError extends Error {
    constructor(message: any);
}
export default function pTimeout(promise: any, milliseconds: any, fallback: any, options: any): Promise<unknown>;
