var assert = require("assert");
const { LenDB } = require("../dist");
const db = new LenDB("searchtest",{logLevel: "error"});


describe("search",function(){
    describe(`Search all fields with text "li"`, function () {
        it("should return 3 rows", async () => {
            await db.start();
            await db.acebase.ref("persons").remove()
            await db.Object("persons").assign({name: "lisardo", address: "liliam street"}).commit()
            await db.Object("persons").assign({name: "moli dork", address: "some address"}).commit()
            await db.Object("persons").assign({name: "hilo bank", address: "soma pere street"}).commit()
            await db.Object("persons").assign({name: "olivia merc", address: "soma pere street"}).commit()
            await db.Object("persons").assign({name: "marco mado", address: "soma pere street"}).commit()
            let data = await db.Query("persons").search("li").fetch();
            assert.equal(data.count, 3);
        });
    });
})