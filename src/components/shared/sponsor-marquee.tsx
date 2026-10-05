import Image from 'next/image';

type Sponsor = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
};

/** The sponsor logo slider, shared by the landing page and the artists pages. */
export function SponsorMarquee({ sponsors, label }: { sponsors: Sponsor[]; label: string }) {
  return (
    <section className="partners">
      <span>{label}</span>
      <div className="marquee-container no-scrollbar">
        <div className="marquee-track">
          {[...Array(3)].map((_, setIdx) => (
            <div className="marquee-group" key={setIdx}>
              {sponsors.length ? (
                sponsors.map((sponsor) => {
                  const sponsorLogo = sponsor.logoUrl ? (
                    <Image
                      src={sponsor.logoUrl}
                      width={160}
                      height={36}
                      unoptimized
                      alt={sponsor.name}
                    />
                  ) : (
                    <strong>{sponsor.name}</strong>
                  );
                  return sponsor.websiteUrl ? (
                    <a
                      key={`${setIdx}-${sponsor.id}`}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sponsorLogo}
                    </a>
                  ) : (
                    <span key={`${setIdx}-${sponsor.id}`}>{sponsorLogo}</span>
                  );
                })
              ) : (
                <span>PARTNERS TO BE ANNOUNCED</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
