import { expect } from "chai";
import hre from "hardhat";
import { encodeAbiParameters, getAddress, keccak256, parseEventLogs, stringToHex, type Address, type Hex } from "viem";

// Status enum order in Consigna.sol: None, Open, Paid, Cancelled
const STATUS = { None: 0, Open: 1, Paid: 2, Cancelled: 3 } as const;
const USDC_AMOUNT = 5_000_000n; // 5.00 USDC in 6-decimal units
const REF = "INV-1";
const DETAILS = keccak256(stringToHex("details"));
const UNKNOWN_ID = keccak256(stringToHex("no-such-invoice"));

async function deploy() {
  const [issuer, payer, stranger, otherIssuer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const usdc = await hre.viem.deployContract("MockUSDC", ["USD Coin", "USDC"]);
  const eurc = await hre.viem.deployContract("MockUSDC", ["Euro Coin", "EURC"]);
  const consigna = await hre.viem.deployContract("Consigna", [usdc.address, eurc.address]);
  return { issuer, payer, stranger, otherIssuer, publicClient, usdc, eurc, consigna };
}
type Ctx = Awaited<ReturnType<typeof deploy>>;

// viem types contract reads as unknown when the ABI is not generated into typechain.
// These helpers give the reads their real shapes, so the assertions type-check.
type Invoice = {
  issuer: Address;
  token: Address;
  amount: bigint;
  status: number;
  payer: Address;
  createdAt: number;
  paidAt: number;
  paidBlock: bigint;
  detailsHash: Hex;
  ref: string;
};
const getInv = async (c: Ctx, id: Hex) => (await c.consigna.read.getInvoice([id])) as Invoice;
const idOf = async (c: Ctx, issuer: Address, ref: string) => (await c.consigna.read.idFor([issuer, ref])) as Hex;
const balanceOf = async (c: Ctx, who: Address) => (await c.usdc.read.balanceOf([who])) as bigint;
const isAllowed = async (c: Ctx, token: Address) => (await c.consigna.read.isAllowedToken([token])) as boolean;
const countOf = async (c: Ctx, issuer: Address) => (await c.consigna.read.invoiceCount([issuer])) as bigint;
const pageOf = async (c: Ctx, issuer: Address, offset: bigint, limit: bigint) =>
  (await c.consigna.read.invoicesOf([issuer, offset, limit])) as Hex[];

/** Decodes the named events from a receipt. The cast reflects the untyped ABI, not a runtime change. */
function decodedEvents(c: Ctx, receipt: { logs: unknown[] }, eventName: string) {
  return parseEventLogs({ abi: c.consigna.abi, logs: receipt.logs as never, eventName }) as unknown as {
    args: Record<string, unknown>;
  }[];
}

async function create(
  c: Ctx,
  ref = REF,
  opts: { token?: Address; amount?: bigint; from?: Ctx["issuer"] } = {},
) {
  const from = opts.from ?? c.issuer;
  const hash = await c.consigna.write.createInvoice(
    [ref, opts.token ?? c.usdc.address, opts.amount ?? USDC_AMOUNT, DETAILS],
    { account: from.account },
  );
  const receipt = await c.publicClient.waitForTransactionReceipt({ hash });
  const id = await idOf(c, from.account.address, ref);
  return { id, receipt };
}

async function fund(c: Ctx, wallet: Ctx["payer"], amount: bigint) {
  await c.usdc.write.mint([wallet.account.address, amount], { account: c.issuer.account });
  await c.usdc.write.approve([c.consigna.address, amount], { account: wallet.account });
}

async function pay(c: Ctx, id: Hex, wallet: Ctx["payer"]) {
  const hash = await c.consigna.write.pay([id], { account: wallet.account });
  return c.publicClient.waitForTransactionReceipt({ hash });
}

/** Walks the error chain and returns every text fragment, so the test can match the decoded error name. */
function errorText(e: unknown): string {
  const parts: string[] = [];
  let cur: any = e;
  for (let depth = 0; cur && depth < 10; depth++) {
    parts.push(String(cur.message ?? ""), String(cur.data?.errorName ?? ""));
    cur = cur.cause;
  }
  return parts.join("\n");
}

/** Asserts the promise reverts, and that the revert names the expected custom error or OpenZeppelin error. */
async function expectRevert(p: Promise<unknown>, errorName: string) {
  let caught: unknown;
  try {
    await p;
  } catch (e) {
    caught = e;
  }
  expect(caught, `expected revert ${errorName}, but the call succeeded`).to.not.equal(undefined);
  expect(errorText(caught)).to.include(errorName);
  return errorText(caught);
}

describe("Consigna (F1 contract, mainnet-bound, tested on Hardhat in-memory network)", function () {
  let c: Ctx;

  beforeEach(async () => {
    c = await deploy();
  });

  describe("AC1.1 createInvoice", () => {
    it("creates an Open invoice with the given amount and emits InvoiceCreated", async () => {
      const { id, receipt } = await create(c);

      const inv = await getInv(c, id);
      expect(inv.status).to.equal(STATUS.Open);
      expect(inv.amount).to.equal(USDC_AMOUNT);
      expect(getAddress(inv.issuer)).to.equal(getAddress(c.issuer.account.address));
      expect(getAddress(inv.token)).to.equal(getAddress(c.usdc.address));
      expect(inv.ref).to.equal(REF);
      expect(inv.detailsHash).to.equal(DETAILS);

      const events = decodedEvents(c, receipt, "InvoiceCreated");
      expect(events).to.have.length(1);
      expect(events[0].args.id).to.equal(id);
      expect(events[0].args.amount).to.equal(USDC_AMOUNT);
      expect(events[0].args.ref).to.equal(REF);
    });
  });

  describe("AC1.2 pay", () => {
    it("moves exactly the amount to the issuer, marks Paid, records paidBlock, holds no funds, emits InvoicePaid", async () => {
      const { id } = await create(c);
      await fund(c, c.payer, USDC_AMOUNT);

      const issuerBefore = await balanceOf(c, c.issuer.account.address);
      const payerBefore = await balanceOf(c, c.payer.account.address);

      const receipt = await pay(c, id, c.payer);

      expect((await balanceOf(c, c.issuer.account.address)) - issuerBefore).to.equal(USDC_AMOUNT);
      expect((await balanceOf(c, c.payer.account.address)) - payerBefore).to.equal(-USDC_AMOUNT);
      expect(await balanceOf(c, c.consigna.address)).to.equal(0n);

      const inv = await getInv(c, id);
      expect(inv.status).to.equal(STATUS.Paid);
      expect(getAddress(inv.payer)).to.equal(getAddress(c.payer.account.address));
      // uint64 fields come back from viem as number, block numbers as bigint
      expect(BigInt(inv.paidBlock)).to.equal(receipt.blockNumber);
      expect(Number(inv.paidAt)).to.be.greaterThan(0);

      const events = decodedEvents(c, receipt, "InvoicePaid");
      expect(events).to.have.length(1);
      expect(events[0].args.id).to.equal(id);
      expect(events[0].args.amount).to.equal(USDC_AMOUNT);
    });
  });

  describe("AC1.3 second payment is refused", () => {
    it("reverts AlreadyPaid for anyone, including the issuer, and no balances change", async () => {
      const { id } = await create(c);
      await fund(c, c.payer, USDC_AMOUNT);
      await fund(c, c.stranger, USDC_AMOUNT);
      await pay(c, id, c.payer);

      const addrs = [c.payer, c.stranger, c.issuer].map((w) => w.account.address);
      const before = await Promise.all(addrs.map((a) => balanceOf(c, a)));

      for (const w of [c.payer, c.stranger, c.issuer]) {
        const text = await expectRevert(c.consigna.write.pay([id], { account: w.account }), "AlreadyPaid");
        // The error carries the first payer's address
        expect(text.toLowerCase()).to.include(c.payer.account.address.toLowerCase());
      }

      const after = await Promise.all(addrs.map((a) => balanceOf(c, a)));
      expect(after).to.deep.equal(before);
    });
  });

  describe("AC1.4 pay on a cancelled or unknown invoice", () => {
    it("reverts InvoiceWasCancelled for a cancelled invoice", async () => {
      const { id } = await create(c);
      await c.consigna.write.cancel([id], { account: c.issuer.account });
      await fund(c, c.payer, USDC_AMOUNT);
      await expectRevert(c.consigna.write.pay([id], { account: c.payer.account }), "InvoiceWasCancelled");
    });

    it("reverts InvoiceNotFound for an unknown id", async () => {
      await expectRevert(c.consigna.write.pay([UNKNOWN_ID], { account: c.payer.account }), "InvoiceNotFound");
    });
  });

  describe("AC1.5 cancel", () => {
    it("reverts NotIssuer when a non-issuer cancels an Open invoice", async () => {
      const { id } = await create(c);
      await expectRevert(c.consigna.write.cancel([id], { account: c.stranger.account }), "NotIssuer");
    });

    it("lets the issuer cancel an Open invoice and emits InvoiceCancelled", async () => {
      const { id } = await create(c);
      const hash = await c.consigna.write.cancel([id], { account: c.issuer.account });
      const receipt = await c.publicClient.waitForTransactionReceipt({ hash });

      expect((await getInv(c, id)).status).to.equal(STATUS.Cancelled);
      const events = decodedEvents(c, receipt, "InvoiceCancelled");
      expect(events).to.have.length(1);
      expect(events[0].args.id).to.equal(id);
    });

    it("reverts AlreadyPaid when the issuer cancels a Paid invoice", async () => {
      const { id } = await create(c);
      await fund(c, c.payer, USDC_AMOUNT);
      await pay(c, id, c.payer);
      await expectRevert(c.consigna.write.cancel([id], { account: c.issuer.account }), "AlreadyPaid");
    });

    it("reverts InvoiceWasCancelled when cancelling twice, and InvoiceNotFound for an unknown id", async () => {
      const { id } = await create(c);
      await c.consigna.write.cancel([id], { account: c.issuer.account });
      await expectRevert(c.consigna.write.cancel([id], { account: c.issuer.account }), "InvoiceWasCancelled");
      await expectRevert(c.consigna.write.cancel([UNKNOWN_ID], { account: c.issuer.account }), "InvoiceNotFound");
    });
  });

  describe("AC1.6 createInvoice validation", () => {
    it("reverts TokenNotAllowed for any token other than USDC or EURC", async () => {
      await expectRevert(create(c, REF, { token: c.stranger.account.address }), "TokenNotAllowed");
    });

    it("accepts EURC as well as USDC", async () => {
      const { id } = await create(c, "EUR-1", { token: c.eurc.address });
      expect((await getInv(c, id)).status).to.equal(STATUS.Open);
      expect(await isAllowed(c, c.eurc.address)).to.equal(true);
    });

    it("reverts InvalidAmount for a zero amount", async () => {
      await expectRevert(create(c, REF, { amount: 0n }), "InvalidAmount");
    });

    it("reverts InvalidRef for an empty ref or a 33-byte ref, and accepts exactly 32 bytes", async () => {
      await expectRevert(create(c, ""), "InvalidRef");
      await expectRevert(create(c, "x".repeat(33)), "InvalidRef");
      const { id } = await create(c, "x".repeat(32));
      expect((await getInv(c, id)).status).to.equal(STATUS.Open);
    });

    it("reverts RefAlreadyUsed for a repeated ref, including after cancel", async () => {
      const { id } = await create(c);
      await expectRevert(create(c), "RefAlreadyUsed");
      await c.consigna.write.cancel([id], { account: c.issuer.account });
      await expectRevert(create(c), "RefAlreadyUsed");
    });
  });

  describe("AC1.7 IDs are per issuer", () => {
    it("two issuers can each use the same ref and get different IDs", async () => {
      const a = await create(c, "INV-1", { from: c.issuer });
      const b = await create(c, "INV-1", { from: c.otherIssuer });
      expect(a.id).to.not.equal(b.id);
      expect((await getInv(c, a.id)).status).to.equal(STATUS.Open);
      expect((await getInv(c, b.id)).status).to.equal(STATUS.Open);
    });
  });

  describe("AC1.8 failed transferFrom reverts the whole call", () => {
    it("reverts when the payer has not approved, and the status stays Open", async () => {
      const { id } = await create(c);
      await c.usdc.write.mint([c.payer.account.address, USDC_AMOUNT], { account: c.issuer.account });
      await expectRevert(c.consigna.write.pay([id], { account: c.payer.account }), "ERC20InsufficientAllowance");
      expect((await getInv(c, id)).status).to.equal(STATUS.Open);
    });

    it("reverts when the payer is approved but has no balance, and the status stays Open", async () => {
      const { id } = await create(c);
      await c.usdc.write.approve([c.consigna.address, USDC_AMOUNT], { account: c.payer.account });
      await expectRevert(c.consigna.write.pay([id], { account: c.payer.account }), "ERC20InsufficientBalance");
      expect((await getInv(c, id)).status).to.equal(STATUS.Open);
    });
  });

  describe("security review: constructor config and ref byte length", () => {
    it("rejects a zero or duplicate token address at deploy, because the allowlist is immutable", async () => {
      const zero = "0x0000000000000000000000000000000000000000";
      await expectRevert(
        hre.viem.deployContract("Consigna", [zero, c.eurc.address]),
        "TokenNotAllowed",
      );
      await expectRevert(
        hre.viem.deployContract("Consigna", [c.usdc.address, zero]),
        "TokenNotAllowed",
      );
      await expectRevert(
        hre.viem.deployContract("Consigna", [c.usdc.address, c.usdc.address]),
        "TokenNotAllowed",
      );
    });

    it("measures the ref in bytes: 16 two-byte characters (32 bytes) pass, 17 (34 bytes) revert", async () => {
      const { id } = await create(c, "é".repeat(16));
      expect((await getInv(c, id)).status).to.equal(STATUS.Open);
      await expectRevert(create(c, "é".repeat(17)), "InvalidRef");
    });
  });

  describe("views", () => {
    it("isAllowedToken is true for USDC and EURC only", async () => {
      expect(await isAllowed(c, c.usdc.address)).to.equal(true);
      expect(await isAllowed(c, c.eurc.address)).to.equal(true);
      expect(await isAllowed(c, c.stranger.account.address)).to.equal(false);
    });

    it("idFor equals keccak256(abi.encode(issuer, ref))", async () => {
      const expected = keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "string" }],
          [c.issuer.account.address, REF],
        ),
      );
      expect(await idOf(c, c.issuer.account.address, REF)).to.equal(expected);
    });

    it("invoicesOf pages through an issuer's invoices in creation order", async () => {
      const refs = ["A", "B", "C"];
      const ids: Hex[] = [];
      for (const r of refs) ids.push((await create(c, r)).id);

      const issuer = c.issuer.account.address;
      expect(await countOf(c, issuer)).to.equal(3n);
      expect(await pageOf(c, issuer, 0n, 2n)).to.deep.equal(ids.slice(0, 2));
      expect(await pageOf(c, issuer, 1n, 10n)).to.deep.equal(ids.slice(1));
      expect(await pageOf(c, issuer, 3n, 5n)).to.deep.equal([]);
      expect(await pageOf(c, issuer, 9n, 1n)).to.deep.equal([]);
    });
  });
});
