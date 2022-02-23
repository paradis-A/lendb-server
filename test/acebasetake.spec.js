const { AceBase, ID } = require("acebase");
var assert = require("assert");
const db = new AceBase("take_test", { logLevel: "error" });
const alphabet = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
];
const updates = {};

// for (let i = 0; i < 2000; i++) {
//     updates[ID.generate()] = { letter: alphabet[Math.floor(Math.random() * 26)] };
// }
// describe("generate 2000 a-z non-indexed", function () {
//     this.timeout(Infinity);
//     it("", async function () {
//         await db.ref("sort").update(updates);
//         assert.ok(true);
//     });
// });

// describe("generate 2000 a-z indexed", function () {
//     this.timeout(Infinity);
//     it("", async function () {
//         await db.indexes.create("sort_indexed", "letter");
//         await db.ref("sort_indexed").update(updates);
//         assert.ok(true);
//     });
// });
describe("load all sort letter by a-z (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter", true).take(Infinity).get();
        assert.ok(true);
    });
});

describe("load all sort letter by z-a (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter").take(Infinity).get();
        assert.ok(true);
    });
});

describe("load first 100 sort letter by a-z (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter", true).take(100).get();
        assert.ok(true);
    });
});

describe("load second 100 sort letter by a-z (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter", true).skip(100).take(100).get();
        assert.ok(true);
    });
});

describe("load third 100 sort letter by a-z (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter", true).skip(200).take(100).get();
        assert.ok(true);
    });
});

describe("load first 100 sort letter by z-a (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter").take(100).get();
        assert.ok(true);
    });
});

describe("load second 100 sort letter by z-a (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter").skip(100).take(100).get();
        assert.ok(true);
    });
});

describe("load third 100 sort letter by z-a (non-indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort").sort("letter").skip(200).take(100).get();
        assert.ok(true);
    });
});

describe("load all sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter", true).take(Infinity).get();
        assert.ok(true);
    });
});

describe("load all sort letter by z-a (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter").take(Infinity).get();
        assert.ok(true);
    });
});

describe("load first 100 sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter", true).take(100).get();
        assert.ok(true);
    });
});

describe("load second 100 sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter", true).skip(100).take(100).get();
        assert.ok(true);
    });
});

describe("load third 100 sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter", true).skip(200).take(100).get();
        assert.ok(true);
    });
});


describe("load first 100 sort letter by z-a (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter").take(100).get();
        assert.ok(true);
    });
});

describe("load second 100 sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter").skip(100).take(100).get();
        assert.ok(true);
    });
});

describe("load third 100 sort letter by a-z (indexed)", function () {
    this.timeout(Infinity);
    it("", async function () {
        await db.query("sort_indexed").sort("letter").skip(200).take(100).get();
        assert.ok(true);
    });
});
