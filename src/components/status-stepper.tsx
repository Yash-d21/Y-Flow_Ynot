import { Check } from "lucide-react";
import { STEPPER_STEPS, stepIndex } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export function StatusStepper({ status }: { status: string }) {
  const current = stepIndex(status as OrderStatus);

  return (
    <ol className="space-y-3">
      {STEPPER_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : active
                    ? "border-orange-500"
                    : "border-slate-300"
              }`}
            >
              {done && <Check className="h-3 w-3" />}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  done || active ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              {active && status === "PROOF" && (
                <p className="text-xs text-orange-600">Pending Approval</p>
              )}
              {active && status === "QC" && (
                <p className="text-xs text-indigo-600">Quality check</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
