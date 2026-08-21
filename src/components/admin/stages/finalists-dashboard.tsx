'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, MapPin, Trophy, Users } from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';

export function FinalistsDashboard({ applications }: { applications: AdminApplicationRecord[] }) {
  const [filter, setFilter] = useState<'all' | 'final16' | 'final4'>('all');
  const roster = applications.filter(
    (app) => app.lifecycleStatus === 'shortlisted' || app.lifecycleStatus === 'finalist',
  );
  const finalists = roster.filter((app) => app.lifecycleStatus === 'finalist');
  const visible =
    filter === 'final16'
      ? roster.filter((app) => app.lifecycleStatus === 'shortlisted')
      : filter === 'final4'
        ? finalists
        : roster;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">FINALISTS</h2>
        <p className="mt-1 text-sm text-gray-600">
          Phase 04: Finalists · manage the Final 16 and select the Final 4.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Final 16 roster" value={roster.length} icon={Users} />
        <Metric label="Final 4 selected" value={finalists.length} icon={Trophy} accent />
        <Metric
          label="Selections remaining"
          value={Math.max(0, 4 - finalists.length)}
          icon={Trophy}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase">
              Final 16 review queue
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Open any row to review the artist and advance eligible semi-finalists.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All Final 16'],
                ['final16', 'Semi-finalists'],
                ['final4', 'Final 4'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black tracking-wider uppercase ${filter === value ? 'bg-[#FF5C00] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">
            No artists match this Finalists phase filter.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map((app) => (
              <Link
                key={app.id}
                href={`/admin/applications/${app.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-orange-50/40"
              >
                <div>
                  <p className="font-bold text-gray-900">{app.stageName}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {app.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${app.lifecycleStatus === 'finalist' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {app.lifecycleStatus === 'finalist' ? 'Final 4' : 'Semi-finalist'}
                  </span>
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: typeof Trophy;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
        <p className={`mt-2 text-3xl font-black ${accent ? 'text-[#FF5C00]' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      <Icon className={`h-6 w-6 ${accent ? 'text-[#FF5C00]' : 'text-gray-400'}`} />
    </div>
  );
}
