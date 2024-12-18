const encryptAndSaveToLocalStorage = async (key, obj, password) => {
  const jsonString = JSON.stringify(obj);

  // Generate a random salt and derive a key
  const salt = crypto.getRandomValues(new Uint8Array(16)); // 16-byte salt
  const derivedKey = await deriveKey(password, salt);

  // Encrypt the JSON string
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte Initialization Vector
  const encodedData = new TextEncoder().encode(jsonString);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encodedData
  );

  // Convert encrypted data and IV to Base64 and save to localStorage
  const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  localStorage.setItem(
    key,
    JSON.stringify({ salt: saltBase64, iv: ivBase64, data: encryptedData })
  );
  console.log(`Data saved in localStorage under key: ${key}`);
};

const decryptFromLocalStorage = async (key, password) => {
  const savedData = localStorage.getItem(key);

  if (!savedData) {
    throw new Error("No data found for the given key in localStorage.");
  }

  const { salt, iv, data } = JSON.parse(savedData);

  // Decode salt and IV from Base64
  const saltArray = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const encryptedArray = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

  // Derive the same cryptographic key using the saved salt
  const derivedKey = await deriveKey(password, saltArray);

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivArray },
    derivedKey,
    encryptedArray
  );

  // Convert decrypted data back to JSON object
  return JSON.parse(new TextDecoder().decode(decrypted));
};

async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt, // Use the provided salt
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

(async () => {
  const key = "myEncryptedData";
  const password = "xEr6jM<*vu8UCjx1";
  const myObject = { name: "John", age: 30 };

  // Encrypt and save to localStorage
  // await encryptAndSaveToLocalStorage(key, myObject, password);

  // Later, decrypt from localStorage
  try {
    const decryptedData = await decryptFromLocalStorage(key, password);
    console.log("Decrypted Data:", decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error.message);
  }
})();
