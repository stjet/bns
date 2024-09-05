import { uint8array_to_hex, hex_to_uint8array } from "banani";

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

