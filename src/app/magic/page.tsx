import { Suspense } from "react";
import MagicClientPage from "./magic-client";

export default function MagicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-600">
          Loading…
        </div>
      }
    >
      <MagicClientPage />
    </Suspense>
  );
}
