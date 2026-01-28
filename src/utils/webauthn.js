import API from "../api/api";

// helper conversions
export const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer;
};

export const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

// REGISTER NEW DEVICE
// REGISTER NEW DEVICE
export const registerWebAuthn = async () => {
  const { data: publicKeyOptions } = await API.post(
    "/auth/webauthn/register-options"
  );

  publicKeyOptions.challenge = base64ToArrayBuffer(
    publicKeyOptions.challenge
  );
  publicKeyOptions.user.id = base64ToArrayBuffer(
    publicKeyOptions.user.id
  );

  if (publicKeyOptions.excludeCredentials) {
    publicKeyOptions.excludeCredentials =
      publicKeyOptions.excludeCredentials.map((cred) => ({
        ...cred,
        id: base64ToArrayBuffer(cred.id),
      }));
  }

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  });

  const attestation = {
    id: credential.id,
    rawId: arrayBufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64(
        credential.response.clientDataJSON
      ),
      attestationObject: arrayBufferToBase64(
        credential.response.attestationObject
      ),
    },
  };

  await API.post(
    "/auth/webauthn/register-response",
    attestation
  );

  return true;
};



// LOGIN USING DEVICE
// LOGIN USING DEVICE
export const loginWebAuthn = async (email) => {
  const { data: publicKeyOptions } = await API.post(
    "/auth/webauthn/auth-options",
    { email }
  );

  publicKeyOptions.challenge = base64ToArrayBuffer(
    publicKeyOptions.challenge
  );

  publicKeyOptions.allowCredentials =
    publicKeyOptions.allowCredentials.map((cred) => ({
      ...cred,
      id: base64ToArrayBuffer(cred.id),
    }));

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  });

  const authData = {
    email,
    id: assertion.id,
    rawId: arrayBufferToBase64(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: arrayBufferToBase64(
        assertion.response.clientDataJSON
      ),
      authenticatorData: arrayBufferToBase64(
        assertion.response.authenticatorData
      ),
      signature: arrayBufferToBase64(
        assertion.response.signature
      ),
      userHandle: assertion.response.userHandle
        ? arrayBufferToBase64(assertion.response.userHandle)
        : null,
    },
  };

  const res = await API.post(
    "/auth/webauthn/auth-response",
    authData
  );

  return res.data;
};


