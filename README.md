# RSA Digital Signature Laboratory 🔐

An educational, full-stack cryptographic web application demonstrating the **RSA Digital Signature Scheme (RSA-PSS with SHA-256)** between **Alice (Sender)** and **Bob (Receiver)**.

Built with **Python Flask**, the **Python `cryptography` library**, and **Vanilla HTML5 / CSS3 / JavaScript**.

---

## 📑 Table of Contents
1. [Overview & Cryptographic Principles](#overview--cryptographic-principles)
2. [Project Architecture](#project-architecture)
3. [Windows Setup & Installation](#windows-setup--installation)
4. [Running the Application](#running-the-application)
5. [Complete Practical Demonstration Workflow](#complete-practical-demonstration-workflow)
   - [Phase 1: RSA Key Generation](#phase-1-rsa-key-generation)
   - [Phase 2: Alice Signs a Message](#phase-2-alice-signs-a-message)
   - [Phase 3: Network Transmission to Bob](#phase-3-network-transmission-to-bob)
   - [Phase 4: Bob Verifies the Authentic Signature](#phase-4-bob-verifies-the-authentic-signature)
   - [Phase 5: Tampering Demonstration (Man-in-the-Middle Attack)](#phase-5-tampering-demonstration-man-in-the-middle-attack)
6. [Detailed Explanation of Cryptographic Operations](#detailed-explanation-of-cryptographic-operations)
7. [Digital Signatures vs Asymmetric Encryption](#digital-signatures-vs-asymmetric-encryption)
8. [Viva Voce Questions & Model Answers](#viva-voce-questions--model-answers)
9. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## 1. Overview & Cryptographic Principles

In modern computer security, a **Digital Signature** provides three fundamental security guarantees:
- 👤 **Authentication:** Mathematical proof of the signer's identity. Only the entity controlling Alice's private key could have produced the signature.
- 🛡️ **Data Integrity:** Proof that the message was not modified in transit, not even by a single bit.
- 📜 **Non-Repudiation:** The signer cannot credibly deny having originated and signed the message.

> **Important Note:** A digital signature **does not encrypt or conceal** the message. The message travels in plaintext alongside the signature. Anyone can read the message, but only the intended sender could have signed it, and any tampering causes verification to fail.

---

## 2. Project Architecture

```
c:\meow\css\needham\
│
├── app.py                   # Flask backend REST server & cryptographic engine
├── requirements.txt         # Python package dependencies (Flask, cryptography)
├── README.md                # Comprehensive documentation, setup guide & viva prep
│
├── templates/
│   └── index.html           # Modern responsive dashboard & Viva Voce modal
│
└── static/
    ├── style.css            # Dark-mode security dashboard styles & glassmorphism
    └── script.js            # Frontend logic, live hash visualizer & REST client
```

### Backend REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the single-page application interface |
| `GET / POST` | `/api/status` | Reports whether keys exist and current algorithm specifications |
| `POST` | `/api/generate-keys` | Generates 2048-bit RSA key pairs for Alice and Bob; returns PEM public keys |
| `POST` | `/api/sign` | Hashes message with SHA-256 and signs with Alice's private key via RSA-PSS |
| `POST` | `/api/verify` | Decodes Base64 signature, computes SHA-256, verifies with public key |
| `POST` | `/api/hash` | Computes SHA-256 hash for real-time Avalanche visualizer |

---

## 3. Windows Setup & Installation

### Prerequisites
- Windows 10 or 11
- Python 3.10+ installed and added to system `PATH` (Verify in terminal: `python --version`)
- Visual Studio Code or any code editor

### Step 1: Open Terminal in Project Directory
Open **PowerShell** or **Command Prompt** and navigate to the project directory:
```powershell
cd c:\meow\css\needham
```

### Step 2: Create a Python Virtual Environment
```powershell
python -m venv venv
```

### Step 3: Activate the Virtual Environment
- **In PowerShell:**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If PowerShell displays an `ExecutionPolicy` error, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

- **In Command Prompt (cmd.exe):**
  ```cmd
  venv\Scripts\activate.bat
  ```

### Step 4: Install Dependencies
```powershell
pip install -r requirements.txt
```

---

## 4. Running the Application

### Start the Flask Server
Run:
```powershell
python app.py
```

You will see:
```
==================================================
 RSA Digital Signature Demonstration Lab
 Running on http://127.0.0.1:5000
 Press Ctrl+C to stop.
==================================================
```

### Open the Application
Open your web browser (Chrome, Edge, Firefox) and navigate to:
```
http://127.0.0.1:5000
```

---

## 5. Complete Practical Demonstration Workflow

### Phase 1: RSA Key Generation
1. In the header or Step 1 card, click **"Generate RSA Keys"**.
2. **What happens under the hood:**
   - The backend runs `rsa.generate_private_key(public_exponent=65537, key_size=2048)` for both Alice and Bob.
   - Private keys remain **strictly in backend memory** and are never sent over the network.
   - Public keys are serialized into X.509 `SubjectPublicKeyInfo` PEM format (`-----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----`).
   - SHA-256 fingerprints are generated and displayed on screen.
3. Observe that Alice's and Bob's key cards change status to **Ready (2048-bit)**.

---

### Phase 2: Alice Signs a Message
1. In Alice's panel (Left), select a quick preset or type a custom message:
   - Preset: `Transfer $5,000 from Alice account #8492 to Bob account #1204. Authorized.`
2. Click **"Sign Message with Alice's Private Key"**.
3. **What happens under the hood:**
   - The backend encodes the message into UTF-8 bytes.
   - It computes the **SHA-256 hash** (a 256-bit / 64-hex-character digest).
   - It applies **RSA-PSS padding** (Probabilistic Signature Scheme with MGF1 and salt).
   - It signs the padded hash using Alice's RSA private exponent $d$:
     $$S = \text{PSS}(H)^d \pmod n$$
   - The raw 256-byte (2048-bit) signature is Base64 encoded for transmission.
4. Alice's panel displays:
   - **SHA-256 Message Digest**: 64 hex characters.
   - **RSA-PSS Digital Signature**: 344 Base64 characters.

---

### Phase 3: Network Transmission to Bob
1. Click **"Send Message, Signature & Public Key to Bob ➔"**.
2. Explain to the examiner:
   - The message is transmitted in **plaintext**. The signature does **not** encrypt the data.
   - Anyone eavesdropping on the channel can read the plaintext message.
   - However, the digital signature guarantees that Bob can verify the sender and detect any tampering.

---

### Phase 4: Bob Verifies the Authentic Signature
1. In Bob's panel (Right), verify that the received message, received signature, and Alice's public key are populated.
2. Click **"Verify Signature (RSA-PSS)"**.
3. **What happens under the hood:**
   - Bob's backend endpoint computes the SHA-256 hash $H_1$ directly on the received message bytes.
   - Using Alice's public key $(e, n)$, the backend verifies the 256-byte signature $S$ using `public_key.verify()`:
     $$\text{Decrypted Hash } H_2 = S^e \pmod n$$
   - Because $H_1 == H_2$, verification succeeds.
4. The screen displays the green **"SIGNATURE VALID (Verification Succeeded)"** banner:
   - ✓ Authentication confirmed: Alice is verified as the true sender.
   - ✓ Integrity confirmed: 0 characters or bits were modified.
   - ✓ Non-Repudiation evident: Alice cannot claim someone else signed it.

---

### Phase 5: Tampering Demonstration (Man-in-the-Middle Attack)
This phase proves the **Integrity** guarantee of digital signatures.

#### Experiment A: Modifying the Message
1. In the **Tampering Studio (Step 5)**, click **"Change $5,000 to $9,000"** (or **"Alter 1 Character"**).
2. Look at the **Avalanche Effect Visualizer**:
   - Alice's Original Hash vs Bob's Current Hash are shown side by side.
   - Changing just one number causes $>50\%$ of the hex characters to change completely.
3. In Bob's panel, click **"Verify Signature (RSA-PSS)"**.
4. The screen flashes the red **"SIGNATURE INVALID (Verification Failed)"** banner!
   - Cryptographic explanation: Bob's calculated hash $H_1$ does **not match** the hash recovered from Alice's signature $H_2$.
   - Tampering is immediately detected!

#### Experiment B: Corrupting the Signature
1. In the Tampering Studio, click **"Corrupt Signature (Flip Bits)"** or **"Truncate Signature"**.
2. In Bob's panel, click **"Verify Signature"**.
3. Verification fails immediately with `SIGNATURE_MISMATCH` or `MALFORMED_BASE64`.

#### Experiment C: Verifying with the Wrong Public Key
1. In Bob's panel, under *Public Key Used for Verification*, select **"Bob's Public Key (Wrong Key Test)"**.
2. Click **"Verify Signature"**.
3. Verification fails! This proves **Authentication**: a signature created with Alice's private key can **only** be verified with Alice's public key.

#### Experiment D: Resetting to Original
1. Click **"Restore Original Message"** and **"Restore Original Signature"**.
2. Click **"Verify Signature"**.
3. The result immediately returns to **VALID**.

---

## 6. Detailed Explanation of Cryptographic Operations

### 1. Key Generation ($n, e, d$)
- We select two large distinct prime numbers $p$ and $q$ (each 1024 bits long).
- Modulus: $n = p \times q$ (2048 bits).
- Euler's totient: $\phi(n) = (p - 1)(q - 1)$.
- Public exponent: $e = 65537$ ($2^{16} + 1$, Fermat prime $F_4$).
- Private exponent: $d = e^{-1} \pmod{\phi(n)}$.
- **Public Key:** $(e, n)$ — Shared with everyone.
- **Private Key:** $(d, n)$ — Kept strictly secret on the server.

### 2. Why Sign the Hash Instead of the Message?
1. **Computational Efficiency:** RSA operations are CPU-intensive modular exponentiations. Directly signing a 10 MB document would require hundreds of thousands of RSA blocks. Hashing condenses any arbitrary length document into a fixed 256 bits in milliseconds.
2. **Mathematical Modulus Limit:** An RSA key can only operate on numbers smaller than its modulus $n$ ($m < n$). For a 2048-bit key, the maximum block size is 256 bytes. A 256-bit SHA-256 hash (32 bytes) fits comfortably inside the modulus.

### 3. Why RSA-PSS instead of PKCS#1 v1.5?
- Older standards (PKCS#1 v1.5) are deterministic: the same message always yields the same signature.
- **RSA-PSS (Probabilistic Signature Scheme, PKCS#1 v2.1)** introduces a randomized salt and a Mask Generation Function (MGF1).
- Even if Alice signs the exact same message twice, the signature bytes are different each time, eliminating chosen-message attacks.
- RSA-PSS is provably secure in the Random Oracle Model.

---

## 7. Digital Signatures vs Asymmetric Encryption

| Feature | Digital Signature | Asymmetric Encryption |
| :--- | :--- | :--- |
| **Primary Goal** | Authenticity, Integrity & Non-Repudiation | Confidentiality (Secrecy) |
| **Key Used to Create** | Sender's (Alice's) **Private Key** | Recipient's (Bob's) **Public Key** |
| **Key Used to Verify / Decrypt** | Sender's (Alice's) **Public Key** | Recipient's (Bob's) **Private Key** |
| **Who Can Perform It?** | Only Alice (holding the private key) | Anyone with Bob's public key |
| **Who Can Verify / Read?** | Everyone who has Alice's public key | Only Bob (holding the private key) |
| **Is Message Readable in Transit?** | **YES** (Plaintext) | **NO** (Ciphertext) |
| **Standard Scheme** | RSA-PSS with SHA-256 | RSA-OAEP with SHA-256 |

---

## 8. Viva Voce Questions & Model Answers

### Q1: What is a Digital Signature and what security goals does it achieve?
**Answer:** A digital signature is a mathematical scheme based on asymmetric cryptography that binds a sender's identity to a digital document. It achieves three core goals:
1. **Authentication:** Confirms the sender's identity.
2. **Integrity:** Guarantees that the message has not been altered in transit.
3. **Non-repudiation:** Prevents the signer from denying having created the signature.

### Q2: Why is the private key used for signing and the public key for verification?
**Answer:** The private key is known only to the sender (Alice). Signing with the private key ensures that nobody else could have generated that signature. Because the public key is known to everyone, anyone can independently verify that the signature was created by Alice without needing access to her private key.

### Q3: What is the Avalanche Effect in hashing?
**Answer:** The avalanche effect is a property of cryptographic hash functions (such as SHA-256) where a tiny modification to the input (even flipping a single bit or adding a space) causes an unpredictable and drastic change in the output hash (typically $>50\%$ of the output bits flip). This makes any tampering immediately detectable during verification.

### Q4: What is the size of an RSA-2048 digital signature?
**Answer:** For a 2048-bit RSA key, the modulus $n$ is 2048 bits (256 bytes). Therefore, the raw cryptographic signature is always exactly **256 bytes** long. When encoded in Base64 for web transmission, it occupies 344 characters.

### Q5: Does a digital signature provide confidentiality?
**Answer:** No. Digital signatures provide authenticity and integrity, not confidentiality. The message travels as readable plaintext. If confidentiality is required, the sender must also encrypt the message using the recipient's public key or a symmetric key (such as AES in hybrid encryption).

### Q6: What is RSA-PSS and why is it superior to PKCS#1 v1.5?
**Answer:** RSA-PSS (Probabilistic Signature Scheme) is specified in PKCS#1 v2.1. Unlike deterministic schemes like PKCS#1 v1.5, RSA-PSS incorporates a randomized salt and a Mask Generation Function (MGF1). This guarantees that signing the same message multiple times produces different signatures, providing provable security against chosen-message forging attacks.

### Q7: What happens if Bob verifies Alice's signature using Bob's public key?
**Answer:** Verification fails (returns `INVALID`). The signature was created using Alice's private exponent $d_A$, which only inverts with Alice's public exponent $e_A \pmod{n_A}$. Decrypting with Bob's public key produces mathematical garbage that will never match the message hash.

### Q8: What is Non-Repudiation and why doesn't a digital signature guarantee it alone?
**Answer:** Non-repudiation means the sender cannot deny having signed the message. While a digital signature provides strong technical evidence, true legal non-repudiation also requires secure private-key custody (e.g., Hardware Security Modules/Smart Cards) and a trusted Public Key Infrastructure (PKI) with Certificate Authorities (CAs) to reliably bind public keys to real-world identities.

### Q9: Why is SHA-256 collision resistance important for digital signatures?
**Answer:** If an attacker could find two different messages $M_1$ and $M_2$ that produce the exact same SHA-256 hash ($H(M_1) = H(M_2)$), Alice's signature on innocent message $M_1$ would also be mathematically valid for fraudulent message $M_2$. SHA-256 has $2^{128}$ collision resistance, making collision generation computationally impossible with current technology.

### Q10: Why are private keys never exposed to the frontend or API responses?
**Answer:** The security of asymmetric cryptography depends entirely on the secrecy of the private key. If the private key were transmitted over the network or exposed in client JavaScript, any user or attacker could extract it and impersonate the sender, forging valid signatures for arbitrary messages.

---

## 9. Troubleshooting & FAQs

### 1. `Address already in use` or Port 5000 Conflict
If another process is using port 5000:
- Find the process using port 5000:
  ```powershell
  netstat -ano | findstr :5000
  ```
- Terminate the conflicting process by PID:
  ```powershell
  taskkill /F /PID <PID_NUMBER>
  ```
- Alternatively, run Flask on an alternate port:
  ```powershell
  $env:PORT=5050; python app.py
  ```

### 2. PowerShell Script Execution Policy Error
If activating the virtual environment throws:
`File ...\Activate.ps1 cannot be loaded because running scripts is disabled on this system.`
Run this in PowerShell:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 3. ModuleNotFoundError: No module named 'cryptography' or 'flask'
Ensure your virtual environment is activated before running:
```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Browser shows `ERR_CONNECTION_REFUSED`
Check the terminal where `python app.py` was executed to ensure the Flask development server is currently running.

---

## 👨‍🏫 Practical Examination Tip
During your viva presentation:
1. First, click **"Generate RSA Keys"** and explain the role of $e=65537$ and 2048-bit primes.
2. Sign the **Bank Wire** preset and point to the 64-character SHA-256 hash and 256-byte signature.
3. Click **"Send to Bob"** and verify the authentic signature (Green VALID).
4. Go to **Tampering Studio**, change `$5,000` to `$9,000`, highlight the Avalanche Effect, and click **Verify Signature** (Red INVALID).
5. Open the **"🎓 Viva & Demo Guide"** button in the header if you need a quick reminder of any theory!
