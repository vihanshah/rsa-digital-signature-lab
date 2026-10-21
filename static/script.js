/**
 * RSA Digital Signature Laboratory - Frontend Controller
 * Handles user interactions, REST API communication with Flask backend,
 * live cryptographic state tracking, tampering simulations, and viva modal.
 */

// Global Application State
const state = {
    keysGenerated: false,
    alicePublicKeyPem: '',
    bobPublicKeyPem: '',
    aliceFingerprint: '',
    bobFingerprint: '',
    aliceOriginalMessage: '',
    aliceOriginalHash: '',
    aliceOriginalSignature: '',
    receivedMessage: '',
    receivedSignature: '',
    isTampered: false
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    updateCharCounter();
    checkBackendStatus();
}

/**
 * Check if the backend already has keys stored (e.g. after page refresh)
 */
async function checkBackendStatus() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.alice.has_keys && data.bob.has_keys) {
            state.keysGenerated = true;
            state.alicePublicKeyPem = data.alice.public_key_pem;
            state.bobPublicKeyPem = data.bob.public_key_pem;
            state.aliceFingerprint = data.alice.fingerprint;
            state.bobFingerprint = data.bob.fingerprint;
            
            updateKeyCardsUI();
            enableSigningUI();
            showToast('Existing RSA keys restored from session.', 'success');
        }
    } catch (err) {
        console.warn('Backend status check:', err);
    }
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
    // Step 1: Generate RSA Keys Button
    const btnGenKeys = document.getElementById('btn-generate-keys');
    if (btnGenKeys) {
        btnGenKeys.addEventListener('click', handleGenerateKeys);
    }

    // Step 2: Preset Chips
    const presetChips = document.querySelectorAll('.chip');
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const msg = chip.getAttribute('data-msg');
            const msgInput = document.getElementById('alice-message-input');
            if (msgInput && msg) {
                msgInput.value = msg;
                updateCharCounter();
                showToast('Preset message loaded.', 'info');
            }
        });
    });

    // Step 2: Message Input Char/Byte Counter
    const aliceMsgInput = document.getElementById('alice-message-input');
    if (aliceMsgInput) {
        aliceMsgInput.addEventListener('input', updateCharCounter);
    }

    // Step 2: Sign Message Button
    const btnSign = document.getElementById('btn-sign-message');
    if (btnSign) {
        btnSign.addEventListener('click', handleSignMessage);
    }

    // Step 3: Send to Bob Button
    const btnSendToBob = document.getElementById('btn-send-to-bob');
    if (btnSendToBob) {
        btnSendToBob.addEventListener('click', handleSendToBob);
    }

    // Step 4: Bob's Received Message Input (Live Hash & Tampering Detection)
    const bobMsgInput = document.getElementById('bob-received-message');
    if (bobMsgInput) {
        bobMsgInput.addEventListener('input', handleBobMessageInput);
    }

    // Step 4: Bob's Received Signature Input
    const bobSigInput = document.getElementById('bob-received-signature');
    if (bobSigInput) {
        bobSigInput.addEventListener('input', handleBobSignatureInput);
    }

    // Step 4: Bob Public Key Selector (Alice's Authentic Key vs Bob's Key)
    const keyChoiceRadios = document.querySelectorAll('input[name="verify-key-choice"]');
    keyChoiceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const verifyPubkeyArea = document.getElementById('bob-verification-pubkey');
            if (e.target.value === 'alice') {
                verifyPubkeyArea.value = state.alicePublicKeyPem;
                showToast("Using Alice's Public Key for verification.", 'info');
            } else {
                verifyPubkeyArea.value = state.bobPublicKeyPem;
                showToast("Using Bob's Public Key (wrong key test!).", 'info');
            }
        });
    });

    // Step 4: Verify Signature Button
    const btnVerify = document.getElementById('btn-verify-signature');
    if (btnVerify) {
        btnVerify.addEventListener('click', handleVerifySignature);
    }

    // Step 5: Tamper Buttons
    document.getElementById('btn-tamper-char')?.addEventListener('click', tamperAlterCharacter);
    document.getElementById('btn-tamper-amount')?.addEventListener('click', tamperAlterAmount);
    document.getElementById('btn-tamper-append')?.addEventListener('click', tamperAppendWhitespace);
    document.getElementById('btn-reset-message')?.addEventListener('click', resetBobMessage);

    document.getElementById('btn-tamper-sig')?.addEventListener('click', tamperCorruptSignature);
    document.getElementById('btn-tamper-sig-trunc')?.addEventListener('click', tamperTruncateSignature);
    document.getElementById('btn-reset-sig')?.addEventListener('click', resetBobSignature);

    // Copy to Clipboard buttons
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const textToCopy = targetEl.innerText || targetEl.value;
                copyToClipboard(textToCopy, btn);
            }
        });
    });

    // Viva & Demo Guide Modal
    setupVivaModal();
}

