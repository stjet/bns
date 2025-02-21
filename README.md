See the [protocol specification](bns_protocol.md), [docs](https://bns.prussia.dev) or [web wallet / demo](https://bns.prussia.dev/wallet)

## Installing

### NPM

```js
npm i banani-bns
```

### Web

Add the`bns-browser.js` file in this browser to your site. Then, in your `<head>`, add:

```html
<script src="/path/to/bns-browser.js"></script>
```

You can now access the library through `window.bns` in your scripts.

## Example

### Resolving

```js
import { banani, Resolver } from "banani-bns";

const rpc = new banani.RPC("https://kaliumapi.appditto.com/api");
const tld_mapping = {
  "mictest": "ban_1dzpfrgi8t4byzmdeidh57p14h5jwbursf1t3ztbmeqnqqdcbpgp9x8j3cw6",
  "jtv": "ban_3gipeswotbnyemcc1dejyhy5a1zfgj35kw356dommbx4rdochiteajcsay56",
  "ban": "ban_1fdo6b4bqm6pp1w55duuqw5ebz455975o4qcp8of85fjcdw9qhuzxsd3tjb9",
};

const resolver = new Resolver(rpc, tld_mapping);

console.log(await resolver.resolve("nishina247", "mictest"));
```

### Resolve Backwards

Only do this if you have a good reason to. Here's a hastily written code sample:

```js
import * as bns from "banani-bns";

const rpc = new bns.banani.RPC("https://kaliumapi.appditto.com/api");

const TLDS: Record<string, `ban_${string}` | `nano_${string}`> = {
  "mictest": "ban_1dzpfrgi8t4byzmdeidh57p14h5jwbursf1t3ztbmeqnqqdcbpgp9x8j3cw6",
  "jtv": "ban_3gipeswotbnyemcc1dejyhy5a1zfgj35kw356dommbx4rdochiteajcsay56",
  "ban": "ban_1fdo6b4bqm6pp1w55duuqw5ebz455975o4qcp8of85fjcdw9qhuzxsd3tjb9",
};

const resolver = new bns.Resolver(rpc, TLDS);

//Only looks through last 500 received transactions and 50 receivable transactions, for simplicity
//You can easily modify this to go further, though a lot more RPC calls could be made (eg, some accounts may have hundreds of thousands of blocks), so be careful.
async function find_bns_domains_for_account(account: bns.banani.Address, tld: string) {
  //search up to 50 receivable blocks, find the what are likely to be Domain Resolver blocks
  let receivable_resp = (await rpc.get_account_receivable(account, 50, "4224", true)).blocks;
  let possible_domain_accounts = Object.keys(receivable_resp).filter((hash) => receivable_resp[hash].amount === "4224").map((hash) => receivable_resp[hash].source);
  //now look through the last 500 received transactions
  possible_domain_accounts.push(...(await rpc.get_account_history(account, 500)).history.filter((info) => info.type === "receive" && info.amount === "4224").map((info) => info.account));
  //console.log(possible_domain_accounts);
  let domains = [];
  //now fetch those domains!
  for (const possible of possible_domain_accounts) {
    //console.log(possible);
    try {
      let domain = await resolver.resolve_backwards_ish(possible as bns.banani.Address, tld);
      if (domain) domains.push(domain);
    } catch (_) {}
  }
  return domains;
}

console.log(await find_bns_domains_for_account("ban_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp", "ban"));
```

