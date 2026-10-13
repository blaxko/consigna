// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Consigna
/// @notice One invoice, one payment. An invoice is paid straight to its issuer and can be paid exactly once.
/// @dev No owner, no admin, no pause, no proxy. The contract never holds funds.
contract Consigna {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Open,
        Paid,
        Cancelled
    }

    struct Invoice {
        address issuer; // receives funds
        address token; // USDC or EURC
        uint96 amount; // 6-decimal token units
        Status status;
        address payer; // set on payment
        uint64 createdAt;
        uint64 paidAt;
        uint64 paidBlock; // lets the UI fetch the exact log without a range scan
        bytes32 detailsHash; // keccak256 of the canonical details JSON, or 0x0
        string ref; // public, 1-32 bytes
    }

    event InvoiceCreated(
        bytes32 indexed id, address indexed issuer, address token, uint256 amount, string ref, bytes32 detailsHash
    );
    event InvoicePaid(
        bytes32 indexed id,
        address indexed issuer,
        address indexed payer,
        address token,
        uint256 amount,
        string ref
    );
    event InvoiceCancelled(bytes32 indexed id, address indexed issuer);

    error InvoiceNotFound(bytes32 id);
    error AlreadyPaid(bytes32 id, address paidBy, uint64 paidAt);
    error InvoiceWasCancelled(bytes32 id);
    error NotIssuer(bytes32 id);
    error TokenNotAllowed(address token);
    error InvalidAmount();
    error InvalidRef();
    error RefAlreadyUsed(bytes32 id);

    address public immutable USDC;
    address public immutable EURC;

    mapping(bytes32 => Invoice) private invoices;
    mapping(address => bytes32[]) private issuerInvoices;

    constructor(address usdc, address eurc) {
        USDC = usdc;
        EURC = eurc;
    }

    /// @notice Creates an Open invoice. The id is derived from msg.sender and ref, so nobody can squat another issuer's id.
    function createInvoice(string calldata ref, address token, uint96 amount, bytes32 detailsHash)
        external
        returns (bytes32 id)
    {
        if (bytes(ref).length == 0 || bytes(ref).length > 32) revert InvalidRef();
        if (token != USDC && token != EURC) revert TokenNotAllowed(token);
        if (amount == 0) revert InvalidAmount();

        id = keccak256(abi.encode(msg.sender, ref));
        // Status never returns to None, so a cancelled ref stays used.
        if (invoices[id].status != Status.None) revert RefAlreadyUsed(id);

        invoices[id] = Invoice({
            issuer: msg.sender,
            token: token,
            amount: amount,
            status: Status.Open,
            payer: address(0),
            createdAt: uint64(block.timestamp),
            paidAt: 0,
            paidBlock: 0,
            detailsHash: detailsHash,
            ref: ref
        });
        issuerInvoices[msg.sender].push(id);

        emit InvoiceCreated(id, msg.sender, token, amount, ref, detailsHash);
    }

    /// @notice Pays an Open invoice. State is written before the transfer, and a failed transfer reverts the whole call.
    function pay(bytes32 id) external {
        Invoice storage inv = invoices[id];
        if (inv.status == Status.None) revert InvoiceNotFound(id);
        if (inv.status == Status.Paid) revert AlreadyPaid(id, inv.payer, inv.paidAt);
        if (inv.status == Status.Cancelled) revert InvoiceWasCancelled(id);

        // Effects before interaction.
        inv.status = Status.Paid;
        inv.payer = msg.sender;
        inv.paidAt = uint64(block.timestamp);
        inv.paidBlock = uint64(block.number);

        IERC20(inv.token).safeTransferFrom(msg.sender, inv.issuer, inv.amount);

        emit InvoicePaid(id, inv.issuer, msg.sender, inv.token, inv.amount, inv.ref);
    }

    /// @notice Cancels an Open invoice. Only the issuer can cancel, and only before payment.
    function cancel(bytes32 id) external {
        Invoice storage inv = invoices[id];
        if (inv.status == Status.None) revert InvoiceNotFound(id);
        if (inv.issuer != msg.sender) revert NotIssuer(id);
        if (inv.status == Status.Paid) revert AlreadyPaid(id, inv.payer, inv.paidAt);
        if (inv.status == Status.Cancelled) revert InvoiceWasCancelled(id);

        inv.status = Status.Cancelled;

        emit InvoiceCancelled(id, msg.sender);
    }

    function idFor(address issuer, string calldata ref) external pure returns (bytes32) {
        return keccak256(abi.encode(issuer, ref));
    }

    function getInvoice(bytes32 id) external view returns (Invoice memory) {
        return invoices[id];
    }

    function invoiceCount(address issuer) external view returns (uint256) {
        return issuerInvoices[issuer].length;
    }

    /// @notice Returns up to `limit` invoice ids for `issuer`, starting at `offset`, in creation order.
    function invoicesOf(address issuer, uint256 offset, uint256 limit) external view returns (bytes32[] memory page) {
        bytes32[] storage all = issuerInvoices[issuer];
        uint256 total = all.length;
        if (offset >= total) return page;

        uint256 remaining = total - offset;
        uint256 size = limit < remaining ? limit : remaining;
        page = new bytes32[](size);
        for (uint256 i; i < size; ++i) {
            page[i] = all[offset + i];
        }
    }

    function isAllowedToken(address token) external view returns (bool) {
        return token == USDC || token == EURC;
    }
}
