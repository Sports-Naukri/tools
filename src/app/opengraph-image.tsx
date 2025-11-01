import { createSocialImage, contentType, size } from "./social-image";

export { contentType, size };
export const runtime = "nodejs";
export const revalidate = 3600;

export default async function opengraphImage() {
  return createSocialImage();
}
