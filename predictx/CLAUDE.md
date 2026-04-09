# PredictX — AI-Powered Prediction Market

## Project Overview
A Polymarket-style decentralized prediction market deployed on Circle's Arc Testnet (EVM-compatible L1).
Users trade YES/NO shares on real-world events using USDC. No X/Twitter integration — pure web UI.

## Tech Stack

### Blockchain
- **Network:** Circle Arc Testnet (EVM, USDC as native gas token)
- **Contracts:** Solidity 0.8.24, Hardhat + Foundry
- **Standards:** ERC-4337 Account Abstraction, ERC-20 (USDC)
- **AMM:** Constant Product Market Maker (CPMM) for YES/NO shares

### Backend / AI Engine
- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Fastify
- **AI:** Anthropic Claude API (market creation, resolution, NLP)
- **Queue:** BullMQ + Redis
- **DB:** PostgreSQL + Prisma ORM
- **Cache:** Redis

### Frontend (Web)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Web3:** viem + wagmi
- **Wallet:** Privy (social login + embedded wallets)
- **State:** Zustand + React Query

### Mobile
- **Framework:** Expo (React Native)
- **Shared:** @predictx/shared package (types, utils, API client)

## Monorepo Structure
```
predictx/
├── apps/
│   ├── web/          # Next.js prediction market UI
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── contracts/    # Solidity smart contracts (Hardhat)
│   ├── shared/       # Shared types, utils, API client
│   └── ai-engine/    # Fastify API + AI resolution service
└── scripts/          # Deploy + seed scripts
```

## Key Contracts
- `MarketFactory.sol` — deploys individual prediction markets
- `PredictionMarket.sol` — holds USDC, YES/NO shares, CPMM AMM
- `ResolutionOracle.sol` — accepts AI-signed resolutions, verifies and pays out
- `AccountFactory.sol` — ERC-4337 smart account factory

## Environment Variables
See `.env.example` in each package. Never commit `.env` files.

## Branch Naming
- `feature/` prefix for new features
- `fix/` prefix for bug fixes
- `chore/` prefix for tooling/config

## Deployed Contracts (Arc Testnet)
- MarketFactory: 0x1C969004C2A6EfBE1059038A3553AAbF4AB99645
- ResolutionOracle: 0xF41aa79E3Db0b0c49607b06e813aE007b5F364E3
- Deployed: 2026-04-05
- Deployer: 0x675cd4F60799239CBE6FD13ADa261E335022c62e
- Explorer: https://testnet.arcscan.app

## Important Notes
- Arc Testnet RPC: https://rpc.testnet.arc.network
- Chain ID: 5042002
- USDC Address: 0x3600000000000000000000000000000000000000
- USDC on Arc is the native gas token — no ETH needed
- All monetary values stored as USDC with 6 decimal places
- ERC-4337 bundler: use Pimlico or Alchemy's bundler (Arc-compatible)
- Market resolution: multi-source AI consensus before on-chain submission

## Running the Project
```bash
# Install dependencies
yarn install

# Start web dev server
yarn dev:web

# Start API server
yarn dev:api

# Compile contracts
yarn build:contracts

# Deploy to Arc testnet
yarn deploy:testnet
```
