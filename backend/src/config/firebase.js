import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function credentialsError(message) {
  return Object.assign(new Error(message), { status: 503 });
}

function checkLocalCredentials() {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialPath) {
    if (!existsSync(credentialPath)) {
      throw credentialsError("Firebase server credential file was not found. Check GOOGLE_APPLICATION_CREDENTIALS in backend/.env.");
    }
    return;
  }
  const cloudConfig = process.env.CLOUDSDK_CONFIG || join(homedir(), ".config", "gcloud");
  const adcPath = process.platform === "win32" && !process.env.CLOUDSDK_CONFIG
    ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "gcloud", "application_default_credentials.json")
    : join(cloudConfig, "application_default_credentials.json");
  if (!existsSync(adcPath)) {
    throw credentialsError("Firebase server credentials are missing. Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env to a Firebase service-account JSON file.");
  }
}

export function firestore() {
  checkLocalCredentials();
  let credential;
  try {
    credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : applicationDefault();
  } catch {
    throw credentialsError("Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON.");
  }
  const app = getApps()[0] || initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  return getFirestore(app);
}
