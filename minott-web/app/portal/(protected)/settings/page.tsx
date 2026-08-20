import { getEmailSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdminSession } from "@/lib/portal";

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const settings = await getEmailSettings();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Email addresses used for inquiry notifications. Leave blank to disable
        sending (inquiries always land in Requests either way). The Resend API
        key is configured on the server, not here.
      </p>
      <div className="mt-6">
        <SettingsForm
          settings={{
            fromEmail: settings.fromEmail ?? "",
            fromName: settings.fromName ?? "",
            generalInboxEmail: settings.generalInboxEmail ?? "",
          }}
        />
      </div>
    </div>
  );
}
