const { AceBase } = require("acebase");
const db = new AceBase("ref_watch_test", {transactions: {maxAge: 1,log:true,noWait: true}});

db.ready(async ()=>{
	let starttime = Date.now()
	await db.ref("hello/test").set({hello: "world",bye:"batman"})
	await db.ref("hello/test").update({hello: "doug",bye:"ironamn"})
	await db.ref("hello/test").update({hello: "cat"})
	await db.ref("hello/test").update({bye:"batman"})
	await db.ref("hello/test").update({hello: "george"})
	await db.ref("hello/test").update({bye:"superman"})
	await db.ref("hello/test").set({iam:"supermanh"})
	console.log((await db.ref("hello/test").getCanges(new Date(starttime))).changes.map(c=>{
		return {new: c.value, old: c.previous}
	}))
})


