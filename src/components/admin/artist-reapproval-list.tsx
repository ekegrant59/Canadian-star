'use client';

import Link from 'next/link';
import { ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';

export function ArtistReapprovalList({ applications }: { applications: AdminApplicationRecord[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          ARTIST REAPPROVAL
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review profile edits submitted by accepted artists before they appear publicly.
        </p>
      </div>
      <section className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3 p-4 text-sm text-orange-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5C00]" />
          <p>
            Approved, shortlisted, and finalist artists keep their current public profile until
            these edits are approved.
          </p>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        {applications.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No artist edits are waiting for approval.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applications.map((application) => (
              <Link
                key={application.id}
                href={`/admin/applications/${application.id}`}
                className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-bold text-gray-900">{application.stageName}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {application.applicationNumber} · {application.lifecycleStatus}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                    <Clock className="h-3.5 w-3.5" /> Submitted{' '}
                    {application.pendingEditsSubmittedAt?.toLocaleString() ?? 'recently'}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#FF5C00]" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
