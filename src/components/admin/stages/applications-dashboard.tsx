'use client';

import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Vote,
  Calendar,
} from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import { ProfileImage } from '@/components/shared/profile-image';

export function ApplicationsDashboard({
  applications,
  stats,
  phases,
  shows,
}: {
  applications: AdminApplicationRecord[];
  stats: { total: number; pending: number; approved: number; rejected: number };
  phases: Array<{ id: string; label: string; startsAt: Date; endsAt: Date }>;
  shows: Array<{
    id: string;
    label: string;
    showDate: string;
    status: 'scheduled' | 'postponed' | 'completed' | 'cancelled';
  }>;
}) {
  const recentApplications = applications.slice(0, 4);
  const now = new Date();
  const timeline = [
    ...phases.map((phase) => ({
      id: `${phase.id}-end`,
      date: phase.endsAt,
      title: `${phase.label} closes`,
      status: phase.endsAt < now ? 'completed' : phase.startsAt <= now ? 'current' : 'upcoming',
    })),
    ...shows.map((show) => ({
      id: show.id,
      date: new Date(`${show.showDate}T12:00:00`),
      title: show.label,
      status: new Date(`${show.showDate}T23:59:59`) < now ? 'completed' : 'upcoming',
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Overview Top Header & Action Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            COMPETITION OVERVIEW
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active Phase
            </span>
            <span className="text-sm font-medium text-gray-600">Applications</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold tracking-wider text-gray-700 uppercase shadow-2xs transition-colors hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>EXPORT REPORT</span>
          </button>
          <Link
            href="/admin/voting"
            className="flex items-center gap-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-colors hover:bg-[#e05200]"
          >
            <Vote className="h-3.5 w-3.5" />
            <span>MANAGE VOTING</span>
          </Link>
        </div>
      </div>

      {/* 4 Metrics Cards Row (Matching Admin - Dashboard.svg) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Applications */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              TOTAL APPLICATIONS
            </span>
            <p className="mt-2 text-3xl font-black text-gray-900">{stats.total}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Review */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              PENDING REVIEW
            </span>
            <p className="mt-2 text-3xl font-black text-[#FF5C00]">{stats.pending}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-[#FF5C00]">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Approved Artists */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              APPROVED ARTISTS
            </span>
            <p className="mt-2 text-3xl font-black text-emerald-600">{stats.approved}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Rejected Applications */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              REJECTED
            </span>
            <p className="mt-2 text-3xl font-black text-red-600">{stats.rejected}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xs lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  <th className="px-5 py-3.5">ARTIST / BAND</th>
                  <th className="px-4 py-3.5">TYPE</th>
                  <th className="px-4 py-3.5">LOCATION</th>
                  <th className="px-4 py-3.5">SUBMISSION DATE</th>
                  <th className="px-4 py-3.5">STATUS</th>
                  <th className="px-4 py-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="transition-colors hover:bg-gray-50/80">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-200">
                          <ProfileImage
                            src={app.avatarUrl}
                            alt={app.stageName}
                            className="h-8 w-8 rounded-full"
                          />
                        </div>
                        <span className="font-bold text-gray-900">{app.stageName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 capitalize">{app.actType}</td>
                    <td className="px-4 py-3.5 text-gray-600">{app.location}</td>
                    <td className="px-4 py-3.5 text-gray-600">{app.submissionDate}</td>
                    <td className="px-4 py-3.5">
                      {app.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-orange-700 uppercase">
                          PENDING
                        </span>
                      )}
                      {app.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                          APPROVED
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-red-700 uppercase">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="inline-block rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        title={`Review ${app.stageName}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 text-xs text-gray-500">
            <span>
              Showing {Math.min(recentApplications.length, 4)} of {applications.length} submissions
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-400 shadow-2xs"
              >
                Prev
              </button>
              <Link
                href="/admin/applications"
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-2xs transition-colors hover:bg-gray-50"
              >
                Next
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-200/90 bg-white p-6 shadow-xs">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wider text-gray-900 uppercase">
                Upcoming Dates
              </h3>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>

            <div className="relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-gray-100">
              {timeline.map((milestone) => (
                <div key={milestone.id} className="group relative">
                  <span
                    className={`absolute top-1 -left-6 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                      milestone.status === 'completed'
                        ? 'bg-[#FF5C00]'
                        : milestone.status === 'current'
                          ? 'animate-pulse bg-emerald-500'
                          : 'bg-gray-300'
                    }`}
                  />
                  <span className="block text-[11px] font-bold tracking-wider text-[#FF5C00] uppercase">
                    {new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(
                      milestone.date,
                    )}
                  </span>
                  <h4 className="mt-0.5 text-sm font-bold text-gray-900">{milestone.title}</h4>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/admin/events"
            className="mt-6 block text-center text-xs font-bold tracking-wider text-[#FF5C00] uppercase hover:underline"
          >
            Manage Competition Schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
