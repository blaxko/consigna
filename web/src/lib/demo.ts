import { encodeAbiParameters, keccak256, type Address, type Hex } from "viem";

// Demo links on the home page. These point at real mainnet records from the Phase 2 smoke test and Phase 4 manual tests.
export const DEMO_ISSUER: Address = "0xcc136490c7e6F89B298c1A5b4957a1f532B285da";
export const DEMO_PAID_REF = "TEST-001";

// Duplicate payment that reverted on-chain with AlreadyPaid (smoke test, Phase 2).
export const BLOCKED_DUPLICATE_TX: Hex = "0xa16c4bcccf23fd1f3c343511a2723e459013487f09d7771aad0d4d10de39520c";

/** Same derivation as the contract: keccak256(abi.encode(issuer, ref)). Pure, no network. */
export function invoiceIdFor(issuer: Address, ref: string): Hex {
  return keccak256(encodeAbiParameters([{ type: "address" }, { type: "string" }], [issuer, ref]));
}
