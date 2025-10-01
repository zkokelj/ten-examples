import 'dotenv/config';
import { ethers } from 'ethers';

async function main() {
  const base = process.env.TEN_RPC_URL;
  const token = process.env.TEN_AUTH_TOKEN;
  const skAddress = process.env.TEN_SESSION_KEY_ADDRESS;
  if (!base) {
    console.error('Missing TEN_RPC_URL in .env (base TEN RPC URL)');
    process.exit(1);
  }
  if (!token) {
    console.error('Missing TEN_AUTH_TOKEN in .env');
    process.exit(1);
  }

  // Normalize base (strip trailing slash)
  console.log("Printing network config");
  const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;
  const url = `${baseUrl}/v1/network-config/?token=${token}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    console.error('Request failed', res.status, res.statusText);
    const text = await res.text().catch(() => '');
    if (text) console.error(text);
    process.exit(1);
  }
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));

  if (!skAddress) {
    console.warn('TEN_SESSION_KEY_ADDRESS not set; skipping transfer and balance lookup');
    return;
  }

  console.log("\nPrinting session key balance");
  const rpcUrl = `${baseUrl}/v1/?token=${token}`;
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getBalance',
    params: [skAddress, 'latest']
  };
  const balRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!balRes.ok) {
    console.error('Balance request failed', balRes.status, balRes.statusText);
    const text = await balRes.text().catch(() => '');
    if (text) console.error(text);
    process.exit(1);
  }
  const balJson = await balRes.json();
  if (balJson.error) {
    console.error('RPC error:', balJson.error);
    process.exit(1);
  }
  const balHex = balJson.result || '0x0';
  const wei = BigInt(balHex);
  const ether = (() => {
    const denom = 10n ** 18n;
    const whole = wei / denom;
    const frac = wei % denom;
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
    return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
  })();
  console.log('session_key_balance_wei:', wei.toString());
  console.log('session_key_balance_eth:', ether);

  // Transfer 0.01 ETH from TEN_ACCOUNT using TEN_PRIVATE_KEY to the session key
  const sender = process.env.TEN_ACCOUNT;
  const pk = process.env.TEN_PRIVATE_KEY;
  if (!sender || !pk) {
    console.warn('TEN_ACCOUNT or TEN_PRIVATE_KEY not set; skipping funding transfer');
    return;
  }

  console.log("\nTransferring 0.01 ETH to session key...");
  const provider = new ethers.JsonRpcProvider(`${baseUrl}/v1/?token=${token}`);
  const wallet = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
  const fromAddr = await wallet.getAddress();
  if (fromAddr.toLowerCase() !== sender.toLowerCase()) {
    console.warn(`TEN_ACCOUNT (${sender}) does not match derived wallet address (${fromAddr}). Proceeding anyway.`);
  }
  const tx = await wallet.sendTransaction({ to: skAddress, value: ethers.parseEther('0.01') });
  await tx.wait();
  console.log('Funding tx hash:', tx.hash);

  // Query balance again
  console.log("\nPrinting session key balance after funding");
  const balRes2 = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, id: 2 })
  });
  if (!balRes2.ok) {
    console.error('Balance request failed', balRes2.status, balRes2.statusText);
    const text = await balRes2.text().catch(() => '');
    if (text) console.error(text);
    process.exit(1);
  }
  const balJson2 = await balRes2.json();
  if (balJson2.error) {
    console.error('RPC error:', balJson2.error);
    process.exit(1);
  }
  const balHex2 = balJson2.result || '0x0';
  const wei2 = BigInt(balHex2);
  const ether2 = (() => {
    const denom = 10n ** 18n;
    const whole = wei2 / denom;
    const frac = wei2 % denom;
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
    return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
  })();
  console.log('session_key_balance_wei_after:', wei2.toString());
  console.log('session_key_balance_eth_after:', ether2);

  // Optional: Transfer ERC20 tokens to the session key if configured
  const tokenAddress = process.env.TEN_TOKEN_ADDRESS;
  const tokenAmountWeiEnv = process.env.TEN_TOKEN_AMOUNT_WEI;
  const tokenAmountUnitsEnv = process.env.TEN_TOKEN_AMOUNT; // human units, e.g., "100"
  if (tokenAddress && (tokenAmountWeiEnv || tokenAmountUnitsEnv)) {
    console.log("\nTransferring ERC20 tokens to session key...");
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    let amountWei;
    if (tokenAmountWeiEnv) {
      amountWei = BigInt(tokenAmountWeiEnv);
    } else {
      const decimals = await token.decimals();
      const units = BigInt(tokenAmountUnitsEnv || '0');
      amountWei = units * (10n ** BigInt(decimals));
    }
    const tx2 = await token.transfer(skAddress, amountWei);
    await tx2.wait();
    console.log('Token transfer tx hash:', tx2.hash);

    // Fetch SK token balance
    const skTokenBal = await token.balanceOf(skAddress);
    console.log('session_key_token_balance_wei:', skTokenBal.toString());
  } else {
    console.log('\nTEN_TOKEN_ADDRESS and TEN_TOKEN_AMOUNT[_WEI] not set; skipping token transfer');
  }

  // Refund 0.01 ETH from session key back to original account (gateway-signed)
  const refundTo = process.env.TEN_ACCOUNT;
  if (refundTo) {
    console.log("\nRefunding 0.005 ETH from session key to original account...");
    const valueHex = '0x' + ethers.parseEther('0.005').toString(16);

    // Query gasPrice
    const gasPriceRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'eth_gasPrice', params: [] })
    });
    const gasPriceJson = await gasPriceRes.json();
    const gasPrice = gasPriceJson.result || '0x0';

    // Estimate gas
    const estimateRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'eth_estimateGas', params: [{ from: skAddress, to: refundTo, value: valueHex }] })
    });
    const estimateJson = await estimateRes.json();
    const gas = estimateJson.result || '0x5208'; // fallback 21000

    // Get pending nonce
    const nonceRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 13, method: 'eth_getTransactionCount', params: [skAddress, 'pending'] })
    });
    const nonceJson = await nonceRes.json();
    const nonce = nonceJson.result || '0x0';

    const refundPayload = {
      jsonrpc: '2.0',
      id: 3,
      method: 'eth_sendTransaction',
      params: [{ from: skAddress, to: refundTo, value: valueHex, gas, gasPrice, nonce }]
    };
    const refundRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundPayload)
    });
    if (!refundRes.ok) {
      console.error('Refund request failed', refundRes.status, refundRes.statusText);
      const text = await refundRes.text().catch(() => '');
      if (text) console.error(text);
      process.exit(1);
    }
    const refundJson = await refundRes.json();
    if (refundJson.error) {
      console.error('RPC error (refund):', refundJson.error);
      process.exit(1);
    }
    console.log('refund_tx_hash:', refundJson.result);
  } else {
    console.warn('TEN_ACCOUNT not set; skipping refund from session key');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


