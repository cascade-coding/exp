function generateSalt() {
  // Generate a 16-byte salt
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return array;
}

function storeSalt(salt) {
  sessionStorage.setItem("salt", JSON.stringify(Array.from(salt)));
}

function getStoredSalt() {
  const salt = sessionStorage.getItem("salt");
  return salt ? new Uint8Array(JSON.parse(salt)) : null;
}

async function encryptPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );
  const encryptedPassword = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: encoder.encode(salt) },
    key,
    encoder.encode(password)
  );
  sessionStorage.setItem(
    "encryptedPassword",
    btoa(new Uint8Array(encryptedPassword))
  );
}

async function decryptPassword(salt) {
  const encryptedPassword = sessionStorage.getItem("encryptedPassword");
  if (!encryptedPassword) return null;

  const encoder = new TextEncoder();
  const encryptedBytes = Uint8Array.from(atob(encryptedPassword), (c) =>
    c.charCodeAt(0)
  );
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode("user-entered-password"), // This is the raw password
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );
  const decryptedPassword = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encoder.encode(salt) },
    key,
    encryptedBytes
  );
  return new TextDecoder().decode(decryptedPassword);
}
