# Demo data — create through the LIVE site on Arc mainnet

| Ref | Client | Line item | Amount | End state |
|---|---|---|---|---|
| INV-0040 | Acme Inc. | Brand audit | 0.10 USDC | Paid (practice run) |
| INV-0041 | Lagos Studio | Landing page copy | 0.20 USDC | Paid |
| INV-0042 | Acme Inc. | Logo design | 0.50 USDC | Paid + 1 duplicate attempt (video invoice) |
| INV-0043 | Northwind | API integration | 0.30 USDC | Paid |
| INV-0044 | Northwind | Rush fee (issued by mistake) | 0.25 USDC | Cancelled |
| INV-0045 | Acme Inc. | Monthly retainer | 0.40 USDC | Open (judges can see a payable invoice) |

Retakes: use a new ref (INV-0042b, INV-0042c...). Refs can never be reused.

Budget: Payer starts with ~1.5 USDC. The 4 paid invoices total 1.10 USDC. When Payer runs low, send USDC back from Issuer to Payer.
