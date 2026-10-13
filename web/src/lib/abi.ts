// Generated from artifacts/contracts/Consigna.sol/Consigna.json. Regenerate after any contract change (which needs approval).
// Do not edit by hand.

export const consignaAbi = [
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "usdc",
                           "type":  "address"
                       },
                       {
                           "internalType":  "address",
                           "name":  "eurc",
                           "type":  "address"
                       }
                   ],
        "stateMutability":  "nonpayable",
        "type":  "constructor"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       },
                       {
                           "internalType":  "address",
                           "name":  "paidBy",
                           "type":  "address"
                       },
                       {
                           "internalType":  "uint64",
                           "name":  "paidAt",
                           "type":  "uint64"
                       }
                   ],
        "name":  "AlreadyPaid",
        "type":  "error"
    },
    {
        "inputs":  [

                   ],
        "name":  "InvalidAmount",
        "type":  "error"
    },
    {
        "inputs":  [

                   ],
        "name":  "InvalidRef",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "InvoiceNotFound",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "InvoiceWasCancelled",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "NotIssuer",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "RefAlreadyUsed",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       }
                   ],
        "name":  "SafeERC20FailedOperation",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       }
                   ],
        "name":  "TokenNotAllowed",
        "type":  "error"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       }
                   ],
        "name":  "InvoiceCancelled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "ref",
                           "type":  "string"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "bytes32",
                           "name":  "detailsHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "InvoiceCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       },
                       {
                           "indexed":  true,
                           "internalType":  "address",
                           "name":  "payer",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "amount",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "string",
                           "name":  "ref",
                           "type":  "string"
                       }
                   ],
        "name":  "InvoicePaid",
        "type":  "event"
    },
    {
        "inputs":  [

                   ],
        "name":  "EURC",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "USDC",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "cancel",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "ref",
                           "type":  "string"
                       },
                       {
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       },
                       {
                           "internalType":  "uint96",
                           "name":  "amount",
                           "type":  "uint96"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "detailsHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "createInvoice",
        "outputs":  [
                        {
                            "internalType":  "bytes32",
                            "name":  "id",
                            "type":  "bytes32"
                        }
                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "getInvoice",
        "outputs":  [
                        {
                            "components":  [
                                               {
                                                   "internalType":  "address",
                                                   "name":  "issuer",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "token",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "uint96",
                                                   "name":  "amount",
                                                   "type":  "uint96"
                                               },
                                               {
                                                   "internalType":  "enum Consigna.Status",
                                                   "name":  "status",
                                                   "type":  "uint8"
                                               },
                                               {
                                                   "internalType":  "address",
                                                   "name":  "payer",
                                                   "type":  "address"
                                               },
                                               {
                                                   "internalType":  "uint64",
                                                   "name":  "createdAt",
                                                   "type":  "uint64"
                                               },
                                               {
                                                   "internalType":  "uint64",
                                                   "name":  "paidAt",
                                                   "type":  "uint64"
                                               },
                                               {
                                                   "internalType":  "uint64",
                                                   "name":  "paidBlock",
                                                   "type":  "uint64"
                                               },
                                               {
                                                   "internalType":  "bytes32",
                                                   "name":  "detailsHash",
                                                   "type":  "bytes32"
                                               },
                                               {
                                                   "internalType":  "string",
                                                   "name":  "ref",
                                                   "type":  "string"
                                               }
                                           ],
                            "internalType":  "struct Consigna.Invoice",
                            "name":  "",
                            "type":  "tuple"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       },
                       {
                           "internalType":  "string",
                           "name":  "ref",
                           "type":  "string"
                       }
                   ],
        "name":  "idFor",
        "outputs":  [
                        {
                            "internalType":  "bytes32",
                            "name":  "",
                            "type":  "bytes32"
                        }
                    ],
        "stateMutability":  "pure",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       }
                   ],
        "name":  "invoiceCount",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "issuer",
                           "type":  "address"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "offset",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "limit",
                           "type":  "uint256"
                       }
                   ],
        "name":  "invoicesOf",
        "outputs":  [
                        {
                            "internalType":  "bytes32[]",
                            "name":  "page",
                            "type":  "bytes32[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "token",
                           "type":  "address"
                       }
                   ],
        "name":  "isAllowedToken",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "id",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "pay",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    }
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;