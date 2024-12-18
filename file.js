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

// Utility function to convert Uint8Array to Base64
function arrayBufferToBase64(arrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");

  if (!fileInput.files[0]) {
    console.error("No file selected!");
    return;
  }

  const file = fileInput.files[0];
  console.log(file);

  //   const res = await encryptFile(file, "vRfwT@RdNqmjzZXVpDEYCftvEErh5C");
  //   const res = await encryptLargeFile(file, "vRfwT@RdNqmjzZXVpDEYCftvEErh5C");
  const res = await encryptAndSendLargeFile(
    file,
    "vRfwT@RdNqmjzZXVpDEYCftvEErh5C"
  );

  console.log(res);
});

// !

async function encryptAndSendLargeFile(file, password) {
  const chunkSize = 1024 * 1024 * 50; // 50 MB per chunk
  const fileReader = new FileReader();

  let currentPosition = 0;
  const salt = crypto.getRandomValues(new Uint8Array(16)); // Generate salt
  const derivedKey = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate IV

  let chunkIndex = 0;
  const totalChunks = Math.ceil(file.size / chunkSize);

  let totalChunksData = [];

  while (currentPosition < file.size) {
    const slice = file.slice(currentPosition, currentPosition + chunkSize);

    // Read the chunk as ArrayBuffer
    fileReader.readAsArrayBuffer(slice);
    await new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        const arrayBuffer = fileReader.result;

        // Encrypt the chunk
        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          derivedKey,
          arrayBuffer
        );

        const chunkData = new Uint8Array(encrypted);
        totalChunksData.push(chunkData);

        
        // Send the encrypted chunk to the backend
        //   const response = await fetch("/upload-chunk", {
        //     method: "POST",
        //     body: JSON.stringify({
        //       chunk: Array.from(chunkData), // Convert to array for JSON
        //       chunkIndex,
        //       totalChunks,
        //       salt: chunkIndex === 0 ? Array.from(salt) : undefined, // Send salt with first chunk
        //       iv: chunkIndex === 0 ? Array.from(iv) : undefined, // Send IV with first chunk
        //     }),
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //   });

        //   if (!response.ok) {
        //     console.error(`Failed to upload chunk ${chunkIndex}`);
        //     reject();
        //   }

        chunkIndex += 1;
        currentPosition += chunkSize;
        resolve();
      };
      fileReader.onerror = reject;
    });
  }

  // Combine all encrypted chunks (you can process these as needed)
  const encryptedBlob = new Blob(totalChunksData, {
    type: "application/octet-stream",
  });

  console.log({ iv });
  console.log({ salt });

  const ivBase64 = arrayBufferToBase64(iv);
  const saltBase64 = arrayBufferToBase64(salt);

  console.log({ ivBase64 });

  return { salt: saltBase64, iv: ivBase64, data: encryptedBlob };
}
