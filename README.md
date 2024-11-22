See the [protocol specification](bns_protocol.md), [docs](https://bns.prussia.dev) or [demo](https://bns.prussia.dev/browser_test)

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

