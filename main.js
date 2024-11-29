import _sodium from "libsodium-wrappers";

(async () => {
  // Wait for libsodium to load
  await _sodium.ready;
  const sodium = _sodium;

  // Variables to hold keys and shared secrets
  let myKeypair, otherPublicKey, sharedSecret;

  // 1. Generate Keypair
  document.getElementById("generate-keys").addEventListener("click", () => {
    myKeypair = sodium.crypto_box_keypair();

    const publicKeyBase64 = sodium.to_base64(myKeypair.publicKey);

    const name = "Donald J Trump";

    const nameBase64 = sodium.to_base64(sodium.from_string(name));

    const shareInfo = `${publicKeyBase64}.${nameBase64}`;

    console.log(shareInfo);

    const sharedNameBase64 = shareInfo.split(".")[1];

    console.log(sharedNameBase64);

    console.log(nameBase64);

    // Convert back from base64 to the original object
    const deserializedBytes = sodium.from_base64(sharedNameBase64);
    const deserializedName = sodium.to_string(deserializedBytes);

    console.log(deserializedName);

    document.getElementById("public-key").innerText = publicKeyBase64;
  });

  // 2. Compute Shared Secret
  document.getElementById("compute-secret").addEventListener("click", () => {
    const otherPublicKeyBase64 =
      document.getElementById("other-public-key").value;
    if (!otherPublicKeyBase64) {
      alert("Enter the other user's public key!");
      return;
    }

    otherPublicKey = sodium.from_base64(otherPublicKeyBase64);
    sharedSecret = sodium.crypto_scalarmult(
      myKeypair.privateKey,
      otherPublicKey
    );

    const randomString1 = sodium.crypto_generichash(32, sharedSecret); // 32-byte output for SHA-256
    const randomString2 = sodium.crypto_generichash(32, randomString1);

    const randomString1Base64 = sodium.to_base64(randomString1); // ! one to one room id
    const randomString2Base64 = sodium.to_base64(randomString2); // ! message secret

    console.log({ randomString1Base64 });
    console.log({ randomString2Base64 });

    // ! for the websoket connection
    const sharedSecretBase64 = sodium.to_base64(sharedSecret);

    document.getElementById("shared-secret").innerText =
      sodium.to_base64(sharedSecret);
  });

  // 3. Encrypt Invite
  document.getElementById("encrypt-invite").addEventListener("click", () => {
    const invite = document.getElementById("invite").value;
    if (!invite) {
      alert("Enter an invite to encrypt!");
      return;
    }

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(
      invite,
      nonce,
      sharedSecret
    );

    /*
    ! encrypted data info while sending through websocket

    socket.send(
      JSON.stringify({
        nonce: sodium.to_base64(nonce),
        ciphertext: sodium.to_base64(ciphertext),
      })
    );



    ! decrypt data info while reciveing through websocket

    socket.onmessage = (event) => {
    const { nonce, ciphertext } = JSON.parse(event.data);

    const plaintext = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ciphertext),
        sodium.from_base64(nonce),
        sharedSecret
    );

    console.log("Decrypted message:", sodium.to_string(plaintext));
};

    */

    document.getElementById("encrypted-invite").innerText = JSON.stringify({
      nonce: sodium.to_base64(nonce),
      ciphertext: sodium.to_base64(ciphertext),
    });
  });

  // 4. Decrypt Invite
  document.getElementById("decrypt-invite").addEventListener("click", () => {
    const encryptedInvite = document.getElementById(
      "received-encrypted-invite"
    ).value;
    if (!encryptedInvite) {
      alert("Enter the encrypted invite to decrypt!");
      return;
    }

    try {
      const { nonce, ciphertext } = JSON.parse(encryptedInvite);
      const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ciphertext),
        sodium.from_base64(nonce),
        sharedSecret
      );

      document.getElementById("decrypted-invite").innerText =
        sodium.to_string(decrypted);
    } catch (e) {
      alert("Failed to decrypt invite. Check inputs!");
    }
  });
})();
