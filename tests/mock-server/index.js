const {LenDB} = require("../../dist")
const db = new LenDB("test");
// db.hook.beforeFind("employees",(async query=>{
//     console.log("_________THERE'S THE hook before find! nice!!!_______")
// }))
// db.hook.afterFind("employees",(async query=>{
//     console.log("_________THERE'S THE hook after find! fabolous!!!_______")
// }))

// db.hook.beforeAdd("employees",data=>{
//     console.log("_________THERE'S THE hook before add! nice!!!_______")
// })

// db.hook.afterAdd("employees",data=>{
//     console.log("_________THERE'S THE hook after add! fabolous!!!_______")
// })

// db.hook.beforeUpdate("employees",data=>{
//     console.log("_________THERE'S THE hook before update! nice!!!_______")
// })

// db.hook.afterUpdate("employees",data=>{
//     console.log("_________THERE'S THE hook after update! fabolous!!!_______")
// })


db.start()
    .then(async (r) => {
        try {
            // // let employeeQuery = db.Query("employees");
            // // let queryRes = await employeeQuery.fetch({hook: true})
            // // console.log(queryRes)
            // // let employeeInsert = db.Object("employees")
            // // employeeInsert.name = "Reinalyn Ganot"
            // // console.log(await employeeInsert.commit(false,true))
            // // let employeeUpdate = db.Object("employees","ckxsl1rck000088ww94l1a1r5" )
            // // employeeUpdate.name = "John Bon Tempo"
            // // console.log(await employeeUpdate.commit({hook:true}))
            // // let employeeLoad = await db.Object("employees").load()
            // let singular = db.Object("singulartest",true)
            // singular.someObject = {
            //     hello: "world"
            // }
            // // singular.additionalProps = true
            // singular.thisIs = "singular"
            // await singular.commit({hook:true})
            // let singularLoad =  await db.Object("singulartest/someObject/hello",true).load() 
            // console.log(singularLoad)
            // // singular.additionalProps = true
            // // const singularRes2 = await singular.commit({hook:true})
            // // console.log(singularRes2)
            
            // let user =  db.Object("users")
            // user.name = "Clarence D. Eda"
            // let post = db.Object(`users/${user.key}/posts`)
            // post.title = "sdas  asds sdsa"
            
            // let query = await db.Query("users").watch(ev=>{
            //     ev.onAdd(data=>{
            //         console.log("Some Data Added!",data)
            //     })
            //     ev.onUpdate(data=>{
            //         console.log("Some Data Updated",data)
            //     })
            // })
            // await user.commit({emit: true})
            // await post.commit()
            // console.log(query)
            // let addPosttoUser = db.Object("/users/ckxvgr2ib0000b8wwhaib1hwo/posts/")
            // addPosttoUser.title = "Start Wars"
            // await addPosttoUser.commit()
            // console.log(await db.Query("/users/ckxvgr2ib0000b8wwhaib1hwo/posts").fetch())
            // await user.destroy()
            // let posts =  (await db.acebase.ref("users/*/posts").query().get()).map(v=>v.val())
            // let posts =  (await db.acebase.query("users/*/posts").filter("key","!=",null).get()).map(v=>v.val())
            // console.log(posts)
            // let user = await db.acebase.ref("users/" + ID.generate()).set({name: "Clarence D. Eda"});
            // await db.acebase.ref("users/" + user.key + "/posts/" + ID.generate()).set({name: "my post"});
            // await db.acebase.indexes.create("users/*/posts","name")
            // let posts =  (await db.acebase.query("users/*/posts").filter("name","==","my post").get()).map(v=>v.val())
            // let users =  (await db.acebase.query("users").get()).map(v=>v.val())
            // console.log("-------POSTS-------")
            // console.log(posts)
            // console.log("-------USERS-------")
            // console.log(users)


        } catch (error) {
            console.log(error);
        }
    })
    .catch((e) => {
        // console.log(e);
    });