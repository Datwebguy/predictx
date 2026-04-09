import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // On Arc testnet, replace with real USDC address from Circle
  const USDC_ADDRESS = process.env.USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000";

  // Deploy ResolutionOracle (3 resolvers, 2-of-3 threshold)
  const isAddr = (v?: string) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
  const resolverAddresses = [
    deployer.address,
    isAddr(process.env.RESOLVER_2) ? process.env.RESOLVER_2! : deployer.address,
    isAddr(process.env.RESOLVER_3) ? process.env.RESOLVER_3! : deployer.address,
  ];
  const Oracle = await ethers.getContractFactory("ResolutionOracle");
  const oracle = await Oracle.deploy(resolverAddresses, 2);
  await oracle.waitForDeployment();
  console.log("ResolutionOracle:", await oracle.getAddress());

  // Deploy MarketFactory
  const Factory = await ethers.getContractFactory("MarketFactory");
  const factory = await Factory.deploy(USDC_ADDRESS, await oracle.getAddress());
  await factory.waitForDeployment();
  console.log("MarketFactory:", await factory.getAddress());

  console.log("\n✅ Deployment complete. Add these to your .env:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${await factory.getAddress()}`);
  console.log(`NEXT_PUBLIC_ORACLE_ADDRESS=${await oracle.getAddress()}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
