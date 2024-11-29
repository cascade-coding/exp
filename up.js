import _sodium from "libsodium-wrappers";
import { encryptAndUploadFileInChunks } from "./up1";

// Assuming you have the Base64 encoded encrypted file and nonce from the server
let encryptedFileBase64 = "";
let nonceBase64 = "";

async function encryptAndUploadFile() {
  // Wait for libsodium to be ready

  await _sodium.ready;
  const sodium = _sodium;

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file first.");
    return;
  }

  // Convert the file to ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Generate a random 256-bit key (32 bytes) for AES encryption
  const secretKey = sodium.crypto_secretbox_keygen();

  // Generate a random nonce (24 bytes for secretbox)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  // Encrypt the file data using AES-GCM
  const encryptedData = sodium.crypto_secretbox_easy(
    new Uint8Array(fileBuffer),
    nonce,
    secretKey
  );

  // Convert the encrypted data and nonce to Base64 so we can send it over the network
  encryptedFileBase64 = arrayBufferToBase64(encryptedData);
  nonceBase64 = arrayBufferToBase64(nonce);

  // Upload the encrypted file and nonce to the server
  const metadata = {
    fileName: file.name, // Original file name
    fileType: file.type, // MIME type
    nonce: nonceBase64, // Encrypted file nonce
    encryptedData: encryptedFileBase64, // Base64 of encrypted file data
  };

  console.log("Metadata with encrypted file:", metadata);

    // await uploadEncryptedFile(metadata);

  // Save the secretKey locally (e.g., in memory or secure storage)
  // Make sure you do not expose this key outside of the client!
  localStorage.setItem("secretKey", arrayBufferToBase64(secretKey));

  alert("File encrypted and uploaded successfully!");
}

// Utility to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Upload the encrypted file to the server (encrypted data + nonce)
async function uploadEncryptedFile(encryptedFileBase64, nonceBase64) {
  const response = await fetch("/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      encryptedFile: encryptedFileBase64,
      nonce: nonceBase64,
    }),
  });

  const result = await response.json();
  console.log("Server response:", result);
}

const uploadBtn = document.getElementById("uploadBtn");

// uploadBtn.addEventListener("click", () => encryptAndUploadFile());
uploadBtn.addEventListener("click", () => encryptAndUploadFileInChunks());

// Function to decrypt the file after retrieval from the server

async function decryptAndDownloadFile(encryptedFileBase64, nonceBase64) {
  // Wait for libsodium to be ready
  await _sodium.ready;
  const sodium = _sodium;

  // Decode Base64 strings to ArrayBuffer, then convert to Uint8Array
  const encryptedData = new Uint8Array(
    base64ToArrayBuffer(encryptedFileBase64)
  );
  const nonce = new Uint8Array(base64ToArrayBuffer(nonceBase64));

  // Retrieve the secret key stored previously (as Base64)
  const secretKeyBase64 = localStorage.getItem("secretKey");
  if (!secretKeyBase64) {
    alert("No secret key found for decryption!");
    return;
  }

  const secretKey = new Uint8Array(base64ToArrayBuffer(secretKeyBase64));

  // Decrypt the data using the secret key and nonce
  const decryptedData = sodium.crypto_secretbox_open_easy(
    encryptedData, // Encrypted data as Uint8Array
    nonce, // Nonce as Uint8Array
    secretKey // Secret key as Uint8Array
  );

  if (!decryptedData) {
    alert("Decryption failed. The data might be corrupted or the wrong key.");
    return;
  }

  // Convert decrypted data to a Blob (file) and create a download link
  const blob = new Blob([decryptedData], { type: "application/octet-stream" });

  // Create a URL for the Blob and trigger a download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "decrypted_file"; // You can set a dynamic file name here
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Utility to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const length = binaryString.length;
  const arrayBuffer = new ArrayBuffer(length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  return arrayBuffer;
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  console.log(nonceBase64);
  decryptAndDownloadFile(encryptedFileBase64, nonceBase64);
});
