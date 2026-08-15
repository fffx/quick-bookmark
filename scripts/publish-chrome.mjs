import { readFileSync, createReadStream, statSync } from "node:fs";
import { resolve } from "node:path";
import { JWT } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const UPLOAD_URL =
  "https://chromewebstore.googleapis.com/upload/v2/publishers/";
const API_URL = "https://chromewebstore.googleapis.com/v2/publishers/";

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const args = process.argv.slice(2);
const publishTarget = args.includes("--target")
  ? args[args.indexOf("--target") + 1]
  : undefined;
const zipPath = args.includes("--zip")
  ? args[args.indexOf("--zip") + 1]
  : resolve("extension/chrome.zip");
const keyPath = required("GOOGLE_SERVICE_ACCOUNT_KEY");
const publisherId = required("WEB_STORE_PUBLISHER_ID");
const extensionId = required("WEB_STORE_EXTENSION_ID");

if (publishTarget && !["DEFAULT_PUBLISH", "TRUSTED_TESTERS", "STAGED_PUBLISH"].includes(publishTarget)) {
  console.error(
    `Invalid --target "${publishTarget}". Must be one of: DEFAULT_PUBLISH, TRUSTED_TESTERS, STAGED_PUBLISH`,
  );
  process.exit(1);
}

const credentials = JSON.parse(readFileSync(keyPath, "utf8"));
const auth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: [SCOPE],
});
const token = await auth.getAccessToken();

async function upload() {
  const size = statSync(zipPath).size;
  const url = `${UPLOAD_URL}${publisherId}/items/${extensionId}:upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/zip",
      "Content-Length": String(size),
    },
    body: createReadStream(zipPath),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Upload failed:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  if (json.uploadState === "FAILED") {
    console.error("Upload FAILED:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  console.log(`Uploaded ${zipPath}: ${json.uploadState ?? "OK"}`);
  return json;
}

async function publish() {
  const url = `${API_URL}${publisherId}/items/${extensionId}:publish`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: publishTarget ? JSON.stringify({ target: publishTarget }) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Publish failed:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  console.log(`Publish submitted: ${JSON.stringify(json)}`);
  return json;
}

await upload();
if (args.includes("--no-publish")) {
  console.log("Skipping publish (--no-publish).");
} else {
  await publish();
}
