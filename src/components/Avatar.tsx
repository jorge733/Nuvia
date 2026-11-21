import { mediaUrl } from "@/lib/supabase/env";
import type { ProfileLite } from "@/lib/types";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-20 text-2xl" } as const;

export function Avatar({ profile, size = "md" }: { profile: Pick<ProfileLite, "display_name" | "avatar_url">; size?: keyof typeof SIZES }) {
  const src = mediaUrl(profile.avatar_url);
  const initials = profile.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-accent font-semibold text-white`}
    >
      {initials || "?"}
    </span>
  );
}
