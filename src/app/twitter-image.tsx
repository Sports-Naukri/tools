import { contentType, createSocialImage, size } from "./social-image";

export { contentType, size };
export const runtime = "nodejs";
export const revalidate = 3600;

export default async function twitterImage() {
  return createSocialImage();
}
