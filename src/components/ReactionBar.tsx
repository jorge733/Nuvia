"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "@/app/actions";
import { REACTIONS, type ReactionKind, type ReactionState } from "@/lib/types";

export function ReactionBar({
  postId,
  state,
  isAuthor,
  isLoggedIn,
}: {
  postId: string;
  state: ReactionState;
  isAuthor: boolean;
  isLoggedIn: boolean;
}) {
  const [, startTransition] = useTransition();
  const [mine, setMine] = useOptimistic(state.mine, (current: ReactionKind[], kind: ReactionKind) =>
    current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
  );

  if (isAuthor && state.counts) {
    const total = Object.values(state.counts).reduce((a, b) => a + b, 0);
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted" title="Solo tú ves cómo resonó tu aporte">
        {total === 0 ? (
          <span>Aún nadie ha reaccionado · solo tú verás cómo resuena</span>
        ) : (
          <>
            {REACTIONS.filter((r) => state.counts![r.kind] > 0).map((r) => (
              <span key={r.kind} className="chip">
                {r.emoji} {r.label} · {state.counts![r.kind]}
              </span>
            ))}
            <span className="text-xs">Solo tú ves esto</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reaccionar a este aporte">
      {REACTIONS.map((r) => {
        const active = mine.includes(r.kind);
        const cls = `chip transition ${active ? "border-brand bg-brand/10 text-brand" : "hover:border-brand/50"}`;
        if (!isLoggedIn) {
          return (
            <Link key={r.kind} href="/entrar" className={cls}>
              {r.emoji} {r.label}
            </Link>
          );
        }
        return (
          <button
            key={r.kind}
            type="button"
            aria-pressed={active}
            className={cls}
            onClick={() =>
              startTransition(async () => {
                setMine(r.kind);
                await toggleReaction(postId, r.kind, active);
              })
            }
          >
            {r.emoji} {r.label}
          </button>
        );
      })}
    </div>
  );
}
