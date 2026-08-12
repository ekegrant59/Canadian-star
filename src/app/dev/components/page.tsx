import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label, FieldError, FieldHint } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

/**
 * Component inventory. Every primitive in every state, for visual verification
 * against the design comps.
 *
 * NEVER ships to production: the route 404s outside development. It is a
 * development tool, and a public inventory page is free reconnaissance.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border border-t py-10">
      <h2 className="font-display text-text mb-6 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-text-subtle mb-3 text-xs tracking-wide uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function ComponentInventoryPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const swatches = [
    ['canvas', 'var(--color-canvas)'],
    ['surface', 'var(--color-surface)'],
    ['panel', 'var(--color-panel)'],
    ['panel-raised', 'var(--color-panel-raised)'],
    ['primary', 'var(--color-primary)'],
    ['text', 'var(--color-text)'],
    ['text-warm', 'var(--color-text-warm)'],
    ['text-accent', 'var(--color-text-accent)'],
    ['text-muted', 'var(--color-text-muted)'],
    ['border', 'var(--color-border)'],
  ] as const;

  return (
    <main id="main" className="container-content py-16">
      <header className="pb-6">
        <Badge>development only</Badge>
        <h1 className="font-display text-text mt-4 text-3xl font-semibold">Component inventory</h1>
        <p className="text-text-muted mt-2 max-w-prose text-sm">
          Every primitive in every state. Check against the design comps at 375px and at desktop
          width. This route 404s in production.
        </p>
      </header>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {swatches.map(([name, value]) => (
            <div key={name}>
              <div
                className="border-border h-16 w-full rounded-md border"
                style={{ backgroundColor: value }}
              />
              <p className="text-text-muted mt-2 font-mono text-xs">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radii">
        <div className="flex flex-wrap gap-4">
          {['xs', 'sm', 'md', 'lg', 'xl'].map((radius) => (
            <div key={radius} className="text-center">
              <div
                className="bg-panel border-border size-16 border"
                style={{ borderRadius: `var(--radius-${radius})` }}
              />
              <p className="text-text-muted mt-2 font-mono text-xs">{radius}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-6">
          {['xs', 'sm', 'md', 'lg', 'glow'].map((shadow) => (
            <div key={shadow} className="text-center">
              <div
                className="bg-panel size-20 rounded-lg"
                style={{ boxShadow: `var(--shadow-${shadow})` }}
              />
              <p className="text-text-muted mt-2 font-mono text-xs">{shadow}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Row label="variants">
          <Button variant="primary">Apply now</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="danger">Delete</Button>
        </Row>
        <Row label="sizes (all clear 44px tap target except sm)">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="disabled">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
        </Row>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-xl gap-6">
          <div className="grid gap-2">
            <Label htmlFor="demo-name">Act name</Label>
            <Input id="demo-name" placeholder="The Gravel Road Band" />
            <FieldHint>The name you perform under.</FieldHint>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="demo-error">Email</Label>
            <Input id="demo-error" aria-invalid defaultValue="not-an-email" />
            <FieldError>Enter a valid email address.</FieldError>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="demo-bio">Biography</Label>
            <Textarea id="demo-bio" placeholder="Tell us about your act." />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="demo-disabled">Disabled</Label>
            <Input id="demo-disabled" disabled defaultValue="Locked after submission" />
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <Row label="variants">
          <Badge>Default</Badge>
          <Badge variant="primary">Finalist</Badge>
          <Badge variant="warm">Shortlisted</Badge>
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Under review</Badge>
          <Badge variant="danger">Rejected</Badge>
        </Row>
      </Section>

      <Section title="Card">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Qualifying Show 1</CardTitle>
              <CardDescription>Saturday, January 9, 2027</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted text-sm">
                Four artists perform. One advances to the Grand Final.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Tickets</Button>
              <Button size="sm" variant="ghost">
                Details
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Typography">
        <div className="grid gap-3">
          <h1 className="font-display text-text text-4xl font-semibold">Display 4xl</h1>
          <h2 className="font-display text-text text-2xl font-semibold">Display 2xl</h2>
          <p className="text-text text-base">Body base, Epilogue when the font files land.</p>
          <p className="text-text-warm text-base">Body warm secondary.</p>
          <p className="text-text-muted text-sm">Body small muted.</p>
          <p className="text-text-subtle text-xs">Metadata extra small.</p>
        </div>
      </Section>
    </main>
  );
}
