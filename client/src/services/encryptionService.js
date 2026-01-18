import CryptoJS from 'crypto-js';

// We'll use the user's UID as part of the key salt, but for a truly secure
// local encryption (where even the DB admin can't read it), we ideally need
// a key that is NOT stored in the code.
// For this implementation, we will use a mixed approach:
// 1. A derived key from the user's password would be best, but complex to implement with Firebase Auth.
// 2. We'll use a local secret stored in localStorage (generated on first login) + user UID.

const LOCAL_SECRET_KEY = 'exam_grader_encryption_secret';

function getOrGenerateSecret() {
    let secret = localStorage.getItem(LOCAL_SECRET_KEY);
    if (!secret) {
        secret = CryptoJS.lib.WordArray.random(256 / 8).toString();
        localStorage.setItem(LOCAL_SECRET_KEY, secret);
    }
    return secret;
}

export const encryptionService = {
    encrypt: (data, userId) => {
        try {
            const secret = getOrGenerateSecret();
            const key = secret + userId; // Bind encryption to specific user
            return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    },

    decrypt: (cipherText, userId) => {
        try {
            const secret = getOrGenerateSecret();
            const key = secret + userId;
            const bytes = CryptoJS.AES.decrypt(cipherText, key);
            const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            return decryptedData;
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
};
