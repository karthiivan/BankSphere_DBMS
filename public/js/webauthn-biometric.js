// WebAuthn Biometric Authentication (Fingerprint/Windows Hello)

class BiometricAuth {
    constructor() {
        this.isSupported = this.checkSupport();
    }

    // Check if WebAuthn is supported
    checkSupport() {
        // Check basic WebAuthn support
        if (window.PublicKeyCredential === undefined || navigator.credentials === undefined) {
            console.log('WebAuthn not supported: Missing PublicKeyCredential or navigator.credentials');
            return false;
        }
        
        // Additional check for platform authenticator
        if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(available => {
                    console.log('Platform authenticator available:', available);
                    if (available) {
                        console.log('✅ Biometric authentication is supported on this device!');
                    } else {
                        console.log('⚠️ Platform authenticator not available. Please set up Windows Hello.');
                    }
                });
        }
        
        return true; // Return true if basic WebAuthn is supported
    }

    // Register fingerprint/biometric
    async registerBiometric(username) {
        if (!this.isSupported) {
            throw new Error('Biometric authentication is not supported on this device');
        }

        // Check if platform authenticator is available
        try {
            const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                throw new Error('No biometric authenticator found. Please set up Windows Hello with PIN, Fingerprint, or Face recognition in Windows Settings.');
            }
        } catch (e) {
            console.error('Platform authenticator check failed:', e);
        }

        try {
            // Get challenge from server
            const challengeResponse = await fetch('/api/biometric/register/challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username })
            });

            const challengeData = await challengeResponse.json();
            
            if (!challengeData.success) {
                throw new Error(challengeData.message);
            }

            // Create credential options
            const publicKeyCredentialCreationOptions = {
                challenge: this.base64ToArrayBuffer(challengeData.challenge),
                rp: {
                    name: "BankSphere",
                    id: window.location.hostname
                },
                user: {
                    id: this.base64ToArrayBuffer(challengeData.userId),
                    name: username,
                    displayName: username
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },  // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Use platform authenticator (Windows Hello, Touch ID)
                    userVerification: "required",
                    requireResidentKey: false
                },
                timeout: 60000,
                attestation: "direct"
            };

            // Create credential using fingerprint/Windows Hello
            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            // Send credential to server
            const registrationResponse = await fetch('/api/biometric/register/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    username,
                    credential: {
                        id: credential.id,
                        rawId: this.arrayBufferToBase64(credential.rawId),
                        type: credential.type,
                        response: {
                            attestationObject: this.arrayBufferToBase64(credential.response.attestationObject),
                            clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON)
                        }
                    }
                })
            });

            const result = await registrationResponse.json();
            return result;

        } catch (error) {
            console.error('Biometric registration error:', error);
            throw error;
        }
    }

    // Authenticate using fingerprint/biometric
    async authenticateBiometric(username) {
        if (!this.isSupported) {
            throw new Error('Biometric authentication is not supported on this device');
        }

        try {
            // Get challenge from server
            const challengeResponse = await fetch('/api/biometric/authenticate/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const challengeData = await challengeResponse.json();
            
            if (!challengeData.success) {
                throw new Error(challengeData.message);
            }

            // Create assertion options
            const publicKeyCredentialRequestOptions = {
                challenge: this.base64ToArrayBuffer(challengeData.challenge),
                allowCredentials: challengeData.allowCredentials.map(cred => ({
                    id: this.base64ToArrayBuffer(cred.id),
                    type: 'public-key',
                    transports: ['internal']
                })),
                timeout: 60000,
                userVerification: "required",
                rpId: window.location.hostname
            };

            // Get assertion using fingerprint/Windows Hello
            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            // Send assertion to server for verification
            const verificationResponse = await fetch('/api/biometric/authenticate/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    credential: {
                        id: assertion.id,
                        rawId: this.arrayBufferToBase64(assertion.rawId),
                        type: assertion.type,
                        response: {
                            authenticatorData: this.arrayBufferToBase64(assertion.response.authenticatorData),
                            clientDataJSON: this.arrayBufferToBase64(assertion.response.clientDataJSON),
                            signature: this.arrayBufferToBase64(assertion.response.signature),
                            userHandle: assertion.response.userHandle ? 
                                this.arrayBufferToBase64(assertion.response.userHandle) : null
                        }
                    }
                })
            });

            const result = await verificationResponse.json();
            return result;

        } catch (error) {
            console.error('Biometric authentication error:', error);
            throw error;
        }
    }

    // Check if user has biometric registered
    async hasBiometricRegistered(username) {
        try {
            const response = await fetch('/api/biometric/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const result = await response.json();
            return result.hasRegistered;
        } catch (error) {
            console.error('Check biometric error:', error);
            return false;
        }
    }

    // Helper functions
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Show biometric prompt
    showBiometricPrompt(message = 'Use your fingerprint to authenticate') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center p-4">
                            <i class="bi bi-fingerprint" style="font-size: 4rem; color: #0d6efd;"></i>
                            <h5 class="mt-3">${message}</h5>
                            <p class="text-muted">Touch your fingerprint sensor</p>
                            <div class="spinner-border text-primary mt-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            setTimeout(() => {
                bsModal.hide();
                modal.remove();
                resolve();
            }, 3000);
        });
    }
}

// Initialize biometric auth
const biometricAuth = new BiometricAuth();
