import { requireAdminSession, getAdminUsers } from "@/lib/portal";
import { resendAdminInvite, setAdminActive } from "@/lib/actions/admins";
import { AdminAccountForm } from "@/components/admin/AdminAccountForm";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(admin: { banned: boolean | null; activatedAt: Date | null }) {
  if (admin.banned) return "Deactivated";
  return admin.activatedAt ? "Active" : "Pending";
}

export default async function AdminAdminsPage() {
  const session = await requireAdminSession();
  const admins = await getAdminUsers();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Admins</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Admin accounts are provisioned here — public sign-up is disabled. New
        admins are invited by email to set their own password.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mec-ink/60">
                  No admin accounts yet.
                </td>
              </tr>
            )}
            {admins.map((a) => {
              const status = statusLabel(a);
              const isSelf = a.id === session.user.id;
              return (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="px-4 py-3 font-semibold">
                    {a.name}
                    {isSelf && (
                      <span className="ml-2 rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/70">
                    <a href={`mailto:${a.email}`} className="hover:text-mec-red">
                      {a.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {status === "Active" && (
                      <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                        active
                      </span>
                    )}
                    {status === "Pending" && (
                      <span className="rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                        pending
                      </span>
                    )}
                    {status === "Deactivated" && (
                      <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/40">
                        deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/60">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      {status === "Pending" && (
                        <form action={resendAdminInvite}>
                          <input type="hidden" name="email" value={a.email} />
                          <button
                            type="submit"
                            className="font-semibold text-mec-red hover:underline"
                          >
                            Resend invite
                          </button>
                        </form>
                      )}
                      {status === "Deactivated" ? (
                        <form action={setAdminActive}>
                          <input type="hidden" name="userId" value={a.id} />
                          <input type="hidden" name="active" value="true" />
                          <button
                            type="submit"
                            className="font-semibold text-mec-red hover:underline"
                          >
                            Reactivate
                          </button>
                        </form>
                      ) : (
                        !isSelf && (
                          <form action={setAdminActive}>
                            <input type="hidden" name="userId" value={a.id} />
                            <input type="hidden" name="active" value="false" />
                            <button
                              type="submit"
                              className="text-mec-ink/50 hover:text-mec-red"
                            >
                              Deactivate
                            </button>
                          </form>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="font-display-tight text-xl">Invite a new admin</h2>
        <div className="mt-4">
          <AdminAccountForm />
        </div>
      </div>
    </div>
  );
}
