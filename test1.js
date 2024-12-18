// Import the sodium library
import _sodium from "libsodium-wrappers";

(async () => {
  // Initialize sodium (important step)
  await _sodium.ready;
  const sodium = _sodium;

  // Generate a random key (32 bytes long)
  const randomKey = sodium.randombytes_buf(32);

  // Generate a random string using crypto_generichash
  const randomString1 = sodium.crypto_generichash(32, randomKey);

  console.log("Random Key:", sodium.to_base64(randomString1));
})();
