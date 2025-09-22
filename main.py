import json
import os
import requests
from web3 import Web3
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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

def getTransactionCount(url, address, token, block_parameter="latest"):
    """Get the transaction count for an address."""
    logging.info(f'📊 Getting transaction count for address: {address}')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "jsonrpc": "2.0",
        "method": "eth_getTransactionCount",
        "params": [address, block_parameter],
        "id": 1
    }
    
    response = requests.post(f"{url}/v1/?token={token}", data=json.dumps(data), headers=headers)
    if response.status_code != 200:
        logging.error(f'❌ Failed to get transaction count: {response.status_code}')
        return None
    
    result = response.json()
    
    # Convert hex transaction count to decimal
    if 'result' in result:
        tx_count_hex = result['result']
        tx_count_decimal = int(tx_count_hex, 16)
        logging.info(f'🔢 Transaction count: {tx_count_decimal}')
        return tx_count_decimal
    
    return result

def getSessionKey(url, token):
    """Get the session key from the network."""
    logging.info(f'🔑 Getting session key')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "method": "eth_getStorageAt",
        "params": [
            "0x0000000000000000000000000000000000000003", "", "0x0"
        ],
        "id": 1,
        "jsonrpc": "2.0"
    }
    
    response = requests.post(f"{url}/v1/?token={token}", data=json.dumps(data), headers=headers)
    if response.status_code != 200:
        logging.error(f'❌ Failed to get session key: {response.status_code}')
        return None
    
    result = response.json()
    
    # Extract session key from result
    if 'result' in result:
        session_key = result['result']
        logging.info(f'🔑 Session key: {session_key}')
        return session_key
    
    return result

def requestFaucetFunds(faucet_url, address):
    """Request funds from the faucet for the given address."""
    logging.info(f'💰 Requesting faucet funds for address: {address}')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "address": address
    }

    response = requests.post(f"{faucet_url}/fund/eth", data=json.dumps(data), headers=headers)
    if response.status_code != 200:
        logging.error(f'❌ Failed to request faucet funds: {response.status_code}')
        return None
    
    result = response.json()
    logging.info(f'💰 Faucet response: {result}')
    return result

def getBalance(url, address, token, block_parameter="latest"):
    """Get the balance for an address."""
    logging.info(f'💳 Getting balance for address: {address}')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "method": "eth_getBalance",
        "params": [address, block_parameter],
        "id": 1,
        "jsonrpc": "2.0"
    }
    
    response = requests.post(f"{url}/v1/?token={token}", data=json.dumps(data), headers=headers)
    if response.status_code != 200:
        logging.error(f'❌ Failed to get balance: {response.status_code}')
        return None
    
    result = response.json()
    
    # Convert hex balance to decimal (in wei)
    if 'result' in result:
        balance_hex = result['result']
        balance_wei = int(balance_hex, 16)
        balance_eth = balance_wei / 10**18  # Convert wei to ETH
        logging.info(f'💳 Balance: {balance_wei} wei ({balance_eth:.6f} ETH)')
        return balance_wei
    
    return result

# Example usage:
if __name__ == "__main__":
    base_url = "https://testnet-rpc.ten.xyz"
    faucet_url = os.getenv("FAUCET_URL", "")

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
    
    # Get transaction count for the account
    tx_count = getTransactionCount(base_url, account.address, token)
    
    # Get session key
    session_key = getSessionKey(base_url, token)
    if session_key is None:
        logging.error('❌ No session key available to get transaction count')
        exit(1)
    
    session_key_tx_count = getTransactionCount(base_url, session_key, token)
    
    # Get balance before faucet
    balance_before = getBalance(base_url, account.address, token)
    
    # Request funds from faucet
    faucet_response = requestFaucetFunds(faucet_url, account.address)
    
    # Get balance after faucet
    balance_after = getBalance(base_url, account.address, token)
    
    logging.info('🎊 Completed')
