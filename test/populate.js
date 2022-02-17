//creates 1000 pets varies from dog and cat only
const { LenDB } = require("../dist");
const { ID } = require("acebase")
const cuid = require("cuid")
const db = new LenDB("aggregate_test");

async function populate(){
	console.log("Executing Populate")
	await db.start();	
	// await db.acebase.ref("pets").remove()
	await db.acebase.indexes.create("pets","type")
	await db.acebase.indexes.create("pets","key")
	let pets = ["cat","dog"];
	let petnodes = {}
	for (let i = 1; i < 2000; i++) {
		let type = pets[Math.round(Math.random())]
		const key = cuid()
		// await db.Object("pets").assign({type,food: Math.round(Math.random())}).commit()
		petnodes[key] = {key,type,food: Math.round(Math.random())}
	}
	await db.acebase.ref("pets").update(petnodes)
	console.log("Pets count",await db.acebase.ref("pets").count())
	Promise.resolve(true)
}

populate()