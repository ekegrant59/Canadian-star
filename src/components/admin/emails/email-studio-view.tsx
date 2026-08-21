'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Users,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Tag,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  SYSTEM_EMAIL_TEMPLATES,
  AVAILABLE_MERGE_TAGS,
  PREDEFINED_ROUTES,
} from '@/data/admin-emails';
import { EmailAudienceFilter, EmailTemplateDefinition, ArtistRecipient } from '@/lib/email/types';
import {
  renderArtistApplicationStageEmail,
  renderVotingOtpEmail,
  renderVoteConfirmedEmail,
  renderFinal16AnnouncementEmail,
  renderCustomBroadcastEmail,
} from '@/lib/email/templates';
import { sendAdminBroadcastAction, sendAdminTestEmailAction } from '@/server/actions/email';

export function EmailStudioView({ recipients }: { recipients: ArtistRecipient[] }) {
  const artistRecipients = useMemo(() => recipients, [recipients]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank_general');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [audienceFilter, setAudienceFilter] = useState<EmailAudienceFilter>('approved_artists');
  const [selectedSingleArtistId, setSelectedSingleArtistId] = useState<string>(
    artistRecipients[0]?.id || '',
  );
  const [showRecipientsList, setShowRecipientsList] = useState(false);

  // Editor State
  const selectedTemplate = useMemo(() => {
    return (
      SYSTEM_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) || SYSTEM_EMAIL_TEMPLATES[0]!
    );
  }, [selectedTemplateId]);

  const [subject, setSubject] = useState(selectedTemplate.defaultSubject);
  const [headline, setHeadline] = useState(selectedTemplate.defaultHeadline);
  const [category, setCategory] = useState(selectedTemplate.defaultCategory || 'STATUS UPDATE');
  const [content, setContent] = useState(selectedTemplate.defaultContent);
  const [ctaText, setCtaText] = useState(selectedTemplate.defaultCtaText || 'VIEW DETAILS');
  const [ctaUrl, setCtaUrl] = useState(selectedTemplate.defaultCtaUrl || '/vote');

  // Test & Broadcast Modal States
  const [testEmailAddress, setTestEmailAddress] = useState('admin@canadianstar.ca');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Link & Button Insert Modals
  const [isInsertLinkOpen, setIsInsertLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('/vote');

  // When switching templates, populate editor
  const handleSelectTemplate = (template: EmailTemplateDefinition) => {
    setSelectedTemplateId(template.id);
    setSubject(template.defaultSubject);
    setHeadline(template.defaultHeadline);
    setCategory(template.defaultCategory || 'OFFICIAL BROADCAST');
    setContent(template.defaultContent);
    setCtaText(template.defaultCtaText || 'VIEW DETAILS');
    setCtaUrl(template.defaultCtaUrl || '/vote');
  };

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    switch (audienceFilter) {
      case 'all_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter');
      case 'approved_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.status === 'accepted');
      case 'pending_artists':
        return artistRecipients.filter(
          (a) =>
            a.source !== 'newsletter' && (a.status === 'submitted' || a.status === 'under_review'),
        );
      case 'rejected_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.status === 'rejected');
      case 'show_1_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.showNumber === 1);
      case 'show_2_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.showNumber === 2);
      case 'show_3_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.showNumber === 3);
      case 'show_4_artists':
        return artistRecipients.filter((a) => a.source !== 'newsletter' && a.showNumber === 4);
      case 'single_artist':
        return artistRecipients.filter(
          (a) => a.source !== 'newsletter' && a.id === selectedSingleArtistId,
        );
      case 'newsletter_subscribers':
        return artistRecipients.filter((a) => a.source === 'newsletter');
      default:
        return artistRecipients;
    }
  }, [artistRecipients, audienceFilter, selectedSingleArtistId]);

  // Selected sample artist for merge variable preview
  const sampleArtist: ArtistRecipient = useMemo(() => {
    if (filteredRecipients.length > 0) return filteredRecipients[0]!;
    return (
      artistRecipients[0] || {
        id: 'preview',
        name: 'Artist',
        actName: 'Artist',
        email: '',
        genre: 'Canadian Country',
        status: 'submitted',
      }
    );
  }, [artistRecipients, filteredRecipients]);

  // Interpolate merge tags in text
  const interpolateTags = useCallback(
    (textToInterpolate: string) => {
      return textToInterpolate
        .replace(/{{artist_name}}/g, sampleArtist.name)
        .replace(/{{act_name}}/g, sampleArtist.actName)
        .replace(/{{genre}}/g, sampleArtist.genre)
        .replace(
          /{{show_name}}/g,
          sampleArtist.showNumber ? `Show ${sampleArtist.showNumber}` : 'Eastern Showcase',
        )
        .replace(/{{status}}/g, sampleArtist.status === 'accepted' ? 'Approved' : 'Under Review')
        .replace(/{{voting_url}}/g, '/vote')
        .replace(/{{dashboard_url}}/g, '/artist')
        .replace(/{{finalists_url}}/g, '/#finalists-roster');
    },
    [sampleArtist],
  );

  // Generate rendered HTML for preview
  const previewHtml = useMemo(() => {
    const interpolatedContent = interpolateTags(content);
    const interpolatedHeadline = interpolateTags(headline);

    // Format newlines into paragraphs
    const paragraphsHtml = interpolatedContent
      .split('\n\n')
      .map(
        (p) =>
          `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #D1CFCD;">${p.replace(/\n/g, '<br/>')}</p>`,
      )
      .join('');

    switch (selectedTemplateId) {
      case 'artist_application_status':
        return renderArtistApplicationStageEmail({
          artistName: sampleArtist.name,
          actName: sampleArtist.actName,
          status: 'approved',
        }).html;
      case 'voting_otp':
        return renderVotingOtpEmail({
          artistName: sampleArtist.name,
          code: '482915',
        }).html;
      case 'vote_confirmed':
        return renderVoteConfirmedEmail({
          artistName: sampleArtist.name,
          artistGenre: sampleArtist.genre,
        }).html;
      case 'final_16_reveal':
        return renderFinal16AnnouncementEmail({
          artistName: sampleArtist.name,
        }).html;
      default:
        return renderCustomBroadcastEmail({
          headline: interpolatedHeadline,
          category,
          bodyHtml: paragraphsHtml,
          ctaText,
          ctaUrl,
        }).html;
    }
  }, [
    selectedTemplateId,
    content,
    headline,
    category,
    ctaText,
    ctaUrl,
    sampleArtist,
    interpolateTags,
  ]);

  // Insert merge tag into content textarea
  const insertMergeTag = (tag: string) => {
    setContent((prev) => prev + ` ${tag} `);
  };

  // Formatting helpers for text editor
  const applyFormat = (prefix: string, suffix: string = prefix) => {
    setContent((prev) => prev + `${prefix}Selected Text${suffix}`);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(previewHtml);
    setCopiedHtml(true);
    setToastMessage({ text: 'Email HTML copied to clipboard.', type: 'success' });
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setToastMessage({ text: 'Please enter a valid test recipient email.', type: 'error' });
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendAdminTestEmailAction({
        toEmail: testEmailAddress,
        templateId: selectedTemplateId,
        customSubject: subject,
        customHeadline: headline,
        customBodyHtml: content,
        customCtaText: ctaText,
        customCtaUrl: ctaUrl,
      });
      if (!result.ok) throw new Error(result.error);
      setToastMessage({
        text: `Test email dispatched to ${testEmailAddress}.`,
        type: 'success',
      });
    } catch {
      setToastMessage({ text: 'Failed to send test email.', type: 'error' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const result = await sendAdminBroadcastAction({
        audience: audienceFilter,
        artistId: selectedSingleArtistId,
        subject,
        headline,
        bodyHtml: content,
        ctaText,
        ctaUrl,
      });
      if (!result.ok) throw new Error(result.error);
      setIsBroadcastModalOpen(false);
      setToastMessage({
        text: result.data.failedCount
          ? `Sent to ${result.data.count} recipients; ${result.data.failedCount} deliveries failed.`
          : `Broadcast successfully sent to ${result.data.count} recipients.`,
        type: result.data.failedCount ? 'error' : 'success',
      });
    } catch {
      setToastMessage({ text: 'Broadcast dispatch failed.', type: 'error' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-lg p-3.5 text-xs font-semibold shadow-xs transition-all ${
            toastMessage.type === 'success'
              ? 'border border-[#A6F4C5] bg-[#E6F9F0] text-[#12B76A]'
              : toastMessage.type === 'error'
                ? 'border border-[#FECDCA] bg-[#FEE4E2] text-[#F04438]'
                : 'border border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-4 cursor-pointer text-current hover:opacity-75"
          >
            <span className="sr-only">Dismiss notification</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3EB] text-[#FF5C00]">
              <Mail className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] lg:text-3xl">
              Email Management & Studio
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#6B7280] sm:text-sm">
            Transactional templates, Broadcast composer, audience filters, and live preview.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* <button
            type="button"
            onClick={handleCopyHtml}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] shadow-xs transition-all cursor-pointer"
          >
            {copiedHtml ? <Check className="w-4 h-4 text-[#12B76A]" /> : <Copy className="w-4 h-4 text-[#6B7280]" />}
            <span>{copiedHtml ? 'Copied HTML' : 'Copy HTML'}</span>
          </button> */}

          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#E05200]"
          >
            <Send className="h-4 w-4 text-white" />
            <span>Send Broadcast ({filteredRecipients.length})</span>
          </button>
        </div>
      </div>

      {/* Template Selector Ribbon */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold tracking-wider text-[#374151] uppercase">
            Select Template or Preset
          </p>
          <span className="text-[11px] text-[#6B7280]">
            {SYSTEM_EMAIL_TEMPLATES.length} System Templates
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SYSTEM_EMAIL_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl)}
                className={`flex cursor-pointer flex-col justify-between rounded-lg border p-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-[#FF5C00] bg-[#FFF9F5] ring-2 ring-[#FF5C00]/20'
                    : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      tmpl.category === 'Voting & Security'
                        ? 'bg-emerald-500'
                        : tmpl.category === 'Artist Onboarding'
                          ? 'bg-blue-500'
                          : tmpl.category === 'Competition Updates'
                            ? 'bg-purple-500'
                            : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[9px] font-bold text-[#9CA3AF] uppercase">
                    {tmpl.category.split(' ')[0]}
                  </span>
                </div>
                <p
                  className={`line-clamp-2 text-xs leading-tight font-bold ${isSelected ? 'text-[#FF5C00]' : 'text-[#111827]'}`}
                >
                  {tmpl.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid: Left (WYSIWYG & Audience) & Right (Live Preview) */}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Composer & Audience (7 Cols) */}
        <div className="space-y-5 lg:col-span-7">
          {/* Audience Filter Card */}
          <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#FF5C00]" />
                <h2 className="text-sm font-bold text-[#111827]">Target Audience & Recipients</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3EB] px-2.5 py-1 text-xs font-bold text-[#FF5C00]">
                {filteredRecipients.length} Recipients Targeted
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4B5563]">
                  Filter Audience Segment
                </label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as EmailAudienceFilter)}
                  className="w-full cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                >
                  <option value="approved_artists">Final 16 / Approved Artists</option>
                  <option value="all_artists">All Registered Artists</option>
                  <option value="pending_artists">Pending Applications</option>
                  <option value="rejected_artists">Unsuccessful Applicants</option>
                  <option value="show_1_artists">Show 1 Artists</option>
                  <option value="show_2_artists">Show 2 Artists</option>
                  <option value="show_3_artists">Show 3 Artists</option>
                  <option value="show_4_artists">Show 4 Artists</option>
                  <option value="single_artist">Individual Artist (Select)</option>
                  <option value="all_voters">Voting Emails (Marketing Opt-in)</option>
                  <option value="verified_voters">Verified Voters (Marketing Opt-in)</option>
                  <option value="newsletter_subscribers">Newsletter Subscribers (Confirmed)</option>
                </select>
              </div>

              {audienceFilter === 'single_artist' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4B5563]">
                    Select Specific Artist
                  </label>
                  <select
                    value={selectedSingleArtistId}
                    onChange={(e) => setSelectedSingleArtistId(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                  >
                    {artistRecipients.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.name} ({art.genre})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4B5563]">
                    Sample Data for Tag Preview
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs font-medium text-[#4B5563]">
                    <span>
                      Previewing as: <strong>{sampleArtist.name}</strong>
                    </span>
                    <span className="text-[10px] font-bold text-[#FF5C00]">
                      {sampleArtist.genre}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Recipient Inspector */}
            <div className="border-t border-[#F3F4F6] pt-2">
              <button
                type="button"
                onClick={() => setShowRecipientsList(!showRecipientsList)}
                className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#6B7280] transition-colors hover:text-[#111827]"
              >
                <span>
                  {audienceFilter === 'all_voters' || audienceFilter === 'verified_voters'
                    ? 'Voter recipients are resolved securely when sending'
                    : `${showRecipientsList ? 'Hide' : 'Inspect'} Candidate Matches (${filteredRecipients.length})`}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showRecipientsList ? 'rotate-180' : ''}`}
                />
              </button>

              {showRecipientsList &&
                audienceFilter !== 'all_voters' &&
                audienceFilter !== 'verified_voters' && (
                  <div className="mt-3 max-h-40 divide-y divide-[#F3F4F6] overflow-y-auto rounded-lg border border-[#E5E7EB] text-xs">
                    {filteredRecipients.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2 hover:bg-[#F9FAFB]"
                      >
                        <div>
                          <span className="font-semibold text-[#111827]">{rec.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-[#9CA3AF]">
                            {rec.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rec.showNumber && (
                            <span className="rounded bg-[#FEF3EB] px-2 py-0.5 text-[10px] font-bold text-[#FF5C00]">
                              Show {rec.showNumber}
                            </span>
                          )}
                          <span className="rounded bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                            {rec.genre}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* WYSIWYG Composer Card */}
          <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827]">Email Content Composer</h2>
            </div>

            {/* Subject Line */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject line..."
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-xs font-medium text-[#111827] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden sm:text-sm"
              />
            </div>

            {/* Headline & Category */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. YOUR APPLICATION HAS BEEN APPROVED"
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. STATUS UPDATE"
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                />
              </div>
            </div>

            {/* WYSIWYG Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2">
              <button
                type="button"
                onClick={() => applyFormat('**', '**')}
                title="Bold"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('*', '*')}
                title="Italic"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('<u>', '</u>')}
                title="Underline"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>

              <div className="mx-1 h-4 w-px bg-[#D1D5DB]" />

              <button
                type="button"
                onClick={() => applyFormat('# ')}
                title="Heading 1"
                className="cursor-pointer rounded p-1.5 text-xs font-bold text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('## ')}
                title="Heading 2"
                className="cursor-pointer rounded p-1.5 text-xs font-bold text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('- ')}
                title="Bullet List"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('1. ')}
                title="Numbered List"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat('> ')}
                title="Blockquote"
                className="cursor-pointer rounded p-1.5 text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>

              <div className="mx-1 h-4 w-px bg-[#D1D5DB]" />

              {/* Insert Route Link Button */}
              <button
                type="button"
                onClick={() => setIsInsertLinkOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-xs"
              >
                <LinkIcon className="h-3.5 w-3.5 text-[#FF5C00]" />
                <span>Link</span>
              </button>

              {/* Merge Tags Dropdown */}
              <div className="group relative ml-auto">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[#D1D5DB] bg-white px-2.5 py-1 text-xs font-semibold text-[#374151] shadow-xs hover:border-[#FF5C00]"
                >
                  <Tag className="h-3.5 w-3.5 text-[#FF5C00]" />
                  <span>Insert Variable</span>
                  <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
                </button>
                <div className="absolute right-0 z-50 mt-1 hidden w-56 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg group-hover:block">
                  {AVAILABLE_MERGE_TAGS.map((tag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      onClick={() => insertMergeTag(tag.tag)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs text-[#374151] hover:bg-[#FFF9F5] hover:text-[#FF5C00]"
                    >
                      <span className="font-mono">{tag.tag}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Body Textarea */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                Body Writeup
              </label>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your email body text here..."
                className="w-full resize-y rounded-lg border border-[#D1D5DB] bg-white p-3 font-sans text-xs text-[#111827] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden sm:text-sm"
              />
            </div>

            {/* Primary CTA Configuration */}
            <div className="grid grid-cols-1 gap-3 border-t border-[#F3F4F6] pt-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                  Primary CTA Button Label
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. VIEW MY DASHBOARD"
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                  CTA Route Destination
                </label>
                <select
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                >
                  {PREDEFINED_ROUTES.map((route) => (
                    <option key={route.value} value={route.value}>
                      {route.label} ({route.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Email Preview (5 Cols) */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-5">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
            {/* Preview Toolbar */}
            <div className="mb-3 flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#FF5C00]" />
                <span className="text-xs font-bold tracking-wider text-[#111827] uppercase">
                  Live Email Preview
                </span>
              </div>

              {/* Viewport Toggles */}
              <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  className={`cursor-pointer rounded-md p-1.5 text-xs font-bold transition-all ${
                    viewMode === 'desktop'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                  title="Desktop 600px View"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mobile')}
                  className={`cursor-pointer rounded-md p-1.5 text-xs font-bold transition-all ${
                    viewMode === 'mobile'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                  title="Mobile 375px View"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Iframe Viewport Wrapper */}
            <div className="flex justify-center overflow-hidden rounded-lg bg-[#1E1E1E] p-3">
              <div
                className={`transition-all duration-300 ${
                  viewMode === 'desktop'
                    ? 'w-full max-w-[600px]'
                    : 'w-[375px] overflow-hidden rounded-2xl border-4 border-[#333333] shadow-2xl'
                }`}
              >
                <iframe
                  title="Email Live Preview"
                  srcDoc={previewHtml}
                  className="h-[650px] w-full border-0 bg-[#131313]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insert Link Modal */}
      {isInsertLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-[#111827]">Insert Route Link</h3>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4B5563]">Link Text</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. View All Finalists"
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#111827]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4B5563]">
                Target Route
              </label>
              <select
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#111827]"
              >
                {PREDEFINED_ROUTES.map((route) => (
                  <option key={route.value} value={route.value}>
                    {route.label} ({route.value})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInsertLinkOpen(false)}
                className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const textToInsert = linkText ? `[${linkText}](${linkUrl})` : linkUrl;
                  setContent((prev) => prev + ` ${textToInsert} `);
                  setIsInsertLinkOpen(false);
                  setLinkText('');
                }}
                className="cursor-pointer rounded-lg bg-[#FF5C00] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#E05200]"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Broadcast Confirmation Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3EB] text-[#FF5C00]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Confirm Email Broadcast Dispatch
                </h3>
                <p className="mt-1 text-xs text-[#6B7280]">
                  You are about to dispatch this email to{' '}
                  <strong>{filteredRecipients.length} recipients</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs">
              <p>
                <strong>Subject:</strong> {subject}
              </p>
              <p>
                <strong>Audience:</strong> {audienceFilter.replace(/_/g, ' ').toUpperCase()}
              </p>
              <p>
                <strong>Recipients:</strong> The server will resolve the current matching database
                recipients.
              </p>
              <p>
                <strong>CTA Button:</strong> {ctaText} <span aria-hidden="true">to</span> {ctaUrl}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={() => setIsBroadcastModalOpen(false)}
                className="cursor-pointer px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={handleSendBroadcast}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#FF5C00] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#E05200] disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isBroadcasting ? 'Dispatching...' : 'Confirm & Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
