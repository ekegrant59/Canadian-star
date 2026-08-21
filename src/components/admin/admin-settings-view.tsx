'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
} from 'lucide-react';
import {
  createAdminUserAction,
  resendAdminInvitationAction,
  setAdminActiveAction,
  updateAdminAccessAction,
} from '@/server/actions/admin-users';
import type { AdminAccessLevel } from '@/lib/auth/roles';

type AdminRecord = {
  id: string;
  name: string | null;
  email: string;
  accessLevel: AdminAccessLevel;
  twoFactorEnabled: boolean;
  bannedAt: Date | null;
  createdAt: Date;
  invitationExpiresAt: Date | null;
  passwordSetAt: Date | null;
};

const ACCESS_LABELS: Record<AdminAccessLevel, { label: string; description: string }> = {
  super: {
    label: 'Super admin',
    description: 'Full control, including administrator accounts and permissions.',
  },
  read_write: {
    label: 'Read and write',
    description: 'Can view and operate the competition, but cannot manage administrators.',
  },
  read_only: {
    label: 'Read only',
    description: 'Can inspect dashboards and records without changing data or sending email.',
  },
};

export function AdminSettingsView({
  currentUserId,
  administrators: initialAdministrators,
}: {
  currentUserId: string;
  administrators: AdminRecord[];
}) {
  const [administrators, setAdministrators] = useState(initialAdministrators);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>('read_only');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(
    () => administrators.filter((admin) => !admin.bannedAt).length,
    [administrators],
  );

  const createAdministrator = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await createAdminUserAction({ name, email, accessLevel });
      if (!result.ok) return setMessage({ tone: 'error', text: result.error });
      setAdministrators((current) => [
        ...current,
        {
          id: result.data.userId,
          name,
          email,
          accessLevel,
          twoFactorEnabled: false,
          bannedAt: null,
          createdAt: new Date(),
          invitationExpiresAt: new Date(result.data.invitationExpiresAt),
          passwordSetAt: null,
        },
      ]);
      setMessage({
        tone: 'success',
        text: result.data.emailSent
          ? 'Invitation sent. It expires in 24 hours.'
          : 'Account created, but Brevo could not deliver the invitation. Use Resend invitation below.',
      });
      setName('');
      setEmail('');
      setAccessLevel('read_only');
    });

  const resendInvitation = (userId: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await resendAdminInvitationAction({ userId });
      if (!result.ok) return setMessage({ tone: 'error', text: result.error });
      setAdministrators((current) =>
        current.map((admin) =>
          admin.id === userId
            ? { ...admin, invitationExpiresAt: new Date(result.data.invitationExpiresAt) }
            : admin,
        ),
      );
      setMessage({ tone: 'success', text: 'A fresh 24-hour invitation was sent.' });
    });

  const changeAccess = (userId: string, next: AdminAccessLevel) =>
    startTransition(async () => {
      setMessage(null);
      const result = await updateAdminAccessAction({ userId, accessLevel: next });
      if (!result.ok) return setMessage({ tone: 'error', text: result.error });
      setAdministrators((current) =>
        current.map((admin) => (admin.id === userId ? { ...admin, accessLevel: next } : admin)),
      );
      setMessage({
        tone: 'success',
        text: 'Administrator permissions updated. Their existing sessions were revoked.',
      });
    });

  const changeActive = (userId: string, active: boolean) =>
    startTransition(async () => {
      setMessage(null);
      const result = await setAdminActiveAction({ userId, active });
      if (!result.ok) return setMessage({ tone: 'error', text: result.error });
      setAdministrators((current) =>
        current.map((admin) =>
          admin.id === userId ? { ...admin, bannedAt: active ? null : new Date() } : admin,
        ),
      );
      setMessage({
        tone: 'success',
        text: active ? 'Administrator reactivated.' : 'Administrator deactivated and signed out.',
      });
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Admin Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create administrator accounts and control exactly what each person can do.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Users} label="Administrators" value={administrators.length} />
        <Metric icon={ShieldCheck} label="Active accounts" value={activeCount} />
        <Metric
          icon={KeyRound}
          label="2FA configured"
          value={administrators.filter((admin) => admin.twoFactorEnabled).length}
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#FF5C00]" />
          <h2 className="text-sm font-extrabold text-gray-900 uppercase">Add Administrator</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="admin-setting-input"
              placeholder="Operations Manager"
            />
          </Field>
          <Field label="Email address">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="admin-setting-input"
              placeholder="manager@example.com"
            />
          </Field>
          <Field label="Access level">
            <select
              value={accessLevel}
              onChange={(event) => setAccessLevel(event.target.value as AdminAccessLevel)}
              className="admin-setting-input"
            >
              {Object.entries(ACCESS_LABELS).map(([value, details]) => (
                <option key={value} value={value}>
                  {details.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-gray-500">
              {ACCESS_LABELS[accessLevel].description}
            </span>
          </Field>
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-xs text-orange-800">
            <div className="flex items-center gap-2 font-bold">
              <Mail className="h-4 w-4" />
              Secure email invitation
            </div>
            <p className="mt-2 leading-relaxed">
              Brevo will send a single-use link. The invitee creates their own password, and the
              link expires after 24 hours.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={createAdministrator}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#FF5C00] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create administrator
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-extrabold text-gray-900 uppercase">Administrator Accounts</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {administrators.map((admin) => {
            const active = !admin.bannedAt;
            const pending = !admin.passwordSetAt;
            const invitationExpired =
              pending && (!admin.invitationExpiresAt || admin.invitationExpiresAt <= new Date());
            return (
              <div
                key={admin.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_220px_150px] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900">{admin.name || 'Administrator'}</p>
                    {admin.id === currentUserId && (
                      <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#FF5C00]">
                        YOU
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${!active ? 'bg-red-50 text-red-700' : pending || !admin.twoFactorEnabled ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                    >
                      {!active
                        ? 'INACTIVE'
                        : pending
                          ? invitationExpired
                            ? 'INVITE EXPIRED'
                            : 'INVITED'
                          : !admin.twoFactorEnabled
                            ? '2FA PENDING'
                            : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{admin.email}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {pending
                      ? admin.invitationExpiresAt
                        ? `Invitation expires ${new Date(admin.invitationExpiresAt).toLocaleString()}`
                        : 'Invitation needs to be sent'
                      : admin.twoFactorEnabled
                        ? 'Password and 2FA configured'
                        : 'Password created; 2FA setup required at next production login'}
                  </p>
                </div>
                <select
                  aria-label={`Access level for ${admin.email}`}
                  value={admin.accessLevel}
                  disabled={isPending || admin.id === currentUserId}
                  onChange={(event) =>
                    changeAccess(admin.id, event.target.value as AdminAccessLevel)
                  }
                  className="admin-setting-input disabled:bg-gray-100"
                >
                  {Object.entries(ACCESS_LABELS).map(([value, details]) => (
                    <option key={value} value={value}>
                      {details.label}
                    </option>
                  ))}
                </select>
                {pending && active ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => resendInvitation(admin.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-[#FF5C00] hover:bg-orange-50 disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Resend invite
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending || admin.id === currentUserId}
                    onClick={() => changeActive(admin.id, !active)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40 ${active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    {active ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {active ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <style jsx>{`
        .admin-setting-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          padding: 10px 12px;
          font-size: 13px;
          color: #111827;
          outline: none;
        }
        .admin-setting-input:focus {
          border-color: #ff5c00;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-gray-600">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCog;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
        <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
      </div>
      <Icon className="h-6 w-6 text-[#FF5C00]" />
    </div>
  );
}
