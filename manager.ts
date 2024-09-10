import type { Address, RPC } from "banani";
import { get_address_from_public_key, raw_to_whole, whole_to_raw, Wallet } from "banani";

import type { Domain } from "./types";
import { DomainAccount, TLDAccount } from "./resolver";
import { decode_domain_name, encode_domain_name, LOG } from "./util";
import { TRANS_MAX, TRANS_MIN, FREEZE_REP, FREEZE_PUB_KEY } from "./constants";

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

  async freeze() {
    await this.wallet.change_representative(FREEZE_REP);
    //
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

  async receive_domain(receive_hash: string, tld?: Address, allow_burning?: boolean) {
    let burning = false;
    const { history } = await this.rpc.get_account_history(this.address, 1);
    if (history.length > 1 && !allow_burning) {
      burning = true;
      throw new Error("`allow_burning` must be true in order to receive this domain");
    }
    const block_info = await this.rpc.get_block_info(receive_hash);
    const amount = BigInt(block_info.amount);
    if (amount < TRANS_MIN || amount > TRANS_MAX) throw new Error("`receive_hash` is not a Domain Transfer block");
    await this.wallet.receive(receive_hash, undefined, tld);
    //
  }

  async transfer_domain(domain_name: string, to: Address): Promise<string> {
    const balance = (await this.wallet.get_account_info()).balance;
    let send_amount = raw_to_whole(TRANS_MAX);
    if (TRANS_MAX > BigInt(balance) && TRANS_MIN <= BigInt(balance)) send_amount = raw_to_whole(BigInt(balance));
    const block_hash = await this.wallet.send(to, send_amount, undefined, get_address_from_public_key(encode_domain_name(domain_name)));
    //
    return block_hash;
  }

  async declare_domain_metadata(metadata_hash: string) {
    if (metadata_hash === FREEZE_PUB_KEY) throw new Error("A metadata hash of all 1s freezes the domain");
    await this.wallet.change_representative(get_address_from_public_key(metadata_hash));
    //
  }

  async declare_domain_resolve_to(address: Address) {
    await this.wallet.send(address, raw_to_whole(4224n));
    //
  }

  async freeze() {
    await this.wallet.change_representative(FREEZE_REP);
    //
  }
}

