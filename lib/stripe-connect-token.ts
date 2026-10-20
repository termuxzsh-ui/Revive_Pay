import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedToken = {
  ciphertext: string;
  iv: string;
  tag: string;
};

function getEncryptionKey() {
  const configuredKey = process.env.STRIPE_CONNECT_TOKEN_ENCRYPTION_KEY;
  if (!configuredKey) {
    throw new Error("Missing STRIPE_CONNECT_TOKEN_ENCRYPTION_KEY environment variable.");
  }

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== 32) {
    throw new Error("STRIPE_CONNECT_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptStripeToken(token: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptStripeToken({
  ciphertext,
  iv,
  tag,
}: EncryptedToken): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
