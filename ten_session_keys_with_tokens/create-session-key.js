import 'dotenv/config';

function extractAddressFromPacked(packed) {
  if (typeof packed !== 'string' || !packed.startsWith('0x') || packed.length < 42) return null;
  const hex = packed.slice(2);
  const last40 = hex.slice(-40);
  return '0x' + last40;
}

async function main() {
  const base = process.env.TEN_RPC_URL;
  const token = process.env.TEN_AUTH_TOKEN;
  if (!base) {
    console.error('Missing TEN_RPC_URL in .env');
    process.exit(1);
  }
  if (!token) {
    console.error('Missing TEN_AUTH_TOKEN in .env');
    process.exit(1);
  }

  const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;
  const rpcUrl = `${baseUrl}/v1/?token=${token}`;

  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getStorageAt',
    params: [
      '0x0000000000000000000000000000000000000003',
      '',
      '0x0'
    ]
  };

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error('Request failed', res.status, res.statusText);
    const text = await res.text().catch(() => '');
    if (text) console.error(text);
    process.exit(1);
  }
  const json = await res.json();
  if (json.error) {
    console.error('RPC error:', json.error);
    process.exit(1);
  }
  const packed = json.result;
  const sk = extractAddressFromPacked(packed);
  console.log('raw_result:', packed);
  console.log('session_key_address:', sk);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


