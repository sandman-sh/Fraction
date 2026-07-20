import { GatewayClient } from "@circle-fin/x402-batching/client";
import fs from "fs";
import path from "path";

// Simple manual dotenv load at startup
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env file:", e);
}

const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error("set PRIVATE_KEY to your MetaMask Arc-testnet wallet's key");
  console.error('  export PRIVATE_KEY=0x...');
  console.error('  tsx buyer.ts');
  process.exit(1);
}

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: pk as `0x${string}`,
});

const url = process.argv[2] ?? "http://localhost:3002/hello-world";
console.log(`paying ${url}`);

const { status, data } = await client.pay(url);
console.log(`status: ${status}`);
console.log("data:", data);
