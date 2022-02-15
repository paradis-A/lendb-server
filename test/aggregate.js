var assert = require("assert");
const { LenDB } = require("../dist");
const db = new LenDB("aggregate_test", { logLevel: "error" });
describe("aggregate", async function () {
	
    describe(`Test Aggregate`, function () {
        it("Should get sum of cat foods", async () => {
			await db.start();
            await db.acebase.ref("pets").remove();
            let pet1 =  db.Object("pets")
            let pet2 =  db.Object("pets")
            let pet3 =  db.Object("pets")
            // await pet.assign({name: "jojo"}).commit()
            // let person = db.Object("persons").assign({name: "Clarence",pet_id: pet.key})
            // await person.commit()
            // let result = await db.Object("persons", person.key).load()
            // assert.equal(result.pet_name, "jojo");
			await pet1.assign({type: "cat",food: 5}).commit()
			await pet2.assign({type: "dog",food: 5}).commit()
			await pet3.assign({type: "cat",food: 3}).commit()
			let queryRes = await db.Query("pets").aggregate("type",g=>{
				g.count("type","PetType")
				g.sum("food","FoodConsumed")
				g.avg("food","AvgFood")
			}).execute()
			const cat = queryRes.data.find(t=>t.type=="cat")
			const dog = queryRes.data.find(t=>t.type=="dog")
			console.log(cat)
			assert.equal(cat.FoodConsumed,8);
        });
    });
});
