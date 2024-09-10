import * as util from "./util";
export * from "./constants";
import * as resolver from "./resolver";
import * as manager from "./manager";
import * as types from "./types";
import * as banani from "banani";

declare global {
  interface Window {
    bns: any;
  }
}

//for browsers or whatever
window.bns = { ...util, ...resolver, ...manager, ...types, banani };
