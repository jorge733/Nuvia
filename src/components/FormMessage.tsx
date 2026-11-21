import type { ActionState } from "@/lib/types";

export function FormMessage({ state, success }: { state: ActionState; success?: string }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.ok && success)
    return (
      <p role="status" className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        {success}
      </p>
    );
  return null;
}
