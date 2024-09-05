import * as bns from "../main.js";
import * as fs from "fs";
import * as crypto from "crypto";

(async () => {
  const test_seed = fs.readFileSync("./.secret", "utf-8").trim();

  let rpc = new bns.banani.RPC("https://kaliumapi.appditto.com/api"); //for sending cause it does work
  let rpc2 = new bns.banani.RPC("https://api.banano.trade/proxy", true); //for resolver cause it supports raw account history

  let tld_wallet = new bns.banani.Wallet(rpc, test_seed);

  console.log(await new bns.Resolver(rpc2, { "test": tld_wallet.address }).resolve_backwards_ish("ban_1119d44eg3fey3mxpk8mshn7gf5dfzsuiaz1ypoh5nqy8bxbao54zzc5rnka", "test"));

  let tld = new bns.TLDAccountManager(rpc, tld_wallet);

  await tld.receive();

  const rand_wallet = bns.banani.Wallet.gen_random_wallet(rpc);

  const rand_name = `test${String(Math.random()).replaceAll(".", "")}`;

  const issue_hash = await tld.issue_domain_name(rand_name, rand_wallet.address);

  const rand_dam = new bns.DomainAccountManager(rpc, rand_wallet);

  await rand_dam.receive_domain(issue_hash);

  await rand_dam.declare_domain_resolve_to("ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps");
  
  await rand_dam.declare_domain_metadata("1".repeat(64));

  await rand_dam.declare_domain_resolve_to("ban_1burnbabyburndiscoinferno111111111111111111111111111aj49sw3w");

  const rand_wallet2 = bns.banani.Wallet.gen_random_wallet(rpc);

  const transfer_hash = await rand_dam.transfer_domain(rand_name, rand_wallet2.address);

  const rand_dam2 = new bns.DomainAccountManager(rpc, rand_wallet2);

  await rand_dam2.receive_domain(transfer_hash);

  await rand_dam2.declare_domain_metadata("0".repeat(64));
  
  //await rand_dam2.declare_domain_resolve_to("ban_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp");

  const resolver = new bns.Resolver(rpc2, { "test": tld_wallet.address });

  console.log(`${rand_name}.test`, await resolver.resolve(rand_name, "test"));
  
  console.log("tld issued", await (new bns.TLDAccount(rpc2, tld_wallet.address)).get_all_issued())

  //let d_wallet = new bns.banani.Wallet(rpc, test_seed, 1);

  //
  /**/
})();

