//import * as bns from "../main.js";
import * as bns from "banani-bns";

const rpc = new bns.banani.RPC("https://kaliumapi.appditto.com/api");

const TLDS: Record<string, `ban_${string}` | `nano_${string}`> = { "mictest": "ban_1dzpfrgi8t4byzmdeidh57p14h5jwbursf1t3ztbmeqnqqdcbpgp9x8j3cw6" };

const resolver = new bns.Resolver(rpc, TLDS);
(async () => {
  console.log(await resolver.resolve("long", "mictest"));
  console.log(await resolver.resolve("nishina247", "mictest"));

  const resolver2 = new bns.Resolver(rpc, TLDS, 3);

  console.log(await resolver2.resolve("long", "mictest"));
})();

