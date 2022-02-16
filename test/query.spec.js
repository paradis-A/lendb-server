var assert = require("assert");
const { LenDB } = require("../dist");
const db = new LenDB("aggregate_test", { logLevel: "error" });

describe(`Start Server`, function () {
    this.timeout(10000);
    it("Start Server", async () => {
        await db.start()
        assert.ok(true);
    });
});

describe(`Test Aggregate 100`, function () {
    this.timeout(10000);
    it("Watch aggregate performance over 100 records", async () => {
        let res = await db.Query("pets").aggregate("type",agg=>{
			agg.sum("food","FoodConsumed")
			agg.count("type","count")
		}).execute();
		console.log("Total Loaded:",res.data.length)
		console.log("Total Count:",res.count)
        assert.ok(true);
    });
});

describe(`Test Query 100`, function () {
    this.timeout(10000);
    it("Watch query performance over 100 records", async () => {
        let res = await db.Query("pets").execute({ limit: 100 });
		console.log("Total Loaded:",res.count)
		console.log("Total Count:",res.count)
        assert.ok(true);
    });
});

describe(`Test Raw Acebase Query 100`, function () {
    this.timeout(10000);
    it("Watch query performance over 100 records", async () => {
        let res = await db.acebase.query("pets").take(100).get()
		console.log("Total Loaded:",res.length)
		console.log("Total Count:",await db.acebase.query("pets").take(Infinity).count())
        assert.ok(true);
    });
});

describe(`Test Query 1000`, function () {
    this.timeout(10000);
    it("Watch query performance over 1000 records", async () => {
        // await db.start();
        let res = await db.Query("pets").execute({ limit: 1000 });
		console.log("Total Loaded:",res.data.length)
		console.log("Total Count:",res.count)
        assert.ok(true);
    });
});

describe(`Test Raw Acebase Query 1000`, function () {
    this.timeout(10000);
    it("Watch query performance over 1000 records", async () => {
        let res = await db.acebase.query("pets").take(1000).get()
		console.log("Total Loaded:",res.length)
		console.log("Total Count:",await db.acebase.query("pets").take(1000).count())
        assert.ok(true);
    });
});

describe(`Test Query 2000`, function () {
    this.timeout(10000);
    it("Watch query performance over 2000 records", async () => {
        // await db.start();
        let res = await db.Query("pets").execute({ limit: 2000 });
		console.log("Total Loaded:",res.data.length)
		console.log("Total Count:",res.count)
        assert.ok(true);
    });
});

describe(`Test Raw Query Query 2000`, function () {
    this.timeout(10000);
    it("Watch query performance over 2000 records", async () => {
        let res = await db.acebase.query("pets").take(2000).get()
		console.log("Total Loaded:",res.length)
		console.log("Total Count:",await db.acebase.query("pets").take(2000).count())
        assert.ok(true);
    });
});

