import { setAuthTokenGetter } from "@workspace/api-client-react";

const OWNER_TOKEN_KEY = "masari-owner-token-v1";
const OWNER_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function createOwnerToken(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function getOwnerToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(OWNER_TOKEN_KEY);
    if (stored && OWNER_TOKEN_PATTERN.test(stored)) return stored;

    const token = createOwnerToken();
    window.localStorage.setItem(OWNER_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

setAuthTokenGetter(getOwnerToken);
