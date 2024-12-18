// * create a function that will decrypt the file and this function will receive the salt, iv, the url of the file and the password... the decryption has to happen on download and the decryptedChunks cannot be stored in a variable because imagine if the file is 4gb we don't wanna store the decrypted chunks in variable meaning the memory.... and the download has to start instantly on the click meaning the user will see the save prompt .... 



document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");

  if (!fileInput.files[0]) {
    console.error("No file selected!");
    return;
  }

  const file = fileInput.files[0];
  console.log(file);

  const res = await encryptAndSendLargeFile(
    file,
    "vRfwT@RdNqmjzZXVpDEYCftvEErh5C"
  );

  console.log(res);
});

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



async function encryptAndSendLargeFile(file, password) {
  const chunkSize = 1024 * 1024 * 50; // 50 MB per chunk
  const fileReader = new FileReader();

  let currentPosition = 0;
  const salt = crypto.getRandomValues(new Uint8Array(16)); // Generate salt
  const derivedKey = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate IV

  let chunkIndex = 0;
  const totalChunks = Math.ceil(file.size / chunkSize);

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

        // Send the encrypted chunk to the backend
        const response = await fetch("/upload-chunk", {
          method: "POST",
          body: JSON.stringify({
            chunk: Array.from(chunkData), // Convert to array for JSON
            chunkIndex,
            totalChunks,
            salt: chunkIndex === 0 ? Array.from(salt) : undefined, // Send salt with first chunk
            iv: chunkIndex === 0 ? Array.from(iv) : undefined, // Send IV with first chunk
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`Failed to upload chunk ${chunkIndex}`);
          reject();
        }

        chunkIndex += 1;
        currentPosition += chunkSize;
        resolve();
      };
      fileReader.onerror = reject;
    });
  }
}



























































document.getElementById("downloadBtn").addEventListener("click", async () => {
  const fileUrl = "https://example.com/encrypted-file"; // URL of the encrypted file
  const password = "vRfwT@RdNqmjzZXVpDEYCftvEErh5C"; // The password for decryption
  const salt = new Uint8Array(16); // You should know how to get this from the backend or metadata
  const iv = new Uint8Array(12); // Same for the IV

  await downloadAndDecryptFile(fileUrl, salt, iv, password);
});



async function downloadAndDecryptFile(url, salt, iv, password) {
  const key = await deriveKey(password, salt);

  const response = await fetch(url);
  const reader = response.body.getReader();
  const stream = new ReadableStream({
    start(controller) {
      const processChunk = async () => {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        try {
          // Decrypt the chunk on-the-fly
          const decryptedData = await decryptChunk(value, key, iv);

          // Push the decrypted data to the stream (this will go directly to the download)
          controller.enqueue(decryptedData);
        } catch (e) {
          console.error("Decryption failed:", e);
          controller.error(e);
        }

        processChunk();
      };

      processChunk();
    }
  });

  // Create a download prompt using the decrypted stream
  const blob = new Blob([stream], { type: 'application/octet-stream' });
  const urlBlob = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = urlBlob;
  a.download = "decrypted-file"; // Set the download file name
  a.click();
}

async function decryptChunk(encryptedChunk, key, iv) {
  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encryptedChunk
    );
    return new Uint8Array(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw e;
  }
}
