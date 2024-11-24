import type { Address, AccountHistoryRawRPC, RPC } from "banani";
import { get_address_from_public_key, get_public_key_from_address, whole_to_raw } from "banani";

import type { Domain, DomainTransfer } from "./types";
import { decode_domain_name, encode_domain_name, LOG } from "./util";
import { FREEZE_REP, TRANS_MAX, TRANS_MIN } from "./constants";

class Account {
  readonly rpc: RPC;
  readonly address: Address;

  constructor(rpc: RPC, address: Address) {
    this.rpc = rpc;
    this.address = address;
  }

  //errors if unopened
  async get_open_and_frontier(): Promise<[string, string]> {
    const account_info = await this.rpc.get_account_info(this.address, true);
    return [account_info.open_block, account_info.confirmation_height_frontier ?? account_info.frontier];
  }

  //cannot use raw because kalium does not support it...?
  async get_history_from_open(head: string, count: number): Promise<AccountHistoryRawRPC> {
    return await this.rpc.get_account_history(this.address, count, true, head, undefined, true) as AccountHistoryRawRPC;
  }
}



export class TLDAccount extends Account {
  all_issued: Domain[];

  constructor(rpc: RPC, address: Address) {
    super(rpc, address);
    this.all_issued = [];
  }

  async get_specific(name: string, crawl_size: number = 500): Promise<Domain | undefined> {
    const [open_hash, frontier_hash] = await this.get_open_and_frontier();
    let head_hash = open_hash;
    while (true) {
      const { history } = await this.get_history_from_open(head_hash, crawl_size);
      for (const block of history) {
        const amount = BigInt(block.amount ?? 0); //no amount if is change rep only
        if (block.subtype === "send" && amount >= TRANS_MIN && amount <= TRANS_MAX) {
          const found_name = decode_domain_name(get_public_key_from_address(block.representative));
          //if already in issued, this one is invalid
          if (name === found_name) {
            return {
              tld: this.address,
              name,
              history: [
                {
                  type: "transfer",
                  block: block,
                  to: get_address_from_public_key(block.link),
                },
              ],
            };
          }
        }
        //again, no else if because of block.hash === frontier_hash
        if ((block.representative === FREEZE_REP && block.subtype === "change") || (block.hash === frontier_hash)) {
          return;
        }
      }
      head_hash = history[history.length - 1].hash;
    }
  }

  async get_all_issued(crawl_size: number = 500): Promise<Domain[]> {
    const [open_hash, frontier_hash] = await this.get_open_and_frontier();
    let head_hash = open_hash;
    let issued: Record<string, Domain> = {};
    while (true) {
      const { history } = await this.get_history_from_open(head_hash, crawl_size);
      for (const block of history) {
        const amount = BigInt(block.amount ?? 0); //no amount if change rep only
        if (block.subtype === "send" && amount >= TRANS_MIN && amount <= TRANS_MAX) {
          const name = decode_domain_name(get_public_key_from_address(block.representative));
          //if already in issued, this one is invalid
          if (!issued[name]) {
            issued[name] = {
              tld: this.address,
              name,
              history: [
                {
                  type: "transfer",
                  block,
                  to: get_address_from_public_key(block.link),
                },
              ],
            };
          } else if (LOG) {
            console.log(`"${name}" already issued but TLD tried to issue again. Invalid.`);
          }
        }
        //cannot be "else if" because of the block.hash === frontier_hash thing
        if ((block.representative === FREEZE_REP && block.subtype === "change") || (block.hash === frontier_hash)) {
          this.all_issued = Object.values(issued);
          return this.all_issued;
        }
      }
      head_hash = history[history.length - 1].hash;
    }
  }
}

export class DomainAccount extends Account {
  domain?: Domain;
  rpc_calls: number;
  max_rpc_calls?: number;

  constructor(rpc: RPC, address: Address, domain?: Domain, max_rpc_calls?: number) {
    super(rpc, address);
    this.domain = domain;
    this.max_rpc_calls = max_rpc_calls;
    this.rpc_calls = 0;
  }

