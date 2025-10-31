import { createSocialImage, contentType, size } from "./social-image";

export { contentType, size };
export const runtime = "nodejs";

export default async function twitterImage() {
  return createSocialImage();
}
