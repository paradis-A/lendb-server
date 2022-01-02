import cuid from "cuid";
import { isDate, isObject } from "lodash";
export default function Normalize(data: any) {
    let res: any = {};
    if (isObject(data)) {
        let entries = Object.entries(data);
        for (const entry of entries) {
            const key = entry[0];
            const value = entry[1];
            if (isObject(value) && !isDate(value)) {
                let keys = Object.keys(value);
                let tempObj: any = {};
                if (keys.every((k) => cuid.isCuid(k))) {
                    tempObj = Object.values(value).map(t=>Normalize(t))
                } else {
                    tempObj = value;
                }
                // console.log(Normalize(tempObj))
                res[key] = tempObj
            } else {
                res[key] = value;
            }
        }
    }
    return res;
}

