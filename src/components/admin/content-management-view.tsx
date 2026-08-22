'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Megaphone,
  PenTool,
  Award,
  Plus,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  Eye,
  Send,
  X,
} from 'lucide-react';
import {
  INITIAL_CONTENT_STATE,
  type ContentManagementState,
  type JudgeRecord,
  type SponsorRecord,
} from '@/data/admin-events-content';

export function ContentManagementView() {
  const [content, setContent] = useState<ContentManagementState>(INITIAL_CONTENT_STATE);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New Judge Form State
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [newJudgeRole, setNewJudgeRole] = useState('');
  const [newJudgeBio, setNewJudgeBio] = useState('');
  const [newJudgePhotoUrl, setNewJudgePhotoUrl] = useState('');
  const [newJudgePhotoFile, setNewJudgePhotoFile] = useState<File | null>(null);
  const [newJudgePhotoPreview, setNewJudgePhotoPreview] = useState('');
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);

  // New Sponsor Form State
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLink, setNewSponsorLink] = useState('');
  const [newSponsorLogoUrl, setNewSponsorLogoUrl] = useState('');
  const [newSponsorLogoFile, setNewSponsorLogoFile] = useState<File | null>(null);
  const [newSponsorLogoPreview, setNewSponsorLogoPreview] = useState('');
  const [isUploadingJudge, setIsUploadingJudge] = useState(false);
  const [isUploadingSponsor, setIsUploadingSponsor] = useState(false);
  const judgeFileInputRef = useRef<HTMLInputElement | null>(null);
  const sponsorFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/admin/content')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setContent((current) => ({
          ...current,
          homepageAnnouncement: data.homepageAnnouncement ?? current.homepageAnnouncement,
          judges: Array.isArray(data.judges) ? data.judges : current.judges,
          sponsors: Array.isArray(data.sponsors) ? data.sponsors : current.sponsors,
          overview: {
            activeJudges:
              data.judges?.filter((judge: JudgeRecord) => judge.status === 'confirmed').length ??
              current.overview.activeJudges,
            sponsorLogos: data.sponsors?.length ?? current.overview.sponsorLogos,
            lastUpdated: 'Loaded from database',
          },
        }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      if (newJudgePhotoPreview) URL.revokeObjectURL(newJudgePhotoPreview);
    },
    [newJudgePhotoPreview],
  );

  useEffect(
    () => () => {
      if (newSponsorLogoPreview) URL.revokeObjectURL(newSponsorLogoPreview);
    },
    [newSponsorLogoPreview],
  );

  const handlePublishAnnouncement = async () => {
    if (isSavingAnnouncement) return;
    setIsSavingAnnouncement(true);
    setSaveError(null);
    const response = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homepageAnnouncement: content.homepageAnnouncement }),
    });
    if (!response.ok) {
      setSaveError('Homepage announcement could not be saved. Review the fields and try again.');
      setIsSavingAnnouncement(false);
      return;
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setIsSavingAnnouncement(false);
  };

  const uploadMedia = async (file: File, kind: 'judge' | 'sponsor') => {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5MB or smaller.');
    const authorization = await fetch('/api/admin/uploads/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
    const signed = (await authorization.json()) as {
      error?: string;
      uploadUrl?: string;
      fields?: Record<string, string>;
    };
    if (!authorization.ok || !signed.uploadUrl || !signed.fields)
      throw new Error(signed.error ?? 'Could not prepare the upload.');
    const form = new FormData();
    Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', file);
    const upload = await fetch(signed.uploadUrl, { method: 'POST', body: form });
    const result = (await upload.json()) as { secure_url?: string; error?: { message?: string } };
    if (!upload.ok || !result.secure_url)
      throw new Error(result.error?.message ?? 'Image upload failed.');
    return result.secure_url;
  };

  const persistManagedContent = async (payload: {
    judges?: JudgeRecord[];
    sponsors?: SponsorRecord[];
  }) => {
    const response = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(result?.error ?? 'Content could not be saved.');
  };

  const handleJudgeFile = (file?: File) => {
    if (!file) return;
    setSaveError(null);
    if (!file.type.startsWith('image/')) {
      setSaveError('Choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Images must be 5MB or smaller.');
      return;
    }
    setNewJudgePhotoFile(file);
    setNewJudgePhotoPreview(URL.createObjectURL(file));
  };

  const handleSponsorFile = (file?: File) => {
    if (!file) return;
    setSaveError(null);
    if (!file.type.startsWith('image/')) {
      setSaveError('Choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Images must be 5MB or smaller.');
      return;
    }
    setNewSponsorLogoFile(file);
    setNewSponsorLogoPreview(URL.createObjectURL(file));
  };

  const resetJudgeForm = () => {
    setNewJudgeName('');
    setNewJudgeRole('');
    setNewJudgeBio('');
    setNewJudgePhotoUrl('');
    setNewJudgePhotoFile(null);
    setNewJudgePhotoPreview('');
    setEditingJudgeId(null);
    setIsAddingJudge(false);
    if (judgeFileInputRef.current) judgeFileInputRef.current.value = '';
  };

  const removeJudgeImage = () => {
    setNewJudgePhotoFile(null);
    setNewJudgePhotoPreview('');
    setNewJudgePhotoUrl('');
    if (judgeFileInputRef.current) judgeFileInputRef.current.value = '';
  };

  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeName.trim() || isUploadingJudge) return;

    setIsUploadingJudge(true);
    setSaveError(null);
    let avatarUrl = newJudgePhotoUrl;
    try {
      if (newJudgePhotoFile) avatarUrl = await uploadMedia(newJudgePhotoFile, 'judge');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Judge image upload failed.');
      setIsUploadingJudge(false);
      return;
    }

    const newJudge: JudgeRecord = {
      id: editingJudgeId ?? `jdg-${Date.now()}`,
      name: newJudgeName,
      role: newJudgeRole || 'Juror',
      bio: newJudgeBio || 'Industry professional.',
      avatarUrl,
      status: 'confirmed',
    };

    const nextJudges = editingJudgeId
      ? content.judges.map((judge) => (judge.id === editingJudgeId ? newJudge : judge))
      : [...content.judges, newJudge];
    try {
      await persistManagedContent({ judges: nextJudges });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Judge could not be saved.');
      setIsUploadingJudge(false);
      return;
    }

    setContent({
      ...content,
      judges: nextJudges,
      overview: {
        ...content.overview,
        activeJudges: editingJudgeId
          ? content.overview.activeJudges
          : content.overview.activeJudges + 1,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setIsUploadingJudge(false);
    resetJudgeForm();
  };

  const handleDeleteJudge = async (id: string) => {
    const nextJudges = content.judges.filter((judge) => judge.id !== id);
    setSaveError(null);
    try {
      await persistManagedContent({ judges: nextJudges });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Judge could not be removed.');
      return;
    }
    setContent({
      ...content,
      judges: nextJudges,
      overview: {
        ...content.overview,
        activeJudges: Math.max(0, content.overview.activeJudges - 1),
      },
    });
  };

  const resetSponsorForm = () => {
    setNewSponsorName('');
    setNewSponsorLink('');
    setNewSponsorLogoUrl('');
    setNewSponsorLogoFile(null);
    setNewSponsorLogoPreview('');
    setIsAddingSponsor(false);
    if (sponsorFileInputRef.current) sponsorFileInputRef.current.value = '';
  };

  const removeSponsorImage = () => {
    setNewSponsorLogoFile(null);
    setNewSponsorLogoPreview('');
    setNewSponsorLogoUrl('');
    if (sponsorFileInputRef.current) sponsorFileInputRef.current.value = '';
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorName.trim() || isUploadingSponsor) return;

    setIsUploadingSponsor(true);
    setSaveError(null);
    let logoUrl = newSponsorLogoUrl;
    try {
      if (newSponsorLogoFile) logoUrl = await uploadMedia(newSponsorLogoFile, 'sponsor');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Sponsor logo upload failed.');
      setIsUploadingSponsor(false);
      return;
    }

    const newSponsor: SponsorRecord = {
      id: `spn-${Date.now()}`,
      name: newSponsorName,
      websiteUrl: newSponsorLink || 'https://nextgreatcanadiancountrystar.ca',
      logoUrl,
      tier: 'presenting',
    };

    const nextSponsors = [...content.sponsors, newSponsor];
    try {
      await persistManagedContent({ sponsors: nextSponsors });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Sponsor could not be saved.');
      setIsUploadingSponsor(false);
      return;
    }

    setContent({
      ...content,
      sponsors: nextSponsors,
      overview: {
        ...content.overview,
        sponsorLogos: content.overview.sponsorLogos + 1,
      },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setIsUploadingSponsor(false);
    resetSponsorForm();
  };

  const handleDeleteSponsor = async (id: string) => {
    const nextSponsors = content.sponsors.filter((sponsor) => sponsor.id !== id);
    setSaveError(null);
    try {
      await persistManagedContent({ sponsors: nextSponsors });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Sponsor could not be removed.');
      return;
    }
    setContent({
      ...content,
      sponsors: nextSponsors,
      overview: {
        ...content.overview,
        sponsorLogos: Math.max(0, content.overview.sponsorLogos - 1),
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {(isSaved || saveError) && (
        <div className="flex flex-col items-end gap-2">
          {isSaved && (
            <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Changes saved successfully.</span>
            </div>
          )}
          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Page Title */}
      <div className="pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            Content Editor
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage public-facing announcements and status texts.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Left Editor (2/3) & Right Overview (1/3) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Content Cards */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Homepage Announcement */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Megaphone className="h-5 w-5 text-[#FF5C00]" />
                <h2 className="text-base font-bold tracking-tight text-gray-900">
                  Homepage Announcement
                </h2>
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                  content.homepageAnnouncement.enabled
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-gray-200 bg-gray-100 text-gray-600'
                }`}
              >
                STATUS: {content.homepageAnnouncement.enabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Headline Text
                </label>
                <input
                  type="text"
                  value={content.homepageAnnouncement.headline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      homepageAnnouncement: {
                        ...content.homepageAnnouncement,
                        headline: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-[#f9fafb] px-3.5 py-2.5 text-sm text-gray-900 transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#FF5C00] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Subtext / Details
                </label>
                <textarea
                  rows={3}
                  value={content.homepageAnnouncement.subtext}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      homepageAnnouncement: {
                        ...content.homepageAnnouncement,
                        subtext: e.target.value,
                      },
                    })
                  }
                  className="w-full resize-y rounded-lg border border-gray-300 bg-[#f9fafb] px-3.5 py-2.5 text-sm text-gray-900 transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#FF5C00] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="display-banner-checkbox"
                  type="checkbox"
                  checked={content.homepageAnnouncement.enabled}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      homepageAnnouncement: {
                        ...content.homepageAnnouncement,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded-sm border-gray-300 text-[#FF5C00] accent-[#FF5C00] focus:ring-[#FF5C00]"
                />
                <label
                  htmlFor="display-banner-checkbox"
                  className="cursor-pointer text-xs font-medium text-gray-800 select-none"
                >
                  Display announcement banner on public homepage
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 text-gray-500" />
                  Preview Announcement
                </button>
                <button
                  type="button"
                  onClick={handlePublishAnnouncement}
                  disabled={isSavingAnnouncement}
                  className="flex items-center gap-1.5 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#E05200] disabled:cursor-wait disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSavingAnnouncement
                    ? 'Saving...'
                    : content.homepageAnnouncement.enabled
                      ? 'Publish Announcement'
                      : 'Save as Hidden'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Judges Management */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <PenTool className="h-5 w-5 text-[#FF5C00]" />
                <h2 className="text-base font-bold tracking-tight text-gray-900">
                  Judges Management
                </h2>
              </div>

              <button
                type="button"
                onClick={() => (isAddingJudge ? resetJudgeForm() : setIsAddingJudge(true))}
                className="flex items-center gap-1 rounded-lg bg-[#FEF3EB] px-3 py-1.5 text-xs font-bold text-[#E85D04] shadow-2xs transition-colors hover:bg-[#FDE7D9]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>ADD JUDGE</span>
              </button>
            </div>

            {/* Existing Judges Items */}
            <div className="mb-5 space-y-3">
              {content.judges.map((judge) => (
                <div
                  key={judge.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#f9fafb] p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                      {judge.avatarUrl ? (
                        <Image
                          src={judge.avatarUrl}
                          alt={judge.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-600">
                          {judge.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{judge.name}</p>
                      <p className="text-xs font-medium text-gray-500">{judge.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewJudgeName(judge.name);
                        setNewJudgeRole(judge.role);
                        setNewJudgeBio(judge.bio);
                        setNewJudgePhotoUrl(judge.avatarUrl);
                        setNewJudgePhotoFile(null);
                        setNewJudgePhotoPreview('');
                        setEditingJudgeId(judge.id);
                        setIsAddingJudge(true);
                      }}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900"
                      aria-label={`Edit ${judge.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteJudge(judge.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${judge.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Add/Edit Judge Form */}
            {isAddingJudge && (
              <form
                onSubmit={handleAddJudge}
                className="animate-in fade-in space-y-4 rounded-xl border border-[#FFD8BF] bg-[#FFF9F5] p-4"
              >
                <h3 className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                  Add / Edit Judge Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newJudgeName}
                      onChange={(e) => setNewJudgeName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                      Role
                    </label>
                    <input
                      type="text"
                      value={newJudgeRole}
                      onChange={(e) => setNewJudgeRole(e.target.value)}
                      placeholder="e.g. Lead Juror"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Biography
                  </label>
                  <textarea
                    rows={2}
                    value={newJudgeBio}
                    onChange={(e) => setNewJudgeBio(e.target.value)}
                    placeholder="Short bio..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
                  />
                </div>

                {/* Judge Photo Upload Dropzone */}
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Judge Photo
                  </label>
                  <input
                    ref={judgeFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={Boolean(newJudgePhotoPreview || newJudgePhotoUrl)}
                    onChange={(event) => handleJudgeFile(event.target.files?.[0])}
                  />
                  {newJudgePhotoPreview || newJudgePhotoUrl ? (
                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3">
                      <Image
                        src={newJudgePhotoPreview || newJudgePhotoUrl}
                        alt="Judge preview"
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-full object-cover"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900">
                          {newJudgePhotoFile?.name ?? 'Current judge photo'}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-500">One image selected</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeJudgeImage}
                        disabled={isUploadingJudge}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => judgeFileInputRef.current?.click()}
                      disabled={isUploadingJudge}
                      className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 transition-colors hover:border-[#FF5C00] disabled:opacity-60"
                    >
                      <Upload className="mb-1 h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Select Image</span>
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        Preview first. Uploads when the judge is saved.
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetJudgeForm}
                    disabled={isUploadingJudge}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingJudge}
                    className="rounded-lg bg-[#FF5C00] px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#E05200] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isUploadingJudge
                      ? 'Uploading & Saving...'
                      : editingJudgeId
                        ? 'Update Judge'
                        : 'Save Judge'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Card 4: Sponsors Management */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-[#FF5C00]" />
                <h2 className="text-base font-bold tracking-tight text-gray-900">
                  Sponsors Management
                </h2>
              </div>

              <button
                type="button"
                onClick={() => (isAddingSponsor ? resetSponsorForm() : setIsAddingSponsor(true))}
                className="flex items-center gap-1 rounded-lg bg-[#FEF3EB] px-3 py-1.5 text-xs font-bold text-[#E85D04] shadow-2xs transition-colors hover:bg-[#FDE7D9]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>ADD SPONSOR</span>
              </button>
            </div>

            {/* Existing Sponsor Logos Grid */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {content.sponsors.map((sponsor, idx) => (
                <div
                  key={sponsor.id}
                  className="group relative flex h-20 items-center justify-center rounded-xl border border-gray-200 bg-[#f9fafb] p-4 text-center"
                >
                  {sponsor.logoUrl ? (
                    <Image
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      width={120}
                      height={40}
                      className="max-h-10 w-auto object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="truncate text-xs font-bold text-gray-700">
                      {sponsor.name || `Logo ${idx + 1}`}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(sponsor.id)}
                    className="absolute top-1.5 right-1.5 rounded-full border border-gray-200 bg-white p-1 text-gray-400 opacity-0 shadow-2xs transition-opacity group-hover:opacity-100 hover:text-red-600"
                    aria-label={`Remove sponsor ${sponsor.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Inline Add Sponsor Form */}
            {isAddingSponsor && (
              <form
                onSubmit={handleAddSponsor}
                className="animate-in fade-in space-y-4 rounded-xl border border-[#FFD8BF] bg-[#FFF9F5] p-4"
              >
                <h3 className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                  Add Sponsor Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                      Sponsor Name
                    </label>
                    <input
                      type="text"
                      value={newSponsorName}
                      onChange={(e) => setNewSponsorName(e.target.value)}
                      placeholder="e.g. Yamaha Canada Music"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                      Website Link
                    </label>
                    <input
                      type="url"
                      value={newSponsorLink}
                      onChange={(e) => setNewSponsorLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Logo Upload Dropzone */}
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-gray-700 uppercase">
                    Logo Upload
                  </label>
                  <input
                    ref={sponsorFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    disabled={Boolean(newSponsorLogoPreview || newSponsorLogoUrl)}
                    onChange={(event) => handleSponsorFile(event.target.files?.[0])}
                  />
                  {newSponsorLogoPreview || newSponsorLogoUrl ? (
                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center bg-gray-50 p-2">
                        <Image
                          src={newSponsorLogoPreview || newSponsorLogoUrl}
                          alt="Sponsor logo preview"
                          width={160}
                          height={64}
                          className="max-h-16 w-auto object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900">
                          {newSponsorLogoFile?.name ?? 'Current sponsor logo'}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-500">One image selected</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeSponsorImage}
                        disabled={isUploadingSponsor}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sponsorFileInputRef.current?.click()}
                      disabled={isUploadingSponsor}
                      className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-5 transition-colors hover:border-[#FF5C00] disabled:opacity-60"
                    >
                      <Upload className="mb-1 h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Select Logo</span>
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        Preview first. Uploads when the sponsor is saved.
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetSponsorForm}
                    disabled={isUploadingSponsor}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingSponsor}
                    className="rounded-lg bg-[#FF5C00] px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#E05200] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isUploadingSponsor ? 'Uploading & Saving...' : 'Save Sponsor'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Content Overview Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card: Content Overview */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs sm:p-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-xs font-bold tracking-wider text-gray-500 uppercase">
              Content Overview
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Active Judges</span>
                <span className="text-lg font-bold text-gray-900">
                  {content.overview.activeJudges}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Sponsor Logos</span>
                <span className="text-lg font-bold text-gray-900">
                  {content.overview.sponsorLogos}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs font-medium text-gray-500">Last Updated</span>
                <span className="text-xs font-bold text-gray-700">
                  {content.overview.lastUpdated}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Live Public Announcement Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5 rounded-xl bg-linear-to-r from-[#FF5C00] to-[#E05200] p-4 text-white shadow-md">
              <p className="text-xs font-semibold tracking-wider uppercase opacity-90">
                Official Announcement
              </p>
              <h4 className="text-lg font-black">{content.homepageAnnouncement.headline}</h4>
              <p className="text-xs leading-relaxed text-white/90">
                {content.homepageAnnouncement.subtext}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-black"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
