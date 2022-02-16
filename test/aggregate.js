var assert = require("assert");
const { LenDB } = require("../dist");
const db = new LenDB("aggregate_test", { logLevel: "error" });
describe("aggregate", async function () {
    describe(`Test Aggregate`, function () {
		this.timeout(10000)
        it("Should get sum value of cat foods and dog foods with total of 1000 when summed both", async () => {
			await db.start();
			let queryRes = await db.Query("pets").aggregate("type",g=>{
				g.count("type","PetType")
				g.sum("food","FoodConsumed")
				g.avg("food","AvgFood")
			}).execute()
			const cat = queryRes.data.find(t=>t.type=="cat")
			const dog = queryRes.data.find(t=>t.type=="dog")
			console.log(cat)
			console.log(dog)
			assert.ok(cat,dog)
        });
    });
});
