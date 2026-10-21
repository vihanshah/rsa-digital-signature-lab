"""
RSA Digital Signature Demonstration Web Application
Backend Server built with Python Flask and the cryptography library.
Demonstrates the RSA Digital Signature process (RSA-PSS with SHA-256) between Alice and Bob.
"""

import base64
import os
import time
from flask import Flask, render_template, request, jsonify
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm

app = Flask(__name__)

# Secret key for Flask session/security
app.config['SECRET_KEY'] = os.urandom(24).hex()

# In-memory key store for Alice and Bob
# In a real PKI, public keys are in X.509 certificates and private keys reside in HSMs/secure enclaves.
# For this educational lab, private keys are securely kept in server memory and NEVER returned to the client.
KEY_STORE = {
    'alice': {
        'private_key': None,
        'public_key': None,
        'public_key_pem': None,
        'fingerprint': None,
        'key_size': 2048,
        'created_at': None
    },
    'bob': {
        'private_key': None,
        'public_key': None,
        'public_key_pem': None,
        'fingerprint': None,
        'key_size': 2048,
        'created_at': None
    }
}

# Keep track of last signed message from Alice for transfer convenience
LAST_SIGNED_PAYLOAD = {
    'message': '',
    'hash_hex': '',
    'signature_b64': '',
    'timestamp': None
}


def compute_public_key_fingerprint(public_key) -> str:
    """Compute a readable SHA-256 fingerprint (in hex colon-separated format) of the public key bytes."""
    der_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    digest = hashes.Hash(hashes.SHA256())
    digest.update(der_bytes)
    fingerprint_bytes = digest.finalize()
    hex_str = fingerprint_bytes.hex().upper()
    return ':'.join(hex_str[i:i+2] for i in range(0, 32, 2))  # Display first 16 bytes for readability


@app.route('/')
def index():
    """Render the main single-page application dashboard."""
    return render_template('index.html')


@app.route('/api/status', methods=['GET', 'POST'])
def get_status():
    """Return the current key generation and crypto status."""
    keys_ready = (KEY_STORE['alice']['public_key'] is not None and 
                  KEY_STORE['bob']['public_key'] is not None)
    
    return jsonify({
        'status': 'ready' if keys_ready else 'no_keys',
        'alice': {
            'has_keys': KEY_STORE['alice']['public_key'] is not None,
            'public_key_pem': KEY_STORE['alice']['public_key_pem'],
            'fingerprint': KEY_STORE['alice']['fingerprint'],
            'key_size': KEY_STORE['alice']['key_size']
        },
        'bob': {
            'has_keys': KEY_STORE['bob']['public_key'] is not None,
            'public_key_pem': KEY_STORE['bob']['public_key_pem'],
            'fingerprint': KEY_STORE['bob']['fingerprint'],
            'key_size': KEY_STORE['bob']['key_size']
        },
        'crypto_spec': {
            'key_type': 'RSA',
            'key_size_bits': 2048,
            'public_exponent': 65537,
            'hash_algorithm': 'SHA-256 (256 bits)',
            'signature_scheme': 'RSA-PSS (Probabilistic Signature Scheme)',
            'mgf': 'MGF1 with SHA-256',
            'salt_length': 'PSS.MAX_LENGTH'
        },
        'last_signed': LAST_SIGNED_PAYLOAD
    })


