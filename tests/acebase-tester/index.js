const {AceBase}= require("acebase")
;(async()=>{
    let db = new AceBase("atest")
    let user = await db.ref("users").push({name: "clarence"});
    await db.ref("users/" + user.key + "/posts").push({title: "my post"});
    await db.indexes.create("users/*/posts","title")
    let posts =  (await db.query("users/*/posts").filter("title","==","my post").get()).map(v=>v.val())
    let users =  (await db.query("users").get()).map(v=>v.val())
    console.log("-------POSTS-------")
    console.log(posts)
    console.log("-------USERS-------")
    console.log(users)
    console.log("-------INDEXES-------")
})()

