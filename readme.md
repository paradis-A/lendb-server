### Powered by:  [Acebase](https://github.com/appy-one/acebase)
`LenDB Server` is a wrapper around another database called Acebase that acts like a client. Think of it as parse-server and acebase (alternative to firebase) had baby then voilah!!! `Hello World!!` LenDB is born.

`LenDB Server` is a real-time database alternative to *Firebase* but instead of listening and receive the updated row/node, Stored objects in LenDB Server upon changes it auto propagates the changes on your live data. Although LenDB is like `yet another database wrapper(actually not)`, With LenDB Browser Client, LenDB is designed for reactive front-end frameworks like Svelte. etc.

## Installing

	npm install lendb-server --save-dev
		
## Getting Started
Creating a local acebase database and starting the server.
```javascript
const { LenDB } = require("lendb-server")
const db = new LenDB("mdb")
db.start(5757,"localhost").then(()=>{
	//your code goes here
})
//or if you prefer wrapped in async
await db.start(5757,"localhost") // params are options and will default to 5757 and loclhost
//your code goes here.
```

The above code will start create or load if exists an acebase database in your root directory named  with the name of `my_db.acebase`.

**Options**
As much as possible we want to serve the data across clients and servers with the fastest available server available (quite elegant) for node.js the why to serve the database, the http and ws runs on top of [hyper-express](https://www.npmjs.com/package/hyper-express).

Basically upon starting the server the only option can be supplied as argument is the port and host. 
```javascript
db.start(my_port,my_host)
```
But if you want to extend either work like adding routes or middlewares to  hyper-express. You can optionally add endpoints before calling .start().
```javascript
db.Server.post("/my_custom_endpont",(req,res)=>{
	res.status(418)//I'm a teapot
	res.json({message:  "awesome"})
})
db.Server.ws(,,,) //your custom ws endpoint
db.start() // defaults to http://localhost:5757
```
You can also pass acebase instance options.
```javascript
	const db = new LenDB("mdb",{ logLevel: 'log', storage: { path: '.' } })
```
## CRUD
The crud operation are similar to the of  [LenDB Browser Client Crud Operations](https://www.npmjs.com/package/lendb-client) but designed to called in an event hook or to listen changes and in the server side to decorate stored/return data to the client.

**INSERTING OBJECT TO A COLLECTION**
```javascript
const  person = db.Object("persons")
person.name = "Chad Wick"
person.age = "15"
person.pet = {
	type:  "dog",
	name:  "lenlen"
}
await person.commit()

//OR SUPPLYING WITH OBJECT INSTEAD OF DOT-NOTATION

const  person = db.Object("persons")
let info = {
	name: "Jojo Bizart",
	age: 25.
	pet: {
		type: "bird",
		name: "lucy"
	}
}
await person.assign(info).commit()


```
**UPDATING OBJECT FROM A COLLECTION**
```javascript
const  person = db.Object("persons",some_key);
person.name = "Jown Wick";
person.pet = {
	type:  "cat",
	name:  "bong"
}
await person.commit()

//OR puting directly to key property of the object

const  person = db.Object("persons");
person.key = some_valid_key;
person.name = "John Wicked Killer";
person.pet = {
	type:  "cat",
	name:  "bong"
}
await person.commit()
```
**INSERTING OR UPDATING SINGULAR OBJECT (NON-COLLECTION)**
```javascript
const settings = db.Object("game_settings",true)
settings.language = "en";
settings.difficulty = "HARD";
settings.deepNested = {
	hello: "world"
}
await settings.commit()
```
**RETRIEVING OBJECT FROM A COLLECTION**
```javascript
const person = await db.Object("persons",some_cuid).load()
console.log(person.name) // OUTPUTS: "John Wicked Killer"
```
**RETRIEVING SINGULAR (NON-COLLECTION)**
```javascript
const settings = await db.Object("game_settings",true).load()
```
**RETRIEVING NESTED SINGULAR OBJECT**
```javascript
const hello_nested = await db.Object("game_settings/deepNested/hello",true).load()
console.log(hello_nested) //outputs world!
```
**DESTROYING SINGULAR OBJECT OR FROM A COLLECTION**
```javascript
await db.Object("game_settings",true).destroy()

//OR for collectiong

await db.Object("persons",some_cuid).destroy()
```
**QUERYING**
Basic Usage.
```javascript
const result = await db.Query("persons")
.execute({hook: false})
//OUTPUTS:
//{
//	data: [
//		.....
//	],
//	count: 2
//}
```
**COMPOUND QUERIES AND AGGREGATES**
For searching and getting avg,max,min or sum.
```js
const searchQuery = db.Query("persons")
let searchresult = await searchQuery .compound(query=>{
	query.like("name","John")
	query.like("name","Wick")
	query.like("pet/name","bo")
}).eq("age",25)
.execute()

const aggregateQuery = db.Query("persons")
let aggregateResult = await aggregateQuery.aggregate("name",agg=>{
	agg.ave("age","AverageAge")
	agg.count("name","CountGroup")
}).execute()
```
**LISTENING TO REAL-TIME CHANGES**
```js
//with the given example above
searchQuery.on("add",(data)=>{
	//LOGIC GOES HERE
}).execute()
searchQuery.on("update",(data)=>{
	//LOGIC GOES HERE
}).execute()
searchQuery.on("destroy",(data)=>{
	//LOGIC GOES HERE
}).execute()

//To unsubscribe
searchQuery.unsubscribe()
```
Warning: Do not use subscriptions inside hooks.

**CRUD HOOKS**
Decorate the data,call external http services like notifications email , execute your whatever you want before and after on a specific crud operations.
**BEFORE ADD HOOK**
Execute custom code before new object stored.
```javascript
db.hook.beforeAdd("persons",async (data, req,res)=>{
	//req and res can only be accessed when the object is commited from LenDB Client otherwise undefined
	if(data.name == "John Wicked Killer")
	await notify_security();
	data.status = "Wanted"
	data.occupation = "Assassin"
	return data
})
```
**AFTER ADD HOOK**
Execute custom code after new object stored. The customized data will be the value to be returned
```javascript
db.hook.beforeAdd("persons",async (data, req,res)=>{
	//req and res can only be accessed when the object is commited from LenDB Client otherwise undefined
	delete data.occupation = "Assassin"
	delete data.status = "Wanted"
	await smsApi.send("A person has been updated!")
	return data
})
```
**BEFORE AND AFTER UPDATE HOOK AND SO OTHERS**
```javascript
	db.hook.beforeUpdate("persons",(data,req,res)=>{
		//LOGIC GOES HERE
		return data
	})
	db.hook.afterUpdate("persons",(data,req,res)=>{
		//LOGIC GOES HERE
		return data
	})
	
	//LOAD HOOKS
	db.hook.beforeLoad("persons",(data,req,res)=>{
		//LOGIC GOES HERE
	})
	db.hook.afterLoad("persons",(data,req,res)=>{
		//LOGIC GOES HERE
	})

	//DESTROY HOOKS
	db.hook.beforeDestroy("persons",(data,req,res)=>{
		//LOGIC GOES HERE
	})
	db.hook.afterDestroy("persons",(data,req,res)=>{
		//LOGIC GOES HERE
	})
	
	//QUERY HOOKS
	db.hook.beforeFind("persons",(query,req,res)=>{
		//LOGIC GOES HERE
		query.eq("occupation","assasin")
		return query
	})
	db.hook.afterFind("persons",(data,req,res)=>{
		//LOGIC GOES HERE
	})
```

## AUTH (todo)
**AUTH HOOKS (todo)**

Checkout [Acebase](https://github.com/appy-one/acebase) the best Firebase alternative that you can host in your premises.

**Plans for Research and Development**
 - Gun.js storage adapter (peer to peer replication)
 - Third Party Storage like AWS S3
 - DBaaS featuring  [Acebase](https://github.com/appy-one/acebase)

**Disclaimer**
This is current at early development stage. You are responsible for your action, if you use it in production as this early stage of development.

**Sponsoring**
Let me know if you using LenDB. Please consider donating to this project, Help me buy my own `Laptop`.

 - [Buy me coffee](https://ko-fi.com/paradis)