@app.route('/api/generate-keys', methods=['POST'])
def generate_keys():
    """
    Step 1: Generate distinct RSA-2048 key pairs for Alice and Bob.
    The private keys remain safely in backend memory.
    Only the public keys (PEM format) and fingerprints are returned to the client.
    """
    try:
        # Generate Alice's RSA Key Pair
        alice_priv = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        alice_pub = alice_priv.public_key()
        alice_pub_pem = alice_pub.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        alice_fp = compute_public_key_fingerprint(alice_pub)

        KEY_STORE['alice']['private_key'] = alice_priv
        KEY_STORE['alice']['public_key'] = alice_pub
        KEY_STORE['alice']['public_key_pem'] = alice_pub_pem
        KEY_STORE['alice']['fingerprint'] = alice_fp
        KEY_STORE['alice']['created_at'] = time.time()

        # Generate Bob's RSA Key Pair
        bob_priv = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        bob_pub = bob_priv.public_key()
        bob_pub_pem = bob_pub.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        bob_fp = compute_public_key_fingerprint(bob_pub)

        KEY_STORE['bob']['private_key'] = bob_priv
        KEY_STORE['bob']['public_key'] = bob_pub
        KEY_STORE['bob']['public_key_pem'] = bob_pub_pem
        KEY_STORE['bob']['fingerprint'] = bob_fp
        KEY_STORE['bob']['created_at'] = time.time()

        return jsonify({
            'success': True,
            'message': 'RSA-2048 key pairs successfully generated for Alice and Bob.',
            'alice': {
                'name': 'Alice (Sender)',
                'public_key_pem': alice_pub_pem,
                'fingerprint': alice_fp,
                'key_size': 2048,
                'status': 'Private key stored securely on server memory; Public key ready.'
            },
            'bob': {
                'name': 'Bob (Receiver)',
                'public_key_pem': bob_pub_pem,
                'fingerprint': bob_fp,
                'key_size': 2048,
                'status': 'Private key stored securely on server memory; Public key ready.'
            },
            'parameters': {
                'algorithm': 'RSA',
                'key_size_bits': 2048,
                'public_exponent': 65537,
                'signature_scheme': 'RSA-PSS (Probabilistic Signature Scheme)',
                'hash_function': 'SHA-256'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Key generation failed: {str(e)}'
        }), 500


@app.route('/api/sign', methods=['POST'])
def sign_message():
    """
    Step 2: Alice signs a plaintext message using her RSA private key.
    1. Encode plaintext message to exact UTF-8 bytes.
    2. Compute SHA-256 digest of message bytes.
    3. Sign message bytes with Alice's RSA private key using RSA-PSS and SHA-256.
    4. Return signature in Base64 encoding alongside the SHA-256 digest.
    """
    data = request.get_json(silent=True)
    if not data or 'message' not in data:
        return jsonify({
            'success': False,
            'error': 'Missing required JSON field "message".'
        }), 400

    message = data.get('message', '')
    if not isinstance(message, str):
        return jsonify({
            'success': False,
            'error': 'Field "message" must be a string.'
        }), 400

    if not KEY_STORE['alice']['private_key']:
        return jsonify({
            'success': False,
            'error': 'Alice does not have an RSA key pair yet. Please generate keys first.'
        }), 400

    try:
        msg_bytes = message.encode('utf-8')

        # 1. Calculate SHA-256 digest of exact message bytes
        digest = hashes.Hash(hashes.SHA256())
        digest.update(msg_bytes)
        hash_bytes = digest.finalize()
        hash_hex = hash_bytes.hex()

        # 2. Sign using Alice's private key with RSA-PSS padding and SHA-256
        alice_private_key = KEY_STORE['alice']['private_key']
        raw_signature = alice_private_key.sign(
            msg_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        # 3. Base64 encode the 256-byte (2048-bit) signature
        sig_b64 = base64.b64encode(raw_signature).decode('utf-8')

        # Store last signed payload for UI "Send to Bob" state
        LAST_SIGNED_PAYLOAD['message'] = message
        LAST_SIGNED_PAYLOAD['hash_hex'] = hash_hex
        LAST_SIGNED_PAYLOAD['signature_b64'] = sig_b64
        LAST_SIGNED_PAYLOAD['timestamp'] = time.time()

        return jsonify({
            'success': True,
            'signer': 'Alice',
            'message': message,
            'message_length_bytes': len(msg_bytes),
            'hash_algorithm': 'SHA-256',
            'hash_hex': hash_hex,
            'signature_scheme': 'RSA-PSS',
            'signature_b64': sig_b64,
            'signature_bytes_len': len(raw_signature),
            'signature_bits_len': len(raw_signature) * 8,
            'status': 'Message successfully signed using Alice\'s RSA private key.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Signing operation failed: {str(e)}'
        }), 500


@app.route('/api/verify', methods=['POST'])
def verify_signature():
    """
    Step 4: Bob verifies the digital signature.
    1. Extracts received message, digital signature (Base64), and public key (PEM).
    2. Decodes Base64 signature safely without crashing.
    3. Recomputes SHA-256 digest of the received message.
    4. Verifies using RSA-PSS with SHA-256 and the provided public key.
    5. Returns VALID or INVALID with detailed cryptographic explanation.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            'valid': False,
            'error_type': 'INVALID_REQUEST',
            'explanation': 'Invalid or missing JSON payload in request.'
        }), 400

    message = data.get('message', '')
    signature_b64 = data.get('signature', '').strip()
    pubkey_pem = data.get('public_key', '').strip()

    if not isinstance(message, str):
        return jsonify({
            'valid': False,
            'error_type': 'BAD_INPUT',
            'explanation': 'Message field must be a string.'
        }), 400

    if not signature_b64:
        return jsonify({
            'valid': False,
            'error_type': 'MISSING_SIGNATURE',
            'explanation': 'Verification failed: No signature provided to verify.'
        }), 200

    # 1. Resolve Public Key: If provided, load it; otherwise fallback to Alice's stored key
    public_key_to_use = None
    if pubkey_pem:
        try:
            public_key_to_use = serialization.load_pem_public_key(pubkey_pem.encode('utf-8'))
        except Exception as e:
            return jsonify({
                'valid': False,
                'error_type': 'INVALID_PUBLIC_KEY',
                'explanation': f'Failed to parse public key: {str(e)}. Must be valid PEM formatted RSA public key.',
                'received_hash_hex': None
            }), 200
    else:
        public_key_to_use = KEY_STORE['alice']['public_key']
        if not public_key_to_use:
            return jsonify({
                'valid': False,
                'error_type': 'NO_PUBLIC_KEY_AVAILABLE',
                'explanation': 'No public key provided and Alice\'s key pair has not been generated yet.'
            }), 200

    # 2. Decode the Base64 signature safely
    try:
        raw_signature = base64.b64decode(signature_b64, validate=True)
    except Exception as e:
        return jsonify({
            'valid': False,
            'error_type': 'MALFORMED_BASE64',
            'explanation': f'Invalid signature format: Base64 decoding failed ({str(e)}). Signature data has been corrupted.',
            'received_hash_hex': None
        }), 200

    # Check signature length for 2048-bit RSA key (must be exactly 256 bytes)
    if len(raw_signature) != 256:
        return jsonify({
            'valid': False,
            'error_type': 'INVALID_SIGNATURE_LENGTH',
            'explanation': f'Invalid signature length: {len(raw_signature)} bytes ({len(raw_signature)*8} bits). For RSA-2048, signature must be exactly 256 bytes (2048 bits).',
            'received_hash_hex': None
        }), 200

    # 3. Calculate SHA-256 digest of received message for educational inspection
    msg_bytes = message.encode('utf-8')
    digest = hashes.Hash(hashes.SHA256())
    digest.update(msg_bytes)
    received_hash_hex = digest.finalize().hex()

    # 4. Perform RSA-PSS signature verification using cryptography library
    try:
        public_key_to_use.verify(
            raw_signature,
            msg_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        return jsonify({
            'valid': True,
            'verdict': 'VALID',
            'message': message,
            'received_hash_hex': received_hash_hex,
            'signature_scheme': 'RSA-PSS with SHA-256',
            'signature_length_bytes': len(raw_signature),
            'explanation': (
                'Signature verification SUCCEEDED! '
                'Mathematical proof confirms that the message was signed by the holder of the corresponding '
                'private key (Alice) and has NOT been modified or tampered with in transit.'
            ),
            'security_guarantees': {
                'authentication': 'CONFIRMED: Alice is verified as the true sender.',
                'integrity': 'CONFIRMED: The exact bytes of the message match the signed digest bit-for-bit.',
                'non_repudiation': 'EVIDENT: Alice cannot deny creating this signature with her private key.'
            }
        }), 200

    except InvalidSignature:
        return jsonify({
            'valid': False,
            'verdict': 'INVALID',
            'error_type': 'SIGNATURE_MISMATCH',
            'message': message,
            'received_hash_hex': received_hash_hex,
            'signature_scheme': 'RSA-PSS with SHA-256',
            'explanation': (
                'Signature verification FAILED! '
                'The decrypted signature hash does NOT match the SHA-256 digest of the received message. '
                'Either the message was modified/tampered with after signing, or the signature was altered, '
                'or it was signed with a completely different private key.'
            ),
            'security_guarantees': {
                'authentication': 'UNVERIFIED: Could not authenticate sender with the supplied public key.',
                'integrity': 'VIOLATED: Data tampering detected or signature altered.',
                'non_repudiation': 'INVALIDATED: Cannot bind sender identity to altered message.'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'valid': False,
            'verdict': 'ERROR',
            'error_type': 'VERIFICATION_ERROR',
            'explanation': f'Verification process encountered an unexpected cryptographic error: {str(e)}',
            'received_hash_hex': received_hash_hex
        }), 200


@app.route('/api/hash', methods=['POST'])
def compute_hash():
    """
    Helper educational endpoint: Compute SHA-256 hash of any input string.
    Useful for live side-by-side comparison of original vs tampered message hashes.
    """
    data = request.get_json(silent=True) or {}
    message = data.get('message', '')
    msg_bytes = message.encode('utf-8')
    
    digest = hashes.Hash(hashes.SHA256())
    digest.update(msg_bytes)
    hash_hex = digest.finalize().hex()

    return jsonify({
        'message': message,
        'hash_hex': hash_hex,
        'hash_length_bits': 256,
        'byte_length': len(msg_bytes)
    })


if __name__ == '__main__':
    # Local development server for educational demonstration
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f" RSA Digital Signature Demonstration Lab")
    print(f" Running on http://127.0.0.1:{port}")
    print(f" Press Ctrl+C to stop.")
    print(f"==================================================")
    app.run(host='127.0.0.1', port=port, debug=False)
