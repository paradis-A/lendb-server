const {LenDB} = require("../../dist")
const db = new LenDB("test");
db.hook.beforeFind("employees",(async query=>{
    console.log("_________THERE'S THE hook before find! nice!!!_______")
}))
db.hook.afterFind("employees",(async query=>{
    console.log("_________THERE'S THE hook after find! fabolous!!!_______")
}))

db.hook.beforeAdd("employees",data=>{
    console.log("_________THERE'S THE hook before add! nice!!!_______")
})

db.hook.afterAdd("employees",data=>{
    console.log("_________THERE'S THE hook after add! fabolous!!!_______")
})

db.hook.beforeUpdate("employees",data=>{
    console.log("_________THERE'S THE hook before update! nice!!!_______")
})

db.hook.afterUpdate("employees",data=>{
    console.log("_________THERE'S THE hook after update! fabolous!!!_______")
})


db.start()
    .then(async (r) => {
        try {
            let emp = db.Object("employees")
            emp.name = "test"
            await emp.commit()
        } catch (error) {
            console.log(error);
        }
    })
    .catch((e) => {
        // console.log(e);
    });