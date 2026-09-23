import { handleImageDownload } from "../../../lib/image-download-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleImageDownload(request);
}
