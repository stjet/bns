*Version 1.0.0 release-candidate*

Very similar to [Airtune's Banano NFT protocol](https://github.com/Airtune/73-meta-tokens)

In fact, though it is meant to be for domain names, it can actually be considered a sort of very limited NFT protocol.

# TLDs

Anyone can run a "TLD". The **only** role of TLD operators is to **initially** issue (sub)domains of their TLD ("TLD domains"). They will not be able to revoke subdomains, preside over transfer, etc.

A TLD is just a Banano account ("TLD Account"). The operator of the TLD is whoever has the private keys to that TLD account.

TLD Accounts should be only TLD Accounts, and not used for any other purpose, in order to not make crawling and resolving any harder that it should be. Clients ideally should not accept TLD Accounts are also used for other purposes.

There is no root domain. TLDs do not decide what the name of the TLD is, that is decided by clients. Clients also get to decide which TLDs to accept. One client's `.example` might be `ban_abc` and their `.ejemplo` might be `ban_efg`. Another client's `.example` might be `ban_efg`, while their `.ejemplo` could be a `ban_abc`. Some clients might not even recognise that a `.example` or `.ejemplo` exists. In practice, TLD operators will likely suggest names for their TLD, though of course those suggestions do not need to be obeyed. Ideally, applications will come with default mappings of TLD names to TLD accounts decided through community consensus, but give the end user an easy way to edit those mappings, in order to change TLD names, remove certain TLD accounts, or add TLDs.

However, this proposal can be easily changed to incorporate a root domain that decides the TLDs - though the mechanisms for governance and management of the root domain would need to be discussed (multi-sig...?).

## Initial issuance of TLD domains

Initially issuing a TLD is easy. The TLD account just needs to send a Domain Transfer block (see that section).

How is TLD domain prevented from issuing the same domain to multiple people? Simple: It is first come first serve. If a TLD account issues the domain `toby.<tld>` to `ban_abc` at height 5, but then issues the same `toby.<tld>` to `ban_efg` at height 7, the second issuance will be ignored. Ideally of course, clients should remove TLD accounts that engage in this sort of deceptive behaviour from their mappings (or not add them to their mappings in the first place).

All blocks in the TLD account's history that are *not* Domain Transfer blocks should be ignored.

# Domain Account

A Domain Account is also just a Banano account, controlled by the owner of a domain.

Domain Accounts only manage one domain, ever. Multiple domains owned by the same owner cannot use the same Domain Account. If a domain is transferred, the Domain Account cannot be reused for another domain. This is enforced by making domains transferred by Domain Transfer blocks not received as an first block of an account ("opening block") to be considered burned.

Domain Accounts should ideally only be used for the purpose of changing the metadata of the domain or transferring the domain. However, this will not be enforced.

## Domain's resolved address

Since Domain Accounts are supposed to be used only managing the domain, the "true" owner (main Banano address of the owner), or what address the domain resolves to, is decided with a Domain Resolver block.

The most recent Domain Resolver block is used.

It is valid for a domain to not have any address to resolve to. Once a domain is transferred, the previous owner's resolved address is no longer valid, and the domain has no address to resolve to until a Domain Resolver block is sent by the new owner.

## Transferring domains

Domain Accounts can transfer it's held domain by sending a Domain Transfer block. Once a Domain Transfer block has been sent, any further actions performed by a Domain Account are ignored.

## Declaring domain metadata

Domain Accounts can declare metadata associated with their domain by sending a Domain Metadata block. Domain metadata can be changed by, once again, sending a Domain Metadata block.

The most recent Domain Metadata block is used.

It is valid for a domain to not have any metadata. Once a domain is transferred, the previous owner's domain metadata is no longer valid, and the domain has no metadata until a Domain Metadata block is sent by the new owner.

All blocks that are not Domain Transfer, Domain Metadata, Domain Resolver, or the opening Domain Receive blocks are ignored.

# Types of blocks

## Domain Transfer block

Used for both domain transfers and domain issuance. So, can be sent by either a TLD Account or a Domain Account. **If not received as the opening block by the recipient, the domain transferred is considered burned-ish. This means it cannot be transferred further, and no domain metadata can be declared for it. It will also not resolve to any address**

- Subtype: send
- Change in Balance: Must be 0.0012070301 to 0.00120703011 Banano
- Representative: Padded encoded utf-8 domain name
- Link (recepient): New owner of the domain (Domain Account)

## Domain Receive block

Receives a Domain Transfer block. If not the opening block of the account, the received domain is considered burned

- Subtype: send
- Link (send block hash): Hash of the Domain Transfer block
- Representative: Can *optionally* be the TLD account in order to make resolving backwards easier

## Domain Metadata block

To convey metadata associated with a block. Can only be sent by Domain Accounts

- Subtype: change
- Representative: Hash of the metadata (**cannot be all 1s, then it is Domain Freeze**)

> Currently, it is recommended that this metadata hash be a translated IPFS v0 Cid, so metadata files should be hosted on IPFS. IPFS is not mandated by the protocol, and it is perfectly acceptable to use something that is not IPFS to store metadata and use a regular SHA-256 hash of the file. However, clients will likely only support finding IPFS metadata.

## Domain Resolver block

To change the what address the domain resolves to

- Subtype: send
- Change in balance: 4224 raw
- Link (recepient): Banano address the domain should resolve to (typically the actual Banano address of the owner)

## Domain Freeze block

All Domain Transfer blocks sent after this block are to be ignored. The domain becomes an "frozen domain". For a TLD account, prevents issuance of new domains for that TLD. For a Domain Account, prevents transfer of the domain currently held by it, as well as any change in resolving and metadata. Not the same as a burned domain for a Domain Account as frozen domains can still resolve to an address and have metadata, while burned domains cannot

- Subtype: change
- Representative: Pub key (in hexadecimal) of "451", followed by sixty-two 1s

# Domain Metadata

Domain metadata can be anything. However, in order for domain metadata to be easily read by all applications, here is a possible standard format:

```json
{
  "domain": {
    //any arbitrary keys and values can be put here; the following are some examples
    "description": "I love Banano?",
    "www": "https://example.com",
    "tor": "http://asdsadif23ifjskfjls9030dskfblahblah.onion",
    "eth": "0xbl8ahb8lah10blahblahblahblahblahblahblah5",
    "matrix": "@example:example.com",
    "image": "<ipfs hash or url or some link to the image>",
    "ipfs": "<ipfs hash to a html site>"
  }
}
```

# Domain name validity

A domain name cannot have the `.`, `\u0000`, or `"` characters in it. Domain names are all lowercase.

> Maybe alphanumeric only?

# Implementation

## Resolving domains

To resolve a domain to a Domain Account (after checking the domain name for validity, and turning it lowercase), and to resolve into an address and some metadata, first a resolver needs to consult its mapping of TLD names to TLD Accounts. It should encode the utf-8 domain name and front pad it to 32 bytes (TLD name should not be included in the hash). Then, it should crawl the account, starting from height 1. It should keep crawling up the chain until it finds the first Domain Transfer whose representative matches the domain name's hash.

The resolver should then go to the recipient of the Domain Transfer. If the opening block (height 1) is not a Domain Receive block for that Domain Transfer, then the resolver knows the domain has been burned, and the resolving process is over. The burned domain has no domain metadata or resolved address. If it does find the opening block is the Domain Receive block for that Domain Transfer, it should then crawl up the chain again, keeping note of any Domain Metadata or Domain Resolver blocks. Newer blocks replace the older ones. If it encounters a Domain Transfer block, it should discard the noted domain metadata and resolved address, and repeat. If it does not encounter a Domain Transfer block, and reaches the frontier (latest) block, then it should return the noted domain metadata and resolved address (or lack thereof).

Resolving backwards is also possible, but slightly more complicated. In the resolved address, look for any receives or pending transactions of 4242 raw in order to find Domain Accounts. If the resolver know what TLD address the domain is supposed to be, great. If not, try finding out by looking at the representative of the opening block (Domain Receive) of the found Domain Account. From the opening block's corresponding send (Domain Transfer), the resolver can find the domain name. Then, resolve like normal since the resolver now has the TLD address and domain name. After resolving, the resolver must check to make sure that the found domain account actually owns the domain.

## TLD (Issuing domains)

A TLD operator can use whatever system it wants for issuing domain names. Some ideas are taking payments or issuing based on certain criteria (eg, citizenship). It should not issue invalid domain names. Even if it does, clients will ignore them. TLDs should also refuse to send to Banano accounts that already have blocks, because otherwise the domain name will be burned, which is probably not what the purchaser of the domain wants.

Also, for the convenience of the user (so they can do a Domain Resovler and Domain Transfer without needing to deposit more), TLDs are recommended to send 0.00120703011 Banano instead of the minimum 0.0012070301.

## Domain owners / BNS wallets

Domain owners will need some specialised software to manage domains. Generating/storing Domain Accounts, transferring domains, and setting/changing their resolved address are all simple. Changing domain metadata is a bit more complicated and involves uploading the metadata file to IPFS. The demo client supports converting IPFS Cid v0 into metadata hashes, and then declaring that metadata hash.

## Non-BNS wallets

Non-BNS wallets are regular Banano wallets like Kalium, Dagchat, Bananostand, etc, that will likely not add support for minting and managing BNS domains.

However, they can still integrate BNS by keeping a user-editable mapping of TLDs to addresses, and then supporting domain -> address translation for sending Banano or changing representatives.

## Metadata displayers

A browser extension or website could be made to fetch the metadata of a domain from IPFS, and then display it (hopefully nicely).

More advanced browser extensions can do things like displaying decentralised websites in the domain's metadata (eg, websites hosted on IPFS or Reticulum) when someone types in that domain in the address bar. They might also redirect to a regular (clearnet) website or a tor hidden service if the metadata requests.

## Buying/selling domains

Besides regular handshake p2p deals, maybe some kind of scheme with multi-sig? Buying/selling is the main focus of the Banano domains, at least.

