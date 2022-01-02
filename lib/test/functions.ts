function toWildCardPath(ref:string){
    let temp =  ref.split("/").map(r=>{
        return r == "cuid" ? "*" : r
    }).join("/")
}

console.log(toWildCardPath("hello/world/cuid/test/cuid"))