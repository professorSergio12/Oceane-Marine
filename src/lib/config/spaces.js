import { S3Client } from "@aws-sdk/client-s3";

/**
 * DigitalOcean Spaces is S3-compatible, so we use the AWS S3 SDK and just
 * point the endpoint at DigitalOcean instead of AWS.
 *
 * Required env vars (see .env.local):
 *   SPACES_REGION    e.g. "blr1"
 *   SPACES_ENDPOINT  e.g. "https://blr1.digitaloceanspaces.com"
 *   SPACES_KEY       Spaces access key
 *   SPACES_SECRET    Spaces secret key
 *   SPACES_BUCKET    the Space (bucket) name
 */

let client = null;

export const getSpacesClient = () => {
  if (client) return client;

  const { SPACES_REGION, SPACES_ENDPOINT, SPACES_KEY, SPACES_SECRET } =
    process.env;

  if (!SPACES_REGION || !SPACES_ENDPOINT || !SPACES_KEY || !SPACES_SECRET) {
    throw new Error(
      "Missing DigitalOcean Spaces config. Set SPACES_REGION, SPACES_ENDPOINT, SPACES_KEY and SPACES_SECRET in .env.local"
    );
  }

  client = new S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    // DigitalOcean Spaces uses path-style by default on most regions; the SDK
    // handles virtual-host style fine, but forcePathStyle avoids edge cases.
    forcePathStyle: false,
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  });

  return client;
};

export const getSpacesBucket = () => {
  const bucket = process.env.SPACES_BUCKET;
  if (!bucket) {
    throw new Error("Missing SPACES_BUCKET in .env.local");
  }
  return bucket;
};
