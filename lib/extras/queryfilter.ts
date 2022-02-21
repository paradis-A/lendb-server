export default class iLenQueryFilter{
    filters: any = {};
    sorts: { [any: string]: "ASC" | "DESC" | null } = {};
    skip: number = 0;
    limit: number = 100;
    page: number = 0;
    
    like(field: string, value: any, pattern: "both" | "left" | "right") {
        let val = "*" + value + "*";
        if (pattern == "left") val = "*" + value;
        if (pattern == "right") val = value + "*";
        this.filters[field + "[like]"] = val;
        return this;
    }

    notLike(field: string, value: string, pattern: "both" | "left" | "right") {
        let val = "*" + value + "*";
        if (pattern == "left") val = "*" + value;
        if (pattern == "right") val = value + "*";
        this.filters[field + "[!like]"] = val;
        return this;
    }

    gt(field: string, value: any) {
        this.filters[field + "[>]"] = value;
        return this;
    }

    gte(field: string, value: any) {
        this.filters[field + "[>=]"] = value;
        return this;
    }

    between(field: string, value: any) {
        this.filters[field + "[between]"] = value;
        return this;
    }

    notBetween(field: string, value: any) {
        this.filters[field + "[!between]"] = value;
        return this;
    }

    lt(field: string, value: any) {
        this.filters[field + "[<]"] = value;
        return this;
    }

    lte(field: string, value: any) {
        this.filters[field + "[<=]"] = value;
        return this;
    }

    eq(field: string, value: any) {
        this.filters[field + "[==]"] = value;
        return this;
    }

    notEq(field: string, value: any) {
        this.filters[field + "[!=]"] = value;
        return this;
    }

    in(field: string, value: any[]) {
        this.filters[field + "[in]"] = value;
        return this;
    }

    notIn(field: string, value: any[]) {
        this.filters[field + "[!in]"] = value;
        return this;
    }

    matches(field: string, value: any[]) {
        this.filters[field + "[matches]"] = value;
        return this;
    }

    notMatches(field: string, value: any[]) {
        this.filters[field + "[!matches]"] = value;
        return this;
    }

    has(field: string, value: any[]) {
        this.filters[field + "[has]"] = value;
        return this;
    }

    notHas(field: string, value: any[]) {
        this.filters[field]["!has"] = value;
        return this;
    }

    contains(field: string, value: any[]) {
        this.filters[field]["contains"] = value;
        return this;
    }

    notContains(field: string, value: any[]) {
        this.filters[field]["!contains"] = value;
        return this;
    }
}
