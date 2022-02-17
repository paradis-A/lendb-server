const { AceBase, ID } = require("acebase");
var assert = require("assert");
const db = new AceBase("indextest", { logLevel: "error" });
describe("Insert Non-indexed", function () {
    this.timeout(Infinity);
    it("",async function () {
        let pet = ["cat", "dog"];
        let data = {};
        for (let index = 1; index < 2001; index++) {
            data[ID.generate()] = { pet: pet[Math.round(Math.random())], pet2: pet[Math.round(Math.random())] };
        }
        await db.ref("no_index").update(data);
        assert.ok(true);
    });
});

describe("Insert Indexed", function () {
    this.timeout(Infinity);
    it("",async function () {
        await db.indexes.create("indexed", "pet");
        await db.indexes.create("indexed", "pet2");
        let pet = ["cat", "dog"];
        let data = {};
        for (let index = 1; index < 2001; index++) {
            data[ID.generate()] = { pet: pet[Math.round(Math.random())], pet2: pet[Math.round(Math.random())] };
        }
        await db.ref("indexed").update(data);
        assert.ok(true);
    });
});

describe("Get count of child (non-indexed)",function(){
    this.timeout(Infinity)
    it("",async function () {
        console.log("     Childs: ",await db.query("no_index").filter("pet", "in", ["cat", "dog"]).count())
        assert.ok(true);
    });
})

describe("Get count of child (indexed)",function(){
    this.timeout(Infinity)
    it("",async function () {
        console.log("     Childs: ",await db.query("indexed").filter("pet", "in", ["cat", "dog"]).count())
        assert.ok(true);
    });
})

describe("Non-Indexed instance.ref Foreach performance", function () {
    this.timeout(Infinity);
    it("",async function () {
        await db
            .ref("no_index")
            .forEach((snap) => {
				return true
			});
        assert.ok(true);
    });
});

describe("Indexed instance.ref Foreach performance", function () {
    this.timeout(Infinity);
    it("",async function () {
        await db
            .ref("indexed")
            .forEach((snap) => {
				return true
			});
        assert.ok(true);
    });
});

describe("Non-Indexed Query Foreach performance", function () {
    this.timeout(Infinity);
    it("",async function () {
        await db
            .query("no_index")
            .filter("pet", "in", ["cat", "dog"])
            .forEach((snap) => {
				return true
			});
        assert.ok(true);
    });
});

describe("Indexed Query Foreach performance", function () {
    this.timeout(Infinity);
    it("",async function () {
        await db
            .query("indexed")
            .filter("pet", "in", ["cat", "dog"])
            .forEach((snap) => {
				return true
			});
        assert.ok(true);
    });
});
