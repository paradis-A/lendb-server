//creates 1000 pets varies from dog and cat only
const { LenDB } = require("../dist");
const db = new LenDB("aggregate_test");

async function populate(){
	console.log("Executing Populate")
	await db.start();	
	await db.acebase.ref("pets").remove()
	let pets = ["cat","dog"];
	let promises = []
	for (let i = 1; i < 2001; i++) {
		let type = pets[Math.round(Math.random())]
		promises.push(db.Object("pets").assign({type,food: Math.round(Math.random())}).commit())
		console.log("Processing pet#" + i,"type:",type)
	}
	await Promise.all(promises)
	console.log("Pets count",await db.acebase.ref("pets").count())
	db.acebase.close()
	Promise.resolve(true)
}

populate()