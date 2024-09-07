import type { Address } from "banani";
import { uint8array_to_hex, hex_to_uint8array, get_address_from_public_key, get_public_key_from_address } from "banani";

export const LOG: boolean = true;

export function encode_domain_name(domain_name: string): string {
  if (domain_name.includes(".") || domain_name.includes("\u0000") || domain_name.includes('"')) throw new Error("Domain name cannot include '.' or '\"' or '\\u0000'");
  let hex = uint8array_to_hex((new TextEncoder()).encode(domain_name));
  if (hex.length > 64) throw new Error("Cannot be more than 32 bytes");
  if (hex.length < 64) {
    //pad this shit
    hex = "0".repeat(64 - hex.length) + hex;
  }
  return hex;
}

export function decode_domain_name(encoded_domain_name: string): string {
  return (new TextDecoder()).decode(hex_to_uint8array(encoded_domain_name)).replaceAll("\u0000", "");
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function hex_to_base58(hex: string): string {
  let num = BigInt(`0x${hex}`);
  let base58 = "";
  while (true) {
    base58 += BASE58_CHARS[Number(num % BigInt(58))];
    num = num / BigInt(58); //automatically rounds down
    if (num === 0n) break;
  }
  //it's backwards, so reverse it. why? Idgaf right now. it works
  return base58.split("").reverse().join("");
}

//lmao
export function bigint_to_uint8array(bint: bigint, len: number): Uint8Array {
  let uint8array: Uint8Array = new Uint8Array(len);
  let subbed_bint = bint;
  for (let i = 1; i <= len; i++) {
    uint8array[len - i] = Number(subbed_bint % 256n);
    subbed_bint /= 256n;
  }
  return uint8array;
}

//too lazy to bother doing anything proper
export function base58_to_hex(base58: string): string {
  let bint = 0n;
  for (let i = 0; i < base58.length; i++) {
    bint += BigInt(BASE58_CHARS.indexOf(base58[base58.length - i - 1])) * (BigInt(58) ** BigInt(i));
  }
  return uint8array_to_hex(bigint_to_uint8array(bint, 34));
}

export function cid_v0_to_address(cid_v0: string): Address {
  return get_address_from_public_key(base58_to_hex(cid_v0).slice(4));
}

export function address_to_cid_v0(address: Address): string {
  return hex_to_base58("1220" + get_public_key_from_address(address));
}