  async crawl(crawl_size = 500): Promise<Domain> {
    let open_hash, frontier_hash;
    try {
      [open_hash, frontier_hash] = await this.get_open_and_frontier();
      this.rpc_calls += 1;
    } catch {
      if (LOG) {
        console.log("Not yet received");
      }
      return this.domain;
    }
    if (this.rpc_calls === this.max_rpc_calls) throw new Error("Max RPC calls reached");
    let head_hash = open_hash;
    while (true) {
      const { history } = await this.get_history_from_open(head_hash, crawl_size) as AccountHistoryRawRPC;
      this.rpc_calls += 1;
      if (this.rpc_calls === this.max_rpc_calls) throw new Error("Max RPC calls reached");
      for (const block of history) {
        const amount = BigInt(block.amount ?? 0); //amount is 0 if change rep only, apparently
        if (block.height === "1") {
          //domain burned due to not being received as the opening block
          //? is in case fake domain
          if (block.link !== this.domain.history[this.domain.history.length - 1]?.block.hash) {
            if (LOG) console.log("Domain burned");
            this.domain.burned = true;
            //do not bother to add to history
            return this.domain;
          }
          this.domain.history.push({
            type: "receive",
            block,
          });
        } else if (block.subtype === "send" && amount >= TRANS_MIN && amount <= TRANS_MAX) {
          const name = decode_domain_name(get_public_key_from_address(block.representative));
          if (this.domain.name === name) {
            //domain is transferred away, this domain account no longer owns it
            //the old resolved address and metadata hash are no longer in effect
            this.domain.resolved_address = undefined;
            this.domain.metadata_hash = undefined;
            this.domain.history.push({
              type: "transfer",
              block,
              to: get_address_from_public_key(block.link),
            });
            return this.domain;
          }
        } else if (block.subtype === "change" && block.representative === FREEZE_REP) {
          this.domain.history.push({
            type: "freeze",
            block,
          });
          return this.domain;
        } else if (block.subtype === "change") {
          this.domain.metadata_hash = get_public_key_from_address(block.representative);
          this.domain.history.push({
            type: "metadata",
            block,
            metadata_hash: this.domain.metadata_hash,
          });
        } else if (block.subtype === "send" && amount === 4224n) {
          this.domain.resolved_address = get_address_from_public_key(block.link);
          this.domain.history.push({
            type: "resolver",
            block,
            resolved_address: this.domain.resolved_address,
          });
        }
        if (block.hash === frontier_hash) return this.domain;
      }
      head_hash = history[history.length - 1].hash;
    }
  }
}

export class Resolver {
  readonly rpc: RPC;
  tld_mapping: Record<string, Address>;
  max_rpc_calls_after_tld?: number;

  constructor(rpc: RPC, tld_mapping: Record<string, Address>, max_rpc_calls_after_tld?: number) {
    this.rpc = rpc;
    this.tld_mapping = tld_mapping;
    this.max_rpc_calls_after_tld = max_rpc_calls_after_tld;
  }

  async resolve(domain_name: string, tld: string, crawl_size = 500): Promise<Domain | undefined> {
    domain_name = domain_name.toLowerCase();
    if (!this.tld_mapping[tld]) throw new Error("No TLD Account found for that TLD");
    const tld_account = new TLDAccount(this.rpc, this.tld_mapping[tld]);
    let domain = await tld_account.get_specific(domain_name, crawl_size);
    if (!domain) return domain;
    let max_rpc_calls_after_tld = this.max_rpc_calls_after_tld;
    while (true) {
      const current_domain_account = (domain.history[domain.history.length - 1] as DomainTransfer).to;
      const domain_account = new DomainAccount(this.rpc, current_domain_account, domain, max_rpc_calls_after_tld);
      const old_l = domain.history.length;
      domain = await domain_account.crawl(crawl_size);
      max_rpc_calls_after_tld -= domain_account.rpc_calls;
      if (domain.history[domain.history.length - 1].type !== "transfer" || domain.burned || old_l === domain.history.length) break; //if length unchanged, means transfer unreceived
    }
    return domain;
  }

  //see what domain a domain account (currently) has
  async resolve_backwards_ish(domain_account_address: Address, tld: string, crawl_size = 500): Promise<Domain | undefined> {
    const open_hash = (await this.rpc.get_account_info(domain_account_address, true)).open_block;
    const transfer_hash = (await this.rpc.get_block_info(open_hash)).contents.link;
    const transfer_block = await this.rpc.get_block_info(transfer_hash);
    const domain_name = decode_domain_name(get_public_key_from_address(transfer_block.contents.representative));
    let domain = await this.resolve(domain_name, tld, crawl_size);
    //.reverse() mutates the original array, evil bastards!
    const last_transfer = domain?.history.slice().reverse().find((b): b is DomainTransfer => b.type === "transfer");
    if (last_transfer.to === domain_account_address) return domain;
  }
}

