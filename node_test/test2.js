import * as bns from "../main.js";

const rpc = new bns.banani.RPC("https://kaliumapi.appditto.com/api");

const resolver = new bns.Resolver(rpc, { "mictest": "ban_1dzpfrgi8t4byzmdeidh57p14h5jwbursf1t3ztbmeqnqqdcbpgp9x8j3cw6" });

console.log(await resolver.resolve("long", "mictest"));

const resolver2 = new bns.Resolver(rpc, { "mictest": "ban_1dzpfrgi8t4byzmdeidh57p14h5jwbursf1t3ztbmeqnqqdcbpgp9x8j3cw6" }, 3);

console.log(await resolver2.resolve("long", "mictest"));

