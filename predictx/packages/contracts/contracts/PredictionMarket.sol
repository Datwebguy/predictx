// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// USDC on Arc Testnet: always use ERC-20 interface (6 decimals). Never use native balance (18 decimals).

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PredictionMarket
/// @notice Binary (YES/NO) prediction market with CPMM AMM, USDC settlement
contract PredictionMarket is ReentrancyGuard {
    // ─── Structs ──────────────────────────────────────────────────────────────
    enum Outcome { OPEN, YES, NO, INVALID }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
    }

    // ─── Immutables ───────────────────────────────────────────────────────────
    IERC20  public immutable usdc;
    address public immutable oracle;
    address public immutable creator;
    address public immutable factory;
    string  public question;
    uint256 public immutable resolvesAt;
    uint256 public immutable feeBps;      // e.g. 200 = 2%

    // ─── AMM State (CPMM: yesPool * noPool = k) ───────────────────────────────
    uint256 public yesPool;     // YES share pool
    uint256 public noPool;      // NO share pool
    uint256 public usdcPool;    // USDC backing the pools

    // ─── Market State ─────────────────────────────────────────────────────────
    Outcome public outcome = Outcome.OPEN;
    uint256 public totalFees;

    mapping(address => Position) public positions;
    mapping(address => uint256)  public lpShares;
    uint256 public totalLpShares;

    // ─── Events ───────────────────────────────────────────────────────────────
    event SharesBought(address indexed trader, bool isYes, uint256 usdcIn, uint256 sharesOut);
    event SharesSold(address indexed trader, bool isYes, uint256 sharesIn, uint256 usdcOut);
    event MarketResolved(Outcome outcome);
    event WinningsClaimed(address indexed trader, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _usdc,
        address _oracle,
        address _creator,
        string memory _question,
        uint256 _resolvesAt,
        uint256 _feeBps,
        uint256 /* initLiquidity - handled by factory */
    ) {
        usdc       = IERC20(_usdc);
        oracle     = _oracle;
        creator    = _creator;
        factory    = msg.sender;
        question   = _question;
        resolvesAt = _resolvesAt;
        feeBps     = _feeBps;
    }

    // ─── Liquidity ────────────────────────────────────────────────────────────
    /// @notice Called by factory after transferring initial USDC
    function seedLiquidity(uint256 amount) external {
        require(msg.sender == factory, "Only factory");
        require(yesPool == 0, "Already seeded");
        // Start at 50/50 probability
        yesPool  = amount;
        noPool   = amount;
        usdcPool = amount;
        totalLpShares = amount;
        lpShares[creator] = amount;
    }

    // ─── Trading ──────────────────────────────────────────────────────────────
    /// @notice Buy YES or NO shares with USDC
    function buyShares(bool isYes, uint256 usdcIn, uint256 minSharesOut)
        external nonReentrant
    {
        require(outcome == Outcome.OPEN,      "Market closed");
        require(block.timestamp < resolvesAt, "Market expired");
        require(usdcIn > 0,                   "Zero amount");

        usdc.transferFrom(msg.sender, address(this), usdcIn);

        uint256 fee      = (usdcIn * feeBps) / 10_000;
        uint256 netIn    = usdcIn - fee;
        totalFees       += fee;

        uint256 sharesOut = _calcBuy(isYes, netIn);
        require(sharesOut >= minSharesOut, "Slippage");

        // Update pool
        if (isYes) {
            yesPool -= sharesOut;
            noPool  += netIn;
            positions[msg.sender].yesShares += sharesOut;
        } else {
            noPool  -= sharesOut;
            yesPool += netIn;
            positions[msg.sender].noShares += sharesOut;
        }
        usdcPool += netIn;

        emit SharesBought(msg.sender, isYes, usdcIn, sharesOut);
    }

    /// @notice Sell YES or NO shares back for USDC
    function sellShares(bool isYes, uint256 sharesIn, uint256 minUsdcOut)
        external nonReentrant
    {
        require(outcome == Outcome.OPEN,      "Market closed");
        require(block.timestamp < resolvesAt, "Market expired");

        if (isYes) {
            require(positions[msg.sender].yesShares >= sharesIn, "Insufficient shares");
            positions[msg.sender].yesShares -= sharesIn;
        } else {
            require(positions[msg.sender].noShares >= sharesIn, "Insufficient shares");
            positions[msg.sender].noShares -= sharesIn;
        }

        uint256 usdcOut = _calcSell(isYes, sharesIn);
        uint256 fee     = (usdcOut * feeBps) / 10_000;
        uint256 netOut  = usdcOut - fee;
        require(netOut >= minUsdcOut, "Slippage");

        totalFees  += fee;
        usdcPool   -= usdcOut;
        if (isYes) { yesPool += sharesIn; noPool  -= usdcOut; }
        else        { noPool  += sharesIn; yesPool -= usdcOut; }

        usdc.transfer(msg.sender, netOut);
        emit SharesSold(msg.sender, isYes, sharesIn, netOut);
    }

    // ─── Resolution ───────────────────────────────────────────────────────────
    /// @notice Only the oracle address can resolve
    function resolve(Outcome _outcome) external {
        require(msg.sender == oracle,             "Only oracle");
        require(outcome == Outcome.OPEN,          "Already resolved");
        require(block.timestamp >= resolvesAt,    "Too early");
        require(_outcome != Outcome.OPEN,         "Invalid outcome");

        outcome = _outcome;
        emit MarketResolved(_outcome);
    }

    /// @notice Winners claim their USDC payout
    function claimWinnings() external nonReentrant {
        require(outcome != Outcome.OPEN, "Not resolved");

        Position storage pos = positions[msg.sender];
        uint256 winShares;

        if (outcome == Outcome.YES) {
            winShares = pos.yesShares;
            pos.yesShares = 0;
        } else if (outcome == Outcome.NO) {
            winShares = pos.noShares;
            pos.noShares = 0;
        } else {
            // INVALID — refund both sides proportionally
            winShares = pos.yesShares + pos.noShares;
            pos.yesShares = 0;
            pos.noShares  = 0;
        }

        require(winShares > 0, "Nothing to claim");

        // 1 winning share = 1 USDC (6 decimals)
        uint256 payout = winShares; // 1:1 payout per winning share
        usdc.transfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, payout);
    }

    // ─── CPMM Math ────────────────────────────────────────────────────────────
    /// @dev Amount of shares out for a given USDC in (CPMM)
    function _calcBuy(bool isYes, uint256 usdcIn)
        internal view returns (uint256 sharesOut)
    {
        uint256 poolIn  = isYes ? noPool  : yesPool;
        uint256 poolOut = isYes ? yesPool : noPool;
        // k = poolIn * poolOut
        // new poolIn = poolIn + usdcIn
        // new poolOut = k / new poolIn
        // sharesOut = poolOut - new poolOut
        uint256 k          = poolIn * poolOut;
        uint256 newPoolIn  = poolIn + usdcIn;
        uint256 newPoolOut = k / newPoolIn;
        sharesOut          = poolOut - newPoolOut;
    }

    /// @dev USDC out for a given shares in (CPMM reverse)
    function _calcSell(bool isYes, uint256 sharesIn)
        internal view returns (uint256 usdcOut)
    {
        uint256 poolIn  = isYes ? yesPool : noPool;
        uint256 poolOut = isYes ? noPool  : yesPool;
        uint256 k          = poolIn * poolOut;
        uint256 newPoolIn  = poolIn + sharesIn;
        uint256 newPoolOut = k / newPoolIn;
        usdcOut            = poolOut - newPoolOut;
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    /// @notice Current YES probability (0-100, scaled by 1e4 = basis points)
    function yesProbabilityBps() external view returns (uint256) {
        if (yesPool + noPool == 0) return 5000;
        return (noPool * 10_000) / (yesPool + noPool);
    }

    function getPosition(address user) external view returns (uint256 yes, uint256 no) {
        return (positions[user].yesShares, positions[user].noShares);
    }
}
