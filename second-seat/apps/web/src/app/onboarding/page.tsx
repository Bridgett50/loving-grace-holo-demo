import { redirect } from "next/navigation";
import { consentText } from "@second-seat/core";
import { OnboardingWizard } from "./wizard";
import { loadOwner } from "@/lib/server/view-model";
import { isDemoMode } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const o = await loadOwner();
  if (o.twin) redirect("/twin");
  return (
    <div className="mx-auto max-w-3xl">
      <OnboardingWizard
        initialName={o.user?.name ?? ""}
        initialEmail={o.user?.email ?? ""}
        alreadyVerified={o.verified}
        consentTemplate={consentText("{{NAME}}")}
        demoMode={isDemoMode}
      />
    </div>
  );
}
