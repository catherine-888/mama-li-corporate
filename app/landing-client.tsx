'use client';

import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { Btn, FoodPlate, SectionHead, Stamp, Tag } from '@/components/ui';
import { NavBar, Footer } from '@/components/site-chrome';
import { money } from '@/lib/order';
import { useEffect } from 'react';
import type { Bundle } from '@/lib/types';
import type { SiteSettings } from '@/lib/content';

// ─────────────────────────────────────────────────────────────
//  Landing client component — receives bundles + settings.
// ─────────────────────────────────────────────────────────────

export default function LandingClient({
  bundles,
  settings,
}: {
  bundles: Bundle[];
  settings: SiteSettings;
}) {
  const router = useRouter();
  const { postcode } = useOrder();

  // Guard: must have completed the gate
  useEffect(() => {
    if (!postcode) router.replace('/gate');
  }, [postcode, router]);

  const goToMenu = () => router.push('/menu');

  return (
    <div style={{ background: 'var(--cream)' }}>
      <NavBar
        postcode={postcode}
        onChangePostcode={() => router.push('/gate')}
        onCart={goToMenu}
        cartCount={0}
        showSignIn={false}
      />

      {/* HERO — editorial */}
      <section
        style={{
          padding: 'clamp(40px, 6vw, 60px) clamp(20px, 5vw, 60px) 80px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 48,
            alignItems: 'end',
          }}
          className="hero-grid"
        >
          <div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 20,
              }}
            >
              {settings.hero_kicker}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 'clamp(48px, 8vw, 132px)',
                lineHeight: 0.92,
                letterSpacing: '-0.035em',
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              {settings.hero_headline_1}<br />
              <em style={{ color: 'var(--accent)' }}>{settings.hero_headline_2}</em>
              <br />
              {settings.hero_headline_3}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--ink-soft)',
                maxWidth: 480,
                marginTop: 28,
              }}
            >
              {settings.hero_body}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
              <Btn onClick={goToMenu} variant="accent" size="lg">
                Start an order →
              </Btn>
              <Btn variant="secondary" size="lg" onClick={goToMenu}>
                See bundles
              </Btn>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <FoodPlate
              label="Hero · roast platter"
              tone="accent"
              ratio="4 / 5"
              char="燒臘"
              img="https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1000&q=80&auto=format&fit=crop"
            />
            <div
              className="hero-stamp"
              style={{
                position: 'absolute',
                top: -20,
                right: -20,
                zIndex: 2,
              }}
            >
              <Stamp color="var(--accent)" size={104}>
                Min. £250
                <br />2 days
              </Stamp>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div
        style={{
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
          padding: '18px 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 40,
            justifyContent: 'space-around',
            padding: '0 clamp(20px, 5vw, 60px)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink-soft)',
            flexWrap: 'wrap',
          }}
        >
          {settings.trust_logos.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>

      {/* WHAT WE DO */}
      <section
        style={{
          padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: 'clamp(40px, 6vw, 80px)',
            alignItems: 'flex-start',
          }}
          className="what-grid"
        >
          <div>
            <SectionHead
              kicker="What we do"
              title="Built for the boardroom, served like home."
              sub="We run two of the City's busiest Cantonese kitchens — London Wall and Tower Hill. Our corporate kitchen runs separately, every weekday, packing real food for real meetings: partner lunches, all-hands, training days, drinks receptions."
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 28,
                marginTop: 8,
              }}
            >
              {[
                {
                  k: '01',
                  t: 'Family-style platters',
                  d: 'Shared boards of our roast meats, dim sum and greens. Meant to be passed around.',
                },
                {
                  k: '02',
                  t: 'Working lunch boxes',
                  d: 'Individually boxed and labelled — rice or noodles, sorted dietaries.',
                },
                {
                  k: '03',
                  t: 'Drinks reception canapés',
                  d: 'Cantonese small bites, passed or set out, for receptions of 20–200.',
                },
                {
                  k: '04',
                  t: 'À la carte add-ons',
                  d: 'Half a duck, a jar of chilli oil, more siu mai. Build out from a bundle.',
                },
              ].map((b) => (
                <div key={b.k}>
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      color: 'var(--accent)',
                      marginBottom: 8,
                    }}
                  >
                    {b.k}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'Newsreader, serif',
                      fontWeight: 500,
                      fontSize: 19,
                      margin: 0,
                      color: 'var(--ink)',
                    }}
                  >
                    {b.t}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--ink-soft)',
                      margin: '8px 0 0',
                    }}
                  >
                    {b.d}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper-deep)',
              padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 36px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -10,
                fontFamily: 'Newsreader, serif',
                fontSize: 200,
                color: 'var(--ink)',
                opacity: 0.06,
                lineHeight: 1,
              }}
            >
              &ldquo;
            </div>
            <p
              style={{
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
                fontSize: 22,
                lineHeight: 1.4,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              We ordered the Hong Kong Feast for our quarterly review of 60. People are still
              talking about the char siu. Cleared a room of analysts in 12 minutes.
            </p>
            <div
              style={{
                marginTop: 28,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}
            >
              — Priya Shah · Ops, EC2A finance firm
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{
          padding: 'clamp(60px, 8vw, 90px) clamp(20px, 5vw, 60px)',
          background: 'var(--ink)',
          color: 'var(--cream)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 14,
            }}
          >
            — How it works
          </div>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 'clamp(32px, 4vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: '0 0 60px',
              maxWidth: 720,
            }}
          >
            Order by Tuesday, eat on Thursday.{' '}
            <em style={{ color: 'var(--gold)' }}>Simple.</em>
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 40,
            }}
          >
            {[
              { n: '01', t: 'Build your order', d: 'Pick a bundle, add à la carte. £250 minimum.' },
              { n: '02', t: 'Pick your slot', d: 'Two working days ahead, two-hour delivery window.' },
              { n: '03', t: 'We cook, we deliver', d: 'Same kitchen, same hands. Driver calls 15 mins out.' },
              { n: '04', t: 'You eat well', d: 'Heat-up notes included. Containers compostable.' },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  borderTop: '1px solid rgba(245,238,220,0.2)',
                  paddingTop: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 48,
                    fontStyle: 'italic',
                    color: 'var(--gold)',
                    lineHeight: 1,
                    marginBottom: 14,
                  }}
                >
                  {s.n}
                </div>
                <h3
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 20,
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {s.t}
                </h3>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.6,
                    opacity: 0.75,
                    margin: '10px 0 0',
                  }}
                >
                  {s.d}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 70,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <Btn
              onClick={goToMenu}
              variant="primary"
              size="lg"
              style={{ background: 'var(--cream)', color: 'var(--ink)', borderColor: 'var(--cream)' }}
            >
              See the menu →
            </Btn>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                opacity: 0.7,
              }}
            >
              No commitment — full pricing on every bundle.
            </span>
          </div>
        </div>
      </section>

      {/* POPULAR BUNDLES PEEK */}
      <section
        style={{
          padding: 'clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <SectionHead
          kicker="Most ordered"
          title="A taste of what they're picking."
          sub="Our three most-ordered corporate bundles this quarter. Built for sharing — designed for offices that want to feed properly, not corporately."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 32,
            marginTop: 32,
          }}
        >
          {bundles.slice(0, 3).map((b, i) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                cursor: 'pointer',
              }}
              onClick={goToMenu}
            >
              <FoodPlate
                label={b.name}
                tone={(['accent', 'jade', 'gold'] as const)[i]}
                char={b.cn}
                img={b.img}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h3
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontWeight: 500,
                    fontSize: 22,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {b.name}
                </h3>
                <span
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 18,
                    color: 'var(--ink)',
                  }}
                >
                  {money(b.price)}
                </span>
              </div>
              {b.tag && <Tag tone={b.tag === 'Vegan' ? 'jade' : 'accent'}>{b.tag}</Tag>}
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  color: 'var(--ink-soft)',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {b.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 760px) {
          .hero-grid,
          .what-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .hero-stamp {
            top: -10px !important;
            right: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
