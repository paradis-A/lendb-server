var assert = require("assert");
const { LenDB } = require("../dist");
const db = new LenDB("linktest", { logLevel: "error" });
describe("link", async function () {
    describe(`Join the fields by using ObjectLink`, function () {
        it("Should much source field value of target", async () => {
            db.ObjectLink({
                target: "persons",
                source: "pets",
                identity: "pet_id",
                fields: [
                    ["pet_name","name"]
                ]
            });
            await db.start();
            await db.acebase.ref("persons").remove();
            await db.acebase.ref("pets").remove();
            let pet =  db.Object("pets")
            await pet.assign({name: "jojo"}).commit()
            let person = db.Object("persons").assign({name: "Clarence",pet_id: pet.key})
            await person.commit()
            let result = await db.Object("persons", person.key).load()
            console.log(result)
            assert.equal(result.pet_name, "jojo");
        });
    });
});
