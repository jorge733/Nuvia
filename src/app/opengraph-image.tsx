import { OG_MAIN, OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Uniluva — En tu familia, todos cuentan.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg(OG_MAIN);
}
