import json
import requests
from web3 import Web3
import logging

# Configure logging
logging.basicConfig(
    format='%(asctime)s %(message)s',
    datefmt='%H:%M:%S',
    level=logging.INFO
)

def join(url):
    """Join the Ten network and get a token."""
    logging.info(f'🌐 Joining the network {url}')
    response = requests.get(
        f"{url}/v1/join/",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
    )
    token = response.text
    logging.info(f'✅ Joined the network with token {token}')
    return token

def sign(account, token, chainID=443):
    """Sign the authentication message with the account's private key."""
    logging.info(f'✍️ Signing message for registration with account: {account.address}')
    
    domain = {
        "name": "Ten",
        "version": "1.0",
        "chainId": chainID,
        "verifyingContract": "0x0000000000000000000000000000000000000000"
    }
    
    types = {
        "Authentication": [
            {"name": "Encryption Token", "type": "address"}
        ]
    }
    
    message = {
        "Encryption Token": f"0x{token}"
    }

    
    # Sign the message using web3.py's sign_typed_data
    w3 = Web3()
    signed_message = w3.eth.account.sign_typed_data(
        private_key=account.key,
        domain_data=domain,
        message_types=types,
        message_data=message
    )
    
    return signed_message.signature.hex()


def authenticate(url, account, token, signed_msg):
    """Authenticate the account with the signed message."""
    logging.info(f'🔐 Authenticating account {account.address}')
    
    response = requests.post(
        f"{url}/v1/authenticate/?token={token}",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        json={
            "signature": signed_msg,
            "address": account.address
        }
    )

    text = response.text
    if text == "success":
        logging.info(f'🎉 Authentication successful')
    else:
        logging.error(f'❌ Authentication failed: {text}')
        exit(1)
    
    return text

def getChainID(url):
    """Get the chain ID from the network."""
    logging.info(f'🔗 Getting chain ID from {url}')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "jsonrpc": "2.0",
        "method": "eth_chainId",
        "params": [],
        "id": 1
    }
    
    response = requests.post(f"{url}/v1/", data=json.dumps(data), headers=headers)
    if response.status_code != 200:
        logging.error(f'❌ Failed to get chain ID: {response.status_code}')
        return None
    
    result = response.json()
    
    # Convert hex chain ID to decimal
    if 'result' in result:
        chain_id_hex = result['result']
        chain_id_decimal = int(chain_id_hex, 16)
        logging.info(f'🆔 Chain ID (decimal): {chain_id_decimal}')
        return chain_id_decimal
    
    return result

# Example usage:
if __name__ == "__main__":
    base_url = "https://testnet-rpc.ten.xyz"

    # Create a new account
    w3 = Web3()
    account = w3.eth.account.create()

    print("Address:", account.address)
    print("Private key:", account._private_key.hex())

    # Get chain ID
    chain_id = getChainID(base_url)

    if chain_id is None:
        print("❌ Failed to get chain ID")
        exit(1)

    # Run the authentication flow
    token = join(base_url)
    signed_msg = sign(account, token, chain_id)
    authenticate(base_url, account, token, signed_msg)
    
    
    logging.info('🎊 Completed joining account')
