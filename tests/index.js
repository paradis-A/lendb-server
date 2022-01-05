
let data = {}

function wrapper(cb){
    let catcher = {}
    cb(catcher)
    data = catcher
    return catcher
}

wrapper((e)=>{
    e.hello = "world"
    return e
})

data //=