'use client';

import { Globe, UserCheck, Users, FileText, Music2, Plane } from 'lucide-react';

const eligibility = [
  {
    icon: Globe,
    title: 'Residency',
    copy: 'Must be a legal resident of Canada living or based in Ontario.',
  },
  {
    icon: UserCheck,
    title: 'Age Requirements',
    copy: '18 years of age or older at the time of application submission.',
  },
  {
    icon: Users,
    title: 'Artist Format',
    copy: 'Solo artists, acoustic duos, and full country bands are all eligible.',
  },
  {
    icon: FileText,
    title: 'Agreements',
    copy: 'Must not be bound by exclusive recording or major management contracts conflicting with competition terms.',
  },
  {
    icon: Music2,
    title: 'Original Music',
    copy: 'Must have original country songs written or co-written and prepared for live performance.',
  },
  {
    icon: Plane,
    title: 'Travel & Accommodation',
    copy: 'Artists are responsible for their own travel and accommodation to Peterborough for performance dates.',
    badge: 'DETAILS TO BE CONFIRMED',
  },
] as const;

export function ApplicationsStage() {
  return (
    <section className="section-pad" id="eligibility">
      <div className="container-content">
        <div className="section-intro">
          <span className="pill-eyebrow">APPLICATION REQUIREMENTS</span>
          <h2>ELIGIBILITY CRITERIA</h2>
          <p>
            Ensure you meet all essential requirements before beginning your application. All
            submissions are reviewed by our industry intake committee.
          </p>
        </div>

        <div className="card-grid eligibility-grid">
          {eligibility.map((item) => {
            const Icon = item.icon;
            return (
              <article className="info-card eligibility-card" key={item.title}>
                <div className="card-icon-wrap">
                  <Icon aria-hidden="true" className="card-icon" />
                </div>
                <div className="card-title-line">
                  <h3>{item.title}</h3>
                  {'badge' in item && <span className="pill-badge">{item.badge}</span>}
                </div>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
