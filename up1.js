import _sodium from "libsodium-wrappers";


const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk
let secretKeyBase64 = "";

export async function encryptAndUploadFileInChunks() {
  await _sodium.ready;
  const sodium = _sodium;

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file first.");
    return;
  }

  const secretKey = sodium.crypto_secretbox_keygen();
  
  secretKeyBase64 = arrayBufferToBase64(secretKey);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const chunkBuffer = await chunk.arrayBuffer();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedChunk = sodium.crypto_secretbox_easy(
      new Uint8Array(chunkBuffer),
      nonce,
      secretKey
    );

    const metadata = {
      fileName: file.name,
      fileType: file.type,
      chunkIndex: i,
      totalChunks,
      nonce: arrayBufferToBase64(nonce),
      encryptedData: arrayBufferToBase64(encryptedChunk),
    };

    await uploadChunk(metadata); // Function to send chunk to backend
  }

  alert("File encrypted and uploaded successfully!");
}

async function uploadChunk(metadata) {
  console.log(metadata)
  // try {
  //   await fetch("http://your-backend-url/upload-chunk", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(metadata),
  //   });
  // } catch (err) {
  //   console.error("Failed to upload chunk:", err);
  // }
}


function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
