import "server-only";
import { revalidateTag } from "next/cache";

/** Every public read is tagged with this; any admin mutation of public content invalidates it. */
export const PUBLIC_CONTENT_TAG = "public-content";

export function invalidatePublicContent() {
  revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
}
