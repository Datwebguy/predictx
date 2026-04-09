// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./PredictionMarket.sol";

/// @title ResolutionOracle
/// @notice Multi-signer oracle: requires M-of-N resolver signatures to resolve a market
contract ResolutionOracle is Ownable {
    using ECDSA for bytes32;

    uint256 public threshold;                       // min signatures needed
    mapping(address => bool) public isResolver;
    address[] public resolvers;

    // market => outcome => signers who voted
    mapping(address => mapping(uint8 => address[])) public votes;
    mapping(address => mapping(address => bool))    public hasVoted;

    event ResolverAdded(address resolver);
    event ResolverRemoved(address resolver);
    event VoteCast(address indexed market, address indexed resolver, uint8 outcome);
    event MarketResolved(address indexed market, uint8 outcome);

    constructor(address[] memory _resolvers, uint256 _threshold) Ownable(msg.sender) {
        require(_threshold > 0 && _threshold <= _resolvers.length, "Bad threshold");
        threshold = _threshold;
        for (uint256 i = 0; i < _resolvers.length; i++) {
            isResolver[_resolvers[i]] = true;
            resolvers.push(_resolvers[i]);
        }
    }

    /// @notice A resolver votes on the outcome of a market
    /// @param market   PredictionMarket address
    /// @param outcome  1=YES, 2=NO, 3=INVALID
    function castVote(address market, uint8 outcome) external {
        require(isResolver[msg.sender],       "Not a resolver");
        require(!hasVoted[market][msg.sender],"Already voted");
        require(outcome >= 1 && outcome <= 3, "Invalid outcome");

        hasVoted[market][msg.sender] = true;
        votes[market][outcome].push(msg.sender);

        emit VoteCast(market, msg.sender, outcome);

        // If threshold met, resolve on-chain
        if (votes[market][outcome].length >= threshold) {
            PredictionMarket(market).resolve(PredictionMarket.Outcome(outcome));
            emit MarketResolved(market, outcome);
        }
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function addResolver(address r) external onlyOwner {
        require(!isResolver[r], "Already resolver");
        isResolver[r] = true;
        resolvers.push(r);
        emit ResolverAdded(r);
    }

    function setThreshold(uint256 t) external onlyOwner {
        require(t > 0 && t <= resolvers.length, "Bad threshold");
        threshold = t;
    }

    function getVoteCount(address market, uint8 outcome) external view returns (uint256) {
        return votes[market][outcome].length;
    }
}