/**
 * Update character and UTF-8 byte counters for Alice's message input
 */
function updateCharCounter() {
    const input = document.getElementById('alice-message-input');
    const charCountEl = document.getElementById('alice-char-count');
    const byteCountEl = document.getElementById('alice-byte-count');
    if (!input || !charCountEl || !byteCountEl) return;

    const text = input.value;
    const chars = text.length;
    const bytes = new TextEncoder().encode(text).length;

    charCountEl.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    byteCountEl.textContent = `${bytes} byte${bytes === 1 ? '' : 's'} (UTF-8)`;
}

/**
 * Step 1: Generate RSA Keys (calls POST /api/generate-keys)
 */
async function handleGenerateKeys() {
    const btn = document.getElementById('btn-generate-keys');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Generating 2048-bit Keys...</span>';

    try {
        const response = await fetch('/api/generate-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to generate keys');
        }

        state.keysGenerated = true;
        state.alicePublicKeyPem = data.alice.public_key_pem;
        state.bobPublicKeyPem = data.bob.public_key_pem;
        state.aliceFingerprint = data.alice.fingerprint;
        state.bobFingerprint = data.bob.fingerprint;

        updateKeyCardsUI();
        enableSigningUI();

        // Update workflow step to Step 2
        setWorkflowActiveStep(2);
        showToast('Generated 2048-bit RSA key pairs for Alice and Bob!', 'success');

    } catch (err) {
        console.error('Error generating keys:', err);
        showToast(`Key generation error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

/**
 * Update the UI key cards with public keys and fingerprints
 */
function updateKeyCardsUI() {
    // Alice
    const alicePubText = document.getElementById('alice-pubkey-text');
    const aliceFp = document.getElementById('alice-key-fp');
    const aliceStatus = document.getElementById('alice-key-status');
    if (alicePubText) alicePubText.textContent = state.alicePublicKeyPem;
    if (aliceFp) aliceFp.textContent = state.aliceFingerprint;
    if (aliceStatus) {
        aliceStatus.textContent = 'Ready (2048-bit)';
        aliceStatus.className = 'key-status-badge badge-ready';
    }

    // Bob
    const bobPubText = document.getElementById('bob-pubkey-text');
    const bobFp = document.getElementById('bob-key-fp');
    const bobStatus = document.getElementById('bob-key-status');
    if (bobPubText) bobPubText.textContent = state.bobPublicKeyPem;
    if (bobFp) bobFp.textContent = state.bobFingerprint;
    if (bobStatus) {
        bobStatus.textContent = 'Ready (2048-bit)';
        bobStatus.className = 'key-status-badge badge-ready';
    }

    // Bob Verification Public Key default is Alice's public key
    const verifyPubkeyArea = document.getElementById('bob-verification-pubkey');
    if (verifyPubkeyArea) {
        const choice = document.querySelector('input[name="verify-key-choice"]:checked')?.value;
        verifyPubkeyArea.value = (choice === 'bob') ? state.bobPublicKeyPem : state.alicePublicKeyPem;
    }
}

function enableSigningUI() {
    const btnSign = document.getElementById('btn-sign-message');
    const helpText = document.getElementById('sign-help-text');
    if (btnSign) btnSign.disabled = false;
    if (helpText) helpText.textContent = "Click to calculate SHA-256 and sign with Alice's private key.";
}

/**
 * Step 2: Alice Signs Message (calls POST /api/sign)
 */
async function handleSignMessage() {
    const input = document.getElementById('alice-message-input');
    const message = input ? input.value : '';

    if (!message) {
        showToast('Please type a message to sign.', 'error');
        return;
    }

    const btn = document.getElementById('btn-sign-message');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Computing Hash & RSA-PSS Signature...</span>';

    try {
        const response = await fetch('/api/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Signing operation failed');
        }

        // Cache Alice's original payload
        state.aliceOriginalMessage = data.message;
        state.aliceOriginalHash = data.hash_hex;
        state.aliceOriginalSignature = data.signature_b64;

        // Update Alice's Output Display
        const hashDisplay = document.getElementById('alice-hash-text');
        const sigDisplay = document.getElementById('alice-sig-text');
        const signStatus = document.getElementById('alice-sign-status');

        if (hashDisplay) hashDisplay.textContent = data.hash_hex;
        if (sigDisplay) sigDisplay.textContent = data.signature_b64;
        if (signStatus) {
            signStatus.textContent = 'Signed with Alice\'s Private Key';
            signStatus.className = 'status-indicator status-signed';
        }

        // Enable Step 3: Send to Bob button
        const btnSend = document.getElementById('btn-send-to-bob');
        if (btnSend) btnSend.disabled = false;

        // Update Avalanche Visualizer Original Hash
        const avOrigHash = document.getElementById('avalanche-original-hash');
        if (avOrigHash) avOrigHash.textContent = data.hash_hex;

        // Advance progress
        setWorkflowActiveStep(3);
        showToast('Message signed with Alice\'s RSA Private Key (RSA-PSS with SHA-256)!', 'success');

    } catch (err) {
        console.error('Signing error:', err);
        showToast(`Signing failed: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

/**
 * Step 3: Alice sends payload to Bob
 */
function handleSendToBob() {
    if (!state.aliceOriginalSignature) {
        showToast('Please sign a message first.', 'error');
        return;
    }

    const bobMsgInput = document.getElementById('bob-received-message');
    const bobSigInput = document.getElementById('bob-received-signature');
    const verifyPubkeyArea = document.getElementById('bob-verification-pubkey');
    const btnVerify = document.getElementById('btn-verify-signature');
    const verifyHelp = document.getElementById('verify-help-text');

    if (bobMsgInput) bobMsgInput.value = state.aliceOriginalMessage;
    if (bobSigInput) bobSigInput.value = state.aliceOriginalSignature;
    if (verifyPubkeyArea) verifyPubkeyArea.value = state.alicePublicKeyPem;

    if (btnVerify) btnVerify.disabled = false;
    if (verifyHelp) verifyHelp.textContent = "Payload received. Click to verify Alice's digital signature.";

    // Update state & UI
    state.receivedMessage = state.aliceOriginalMessage;
    state.receivedSignature = state.aliceOriginalSignature;
    state.isTampered = false;

    // Enable Tamper controls
    enableTamperButtons(true);

    // Update Live Hash of received message
    recomputeBobLiveHash();
    updateTamperIndicators();

    // Advance workflow
    setWorkflowActiveStep(4);

    // Visual scroll & highlight Bob's panel
    const bobPanel = document.getElementById('panel-bob');
    if (bobPanel) {
        bobPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        bobPanel.classList.add('panel-highlight');
        setTimeout(() => bobPanel.classList.remove('panel-highlight'), 1200);
    }

    showToast('Payload transmitted across network to Bob!', 'success');
}

/**
 * Live SHA-256 calculation for Bob's received text box
 */
async function calculateSHA256Client(str) {
    try {
        const msgBuffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        // Fallback to backend hash endpoint if SubtleCrypto is unavailable
        try {
            const res = await fetch('/api/hash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: str })
            });
            const d = await res.json();
            return d.hash_hex;
        } catch (err) {
            return 'error';
        }
    }
}

/**
 * Recompute and update Bob's live hash display
 */
async function recomputeBobLiveHash() {
    const bobMsgInput = document.getElementById('bob-received-message');
    const liveHashEl = document.getElementById('bob-live-hash');
    const avCurrHash = document.getElementById('avalanche-current-hash');
    const text = bobMsgInput ? bobMsgInput.value : '';

    const hexHash = await calculateSHA256Client(text);

    if (liveHashEl) liveHashEl.textContent = hexHash;
    if (avCurrHash) avCurrHash.textContent = hexHash;

    updateAvalancheDiffBanner(hexHash);
}

/**
 * Compare current hash with Alice's original hash in the Avalanche visualizer
 */
function updateAvalancheDiffBanner(currentHash) {
    const banner = document.getElementById('avalanche-diff-banner');
    const hashMatchStatus = document.getElementById('bob-hash-match-status');
    if (!banner) return;

    if (!state.aliceOriginalHash) {
        banner.textContent = 'Awaiting Alice to sign a message.';
        banner.className = 'avalanche-comparison-result';
        return;
    }

    if (currentHash === state.aliceOriginalHash) {
        banner.textContent = '✓ Exact Hash Match: Message integrity intact (0 bits altered).';
        banner.className = 'avalanche-comparison-result match';
        if (hashMatchStatus) {
            hashMatchStatus.textContent = 'Matches Alice';
            hashMatchStatus.style.color = '#10b981';
        }
    } else {
        // Calculate difference for demonstration
        banner.textContent = '⚠️ HASH MISMATCH (AVALANCHE EFFECT): Message has been modified. Digest completely changed!';
        banner.className = 'avalanche-comparison-result diff';
        if (hashMatchStatus) {
            hashMatchStatus.textContent = 'MISMATCH (Tampered)';
            hashMatchStatus.style.color = '#f43f5e';
        }
    }
}

/**
 * Handle manual editing in Bob's message box
 */
function handleBobMessageInput() {
    state.receivedMessage = document.getElementById('bob-received-message')?.value || '';
    recomputeBobLiveHash();
    updateTamperIndicators();
}

/**
 * Handle manual editing in Bob's signature box
 */
function handleBobSignatureInput() {
    state.receivedSignature = document.getElementById('bob-received-signature')?.value || '';
    updateTamperIndicators();
}

/**
 * Update tamper pills and tags in real-time
 */
function updateTamperIndicators() {
    const bobMsg = document.getElementById('bob-received-message')?.value || '';
    const bobSig = document.getElementById('bob-received-signature')?.value || '';

    const msgTampered = (state.aliceOriginalMessage !== '' && bobMsg !== state.aliceOriginalMessage);
    const sigTampered = (state.aliceOriginalSignature !== '' && bobSig !== state.aliceOriginalSignature);

    const msgTag = document.getElementById('msg-match-tag');
    const sigTag = document.getElementById('sig-match-tag');
    const tamperPill = document.getElementById('tamper-status-pill');

    if (msgTag) {
        if (msgTampered) {
            msgTag.textContent = 'Tampered (Modified)';
            msgTag.className = 'badge-status-tag tampered';
        } else {
            msgTag.textContent = 'Untampered (Original)';
            msgTag.className = 'badge-status-tag';
        }
    }

    if (sigTag) {
        if (sigTampered) {
            sigTag.textContent = 'Altered / Corrupted';
            sigTag.className = 'badge-status-tag tampered';
        } else {
            sigTag.textContent = 'Original';
            sigTag.className = 'badge-status-tag';
        }
    }

    if (tamperPill) {
        const textSpan = tamperPill.querySelector('.tamper-status-text');
        if (msgTampered || sigTampered) {
            tamperPill.className = 'tamper-status-pill tampered';
            if (textSpan) textSpan.textContent = '⚠️ Tampered Payload Active';
            setWorkflowActiveStep(5);
        } else {
            tamperPill.className = 'tamper-status-pill';
            if (textSpan) textSpan.textContent = '✓ Untampered Original Payload';
        }
    }
}

/**
 * Step 4: Bob Verifies the Signature (calls POST /api/verify)
 */
async function handleVerifySignature() {
    const bobMsgInput = document.getElementById('bob-received-message');
    const bobSigInput = document.getElementById('bob-received-signature');
    const pubKeyArea = document.getElementById('bob-verification-pubkey');

    const message = bobMsgInput ? bobMsgInput.value : '';
    const signature = bobSigInput ? bobSigInput.value.trim() : '';
    const publicKey = pubKeyArea ? pubKeyArea.value.trim() : '';

    const btn = document.getElementById('btn-verify-signature');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Verifying RSA-PSS Signature...</span>';

    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                signature: signature,
                public_key: publicKey
            })
        });

        const data = await response.json();

        // Update Verdict Banner & Pillars UI
        displayVerificationResult(data);

        if (data.valid) {
            showToast('Signature is VALID! Authenticity & Integrity verified.', 'success');
        } else {
            showToast(`Verification FAILED: ${data.verdict || 'INVALID'}`, 'error');
        }

    } catch (err) {
        console.error('Verification error:', err);
        showToast(`Verification request error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

/**
 * Render the Verification Result Banner and Security Pillars
 */
function displayVerificationResult(data) {
    const banner = document.getElementById('verdict-banner');
    const icon = document.getElementById('verdict-icon');
    const title = document.getElementById('verdict-title');
    const desc = document.getElementById('verdict-desc');

    const pillarAuth = document.getElementById('pillar-auth');
    const pillarInteg = document.getElementById('pillar-integ');
    const pillarNonrep = document.getElementById('pillar-nonrep');

    const descAuth = document.getElementById('desc-auth');
    const descInteg = document.getElementById('desc-integ');
    const descNonrep = document.getElementById('desc-nonrep');

    if (!banner || !icon || !title || !desc) return;

    if (data.valid) {
        banner.className = 'verdict-banner verdict-valid';
        icon.textContent = '🛡️';
        title.textContent = 'SIGNATURE VALID (Verification Succeeded)';
        desc.textContent = data.explanation;

        // Pillars
        if (pillarAuth) pillarAuth.className = 'pillar-box verified';
        if (pillarInteg) pillarInteg.className = 'pillar-box verified';
        if (pillarNonrep) pillarNonrep.className = 'pillar-box verified';

        if (descAuth) descAuth.textContent = '✓ Alice verified as sender';
        if (descInteg) descInteg.textContent = '✓ 0 characters modified';
        if (descNonrep) descNonrep.textContent = '✓ Alice bound to signature';

    } else {
        banner.className = 'verdict-banner verdict-invalid';
        icon.textContent = '❌';
        title.textContent = 'SIGNATURE INVALID (Verification Failed)';
        desc.textContent = data.explanation || 'Verification failed. Cryptographic signature does not match the message.';

        // Pillars
        if (pillarAuth) pillarAuth.className = 'pillar-box failed';
        if (pillarInteg) pillarInteg.className = 'pillar-box failed';
        if (pillarNonrep) pillarNonrep.className = 'pillar-box failed';

        if (descAuth) descAuth.textContent = '✗ Identity unverified / wrong key';
        if (descInteg) descInteg.textContent = '✗ Message or signature modified';
        if (descNonrep) descNonrep.textContent = '✗ Cannot bind sender to altered data';
    }
}

/**
 * Step 5: Tamper Controls Implementations
 */
function tamperAlterCharacter() {
    const bobMsgInput = document.getElementById('bob-received-message');
    if (!bobMsgInput) return;

    let text = bobMsgInput.value;
    if (!text || text.length === 0) {
        text = 'Hello Bob';
    }

    // Flip first letter or a character
    const charCode = text.charCodeAt(0);
    const newChar = String.fromCharCode(charCode === 65 ? 66 : charCode + 1);
    bobMsgInput.value = newChar + text.slice(1);

    handleBobMessageInput();
    showToast(`Altered first character to "${newChar}"`, 'info');
}

function tamperAlterAmount() {
    const bobMsgInput = document.getElementById('bob-received-message');
    if (!bobMsgInput) return;

    let text = bobMsgInput.value;
    if (text.includes('$5,000')) {
        bobMsgInput.value = text.replace('$5,000', '$9,000');
        showToast('Modified transfer amount: $5,000 -> $9,000', 'info');
    } else if (text.includes('PASS')) {
        bobMsgInput.value = text.replace('PASS', 'FAIL');
        showToast('Modified grade: PASS -> FAIL', 'info');
    } else {
        bobMsgInput.value = text + ' [MODIFIED BY ATTACKER]';
        showToast('Appended unauthorized attacker text', 'info');
    }

    handleBobMessageInput();
}

function tamperAppendWhitespace() {
    const bobMsgInput = document.getElementById('bob-received-message');
    if (!bobMsgInput) return;

    bobMsgInput.value = bobMsgInput.value + ' ';
    handleBobMessageInput();
    showToast('Appended single whitespace " " (breaks SHA-256!)', 'info');
}

function resetBobMessage() {
    const bobMsgInput = document.getElementById('bob-received-message');
    if (!bobMsgInput) return;

    bobMsgInput.value = state.aliceOriginalMessage;
    handleBobMessageInput();
    showToast('Restored Alice\'s original message.', 'success');
}

function tamperCorruptSignature() {
    const bobSigInput = document.getElementById('bob-received-signature');
    if (!bobSigInput || !bobSigInput.value) return;

    let sig = bobSigInput.value;
    // Replace first 3 characters with 'AAA' or flip characters
    if (sig.length > 5) {
        sig = 'ZZZ' + sig.substring(3);
    }
    bobSigInput.value = sig;
    handleBobSignatureInput();
    showToast('Corrupted signature bytes (flipped leading Base64 chars)', 'info');
}

function tamperTruncateSignature() {
    const bobSigInput = document.getElementById('bob-received-signature');
    if (!bobSigInput || !bobSigInput.value) return;

    let sig = bobSigInput.value;
    if (sig.length > 20) {
        sig = sig.substring(0, sig.length - 20);
    }
    bobSigInput.value = sig;
    handleBobSignatureInput();
    showToast('Truncated signature length (simulating network drop)', 'info');
}

function resetBobSignature() {
    const bobSigInput = document.getElementById('bob-received-signature');
    if (!bobSigInput) return;

    bobSigInput.value = state.aliceOriginalSignature;
    handleBobSignatureInput();
    showToast('Restored Alice\'s original cryptographic signature.', 'success');
}

function enableTamperButtons(enable) {
    const buttons = [
        'btn-tamper-char', 'btn-tamper-amount', 'btn-tamper-append', 'btn-reset-message',
        'btn-tamper-sig', 'btn-tamper-sig-trunc', 'btn-reset-sig'
    ];
    buttons.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !enable;
    });
}

/**
 * Helper: Workflow Navigation Progress
 */
function setWorkflowActiveStep(stepNum) {
    for (let i = 1; i <= 5; i++) {
        const item = document.getElementById(`nav-step-${i}`);
        if (!item) continue;

        if (i < stepNum) {
            item.className = 'step-item completed';
        } else if (i === stepNum) {
            item.className = 'step-item active';
        } else {
            item.className = 'step-item';
        }
    }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
    }, 3800);
}

/**
 * Clipboard Copy Utility
 */
function copyToClipboard(text, btnElement) {
    if (!navigator.clipboard) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    } else {
        navigator.clipboard.writeText(text);
    }

    const origText = btnElement.textContent;
    btnElement.textContent = 'Copied!';
    btnElement.style.color = '#10b981';
    setTimeout(() => {
        btnElement.textContent = origText;
        btnElement.style.color = '';
    }, 1500);

    showToast('Copied to clipboard!', 'info');
}

/**
 * Setup Viva Modal & Accordions
 */
function setupVivaModal() {
    const modal = document.getElementById('viva-modal');
    const btnOpen = document.getElementById('btn-open-viva');
    const btnClose = document.getElementById('btn-close-viva');
    const btnDone = document.getElementById('btn-modal-done');

    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
    }

    const closeModal = () => modal?.classList.add('hidden');
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnDone) btnDone.addEventListener('click', closeModal);

    // Modal tabs
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        });
    });

    // Accordions
    const accordionItems = document.querySelectorAll('.viva-item');
    accordionItems.forEach(item => {
        const qBtn = item.querySelector('.viva-q');
        if (qBtn) {
            qBtn.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                // Optional: close other items or leave open
                item.classList.toggle('open', !isOpen);
            });
        }
    });
}
