import type { Address, AccountHistoryRawBlock } from "banani";

export interface DomainBlock {
  type: "transfer" | "receive" | "metadata" | "resolver" | "freeze";
  block: AccountHistoryRawBlock;
}

export interface DomainTransfer extends DomainBlock {
  type: "transfer";
  to: Address;
}

export interface DomainReceive extends DomainBlock {
  type: "receive";
}

export interface DomainMetadata extends DomainBlock {
  type: "metadata";
  metadata_hash: string;
}

export interface DomainResolver extends DomainBlock {
  type: "resolver";
  resolved_address: Address;
}

export interface DomainFreeze extends DomainBlock {
  type: "freeze";
}

export type DomainBlocks = DomainTransfer | DomainReceive | DomainMetadata | DomainResolver | DomainFreeze;

export interface Domain {
  tld: Address;
  name: string;
  history: DomainBlocks[];
  burned?: boolean;
  resolved_address?: Address;
  metadata_hash?: string;
}

