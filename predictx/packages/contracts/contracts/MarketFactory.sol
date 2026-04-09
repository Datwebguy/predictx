// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PredictionMarket.sol";

/// @title MarketFactory
/// @notice Deploys and tracks all PredictionMarket contracts on PredictX
contract MarketFactory is Ownable, ReentrancyGuard {
    // ─── State ────────────────────────────────────────────────────────────────
    address public immutable usdc;
    address public immutable oracle;
    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2%

    address[] public allMarkets;
    mapping(address => bool) public isMarket;
    mapping(address => MarketInfo) public marketInfo;

    struct MarketInfo {
        string  question;
        string  category;       // "crypto" | "sports" | "politics" | "tech"
        uint256 createdAt;
        uint256 resolvesAt;
        address creator;
        bool    resolved;
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    event MarketCreated(
        address indexed market,
        address indexed creator,
        string  question,
        string  category,
        uint256 resolvesAt
    );
    event MarketResolved(address indexed market, bool outcome);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _usdc, address _oracle) Ownable(msg.sender) {
        usdc   = _usdc;
        oracle = _oracle;
    }

    // ─── Create Market ────────────────────────────────────────────────────────
    /// @notice Deploy a new binary prediction market
    /// @param question   The yes/no question
    /// @param category   Topic category for UI filtering
    /// @param resolvesAt Unix timestamp when the market closes
    /// @param initLiquidity USDC amount (6 decimals) seeded by creator
    function createMarket(
        string calldata question,
        string calldata category,
        uint256 resolvesAt,
        uint256 initLiquidity
    ) external nonReentrant returns (address market) {
        require(resolvesAt > block.timestamp + 1 hours, "Too short");
        require(resolvesAt < block.timestamp + 90 days,  "Too long");
        require(bytes(question).length > 10,             "Question too short");

        market = address(
            new PredictionMarket(
                usdc,
                oracle,
                msg.sender,
                question,
                resolvesAt,
                PROTOCOL_FEE_BPS,
                initLiquidity
            )
        );

        // Seed initial liquidity from creator
        if (initLiquidity > 0) {
            IERC20(usdc).transferFrom(msg.sender, market, initLiquidity);
            PredictionMarket(market).seedLiquidity(initLiquidity);
        }

        allMarkets.push(market);
        isMarket[market] = true;
        marketInfo[market] = MarketInfo({
            question:   question,
            category:   category,
            createdAt:  block.timestamp,
            resolvesAt: resolvesAt,
            creator:    msg.sender,
            resolved:   false
        });

        emit MarketCreated(market, msg.sender, question, category, resolvesAt);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    function getMarkets(uint256 offset, uint256 limit)
        external view returns (address[] memory)
    {
        uint256 end = offset + limit > allMarkets.length
            ? allMarkets.length : offset + limit;
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allMarkets[i];
        }
        return result;
    }
}
