import type { Address, RPC } from "banani";
import { get_address_from_public_key, raw_to_whole, whole_to_raw, Wallet } from "banani";

import type { Domain } from "./types";
import { DomainAccount, TLDAccount } from "./resolver";
import { decode_domain_name, encode_domain_name, LOG } from "./util";

export class TLDAccountManager extends TLDAccount {
  wallet: Wallet;

  constructor(rpc: RPC, wallet: Wallet) {
    super(rpc, wallet.address);
    this.wallet = wallet;
  }

  //highly recommended to call `this.get_all_issued` first or otherwise populate `this.all_issued` in order to not issue a domain name that has already been issued already (the second issuance will be invalid and unrecognised)
  async issue_domain_name(domain_name: string, to: Address): Promise<string> {
    if (this.all_issued.some((domain) => domain.name === domain_name)) throw new Error("Cannot issue a domain name that is already issued");
    const block_hash = await this.wallet.send(to, "0.00120703011", undefined, get_address_from_public_key(encode_domain_name(domain_name)));
    //
    //this.all_issued.push(domain_name);
    return block_hash;
  }

  //ideally tld starts out with say, 100 Banano to open with, and never needs to receive anything ever again. 100 Banano is over for over 80k domain issuances.
  async receive() {
    //up to 20, technically
    await this.wallet.receive_all();
  }
}

export class DomainAccountManager extends DomainAccount {
  wallet: Wallet;
  domain?: Domain;

  constructor(rpc: RPC, wallet: Wallet, domain?: Domain) {
    super(rpc, wallet.address);
    this.wallet = wallet;
    this.domain = domain;
  }

  async receive_domain(receive_hash: string, allow_burning?: boolean) {
    let burning = false;
    const { history } = await this.rpc.get_account_history(this.address, 1);
    if (history.length > 1 && !allow_burning) {
      burning = true;
      throw new Error("`allow_burning` must be true in order to receive this domain");
    }
    const block_info = await this.rpc.get_block_info(receive_hash);
    const min = whole_to_raw("0.0012070301");
    const max = whole_to_raw("0.00120703011");
    const amount = BigInt(block_info.amount);
    if (amount < min || amount > max) throw new Error("`receive_hash` is not a Domain Transfer block");
    await this.wallet.receive(receive_hash);
    //
  }

  async transfer_domain(domain_name: string, to: Address): Promise<string> {
    const balance = (await this.wallet.get_account_info()).balance;
    const min = whole_to_raw("0.0012070301");
    const max = whole_to_raw("0.00120703011");
    let send_amount = raw_to_whole(max);
    if (max > BigInt(balance) && min <= BigInt(balance)) send_amount = raw_to_whole(BigInt(balance));
    const block_hash = await this.wallet.send(to, send_amount, undefined, get_address_from_public_key(encode_domain_name(domain_name)));
    //
    return block_hash;
  }

  async declare_domain_metadata(metadata_hash: string) {
    await this.wallet.change_representative(get_address_from_public_key(metadata_hash));
    //
  }

  async declare_domain_resolve_to(address: Address) {
    await this.wallet.send(address, raw_to_whole(4224n));
    //
  }
}

