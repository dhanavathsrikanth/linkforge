import { describe, it, expect } from 'vitest';
import { resolveRoute, firstSegment } from './domain-routing';
import type { DomainConfig } from './types';

function cfg(overrides: Partial<DomainConfig> = {}): DomainConfig {
  return {
    role: 'both',
    status: 'active',
    workspaceId: 'ws-1',
    hasRootBio: false,
    ...overrides,
  };
}

describe('firstSegment', () => {
  it('extracts the first path segment, lowercased, ignoring leading slashes', () => {
    expect(firstSegment('/Promo')).toBe('promo');
    expect(firstSegment('promo/extra')).toBe('promo');
    expect(firstSegment('//a/b')).toBe('a');
    expect(firstSegment('/')).toBe('');
    expect(firstSegment('')).toBe('');
  });
});

describe('resolveRoute — precedence', () => {
  it('suspension wins over everything (billing → 503)', () => {
    const r = resolveRoute(cfg({ status: 'suspended_billing', hasRootBio: true, rootBioId: 'g1' }), '/');
    expect(r).toEqual({ kind: 'suspended', httpStatus: 503 });
  });

  it('abuse suspension → 410, even for a normal link path', () => {
    const r = resolveRoute(cfg({ status: 'suspended_abuse' }), '/promo');
    expect(r).toEqual({ kind: 'suspended', httpStatus: 410 });
  });

  it('system paths pass through before bio/link resolution', () => {
    expect(resolveRoute(cfg({ role: 'bio', hasRootBio: true, rootBioId: 'g1' }), '/favicon.ico'))
      .toEqual({ kind: 'system-passthrough' });
    expect(resolveRoute(cfg(), '/robots.txt')).toEqual({ kind: 'system-passthrough' });
    expect(resolveRoute(cfg(), '/sitemap.xml')).toEqual({ kind: 'system-passthrough' });
    expect(resolveRoute(cfg(), '/manifest.json')).toEqual({ kind: 'system-passthrough' });
    expect(resolveRoute(cfg(), '/.well-known/acme-challenge/x'))
      .toEqual({ kind: 'system-passthrough' });
  });

  it('system passthrough applies even on a role=bio domain (the favicon bug fix)', () => {
    const r = resolveRoute(cfg({ role: 'bio', hasRootBio: true, rootBioId: 'g1' }), '/manifest.json');
    expect(r).toEqual({ kind: 'system-passthrough' });
  });
});

describe('resolveRoute — root path', () => {
  it('root-bio when a bio is bound', () => {
    const r = resolveRoute(cfg({ hasRootBio: true, rootBioId: 'g1', rootBioSlug: 'acme' }), '/');
    expect(r).toEqual({ kind: 'root-bio', galleryId: 'g1', slug: 'acme' });
  });

  it('root-redirect when no bio but redirect set', () => {
    const r = resolveRoute(cfg({ role: 'links', rootRedirectUrl: 'https://acme.co' }), '/');
    expect(r).toEqual({ kind: 'root-redirect', url: 'https://acme.co' });
  });

  it('root-bio beats root-redirect when both present', () => {
    const r = resolveRoute(
      cfg({ hasRootBio: true, rootBioId: 'g1', rootRedirectUrl: 'https://acme.co' }),
      '/'
    );
    expect(r).toEqual({ kind: 'root-bio', galleryId: 'g1', slug: '' });
  });

  it('404 at root when neither bio nor redirect', () => {
    expect(resolveRoute(cfg({ role: 'links' }), '/')).toEqual({ kind: 'not-found' });
  });
});

describe('resolveRoute — non-root path', () => {
  it('resolves a link on role=links', () => {
    expect(resolveRoute(cfg({ role: 'links' }), '/promo')).toEqual({ kind: 'link', slug: 'promo' });
  });

  it('resolves a link on role=both', () => {
    expect(resolveRoute(cfg({ role: 'both' }), '/promo')).toEqual({ kind: 'link', slug: 'promo' });
  });

  it('uses only the first segment for the slug', () => {
    expect(resolveRoute(cfg({ role: 'links' }), '/promo/extra/bits'))
      .toEqual({ kind: 'link', slug: 'promo' });
  });

  it('404 for a non-root path on a role=bio domain (no path-scoped bios in v1)', () => {
    expect(resolveRoute(cfg({ role: 'bio', hasRootBio: true, rootBioId: 'g1' }), '/promo'))
      .toEqual({ kind: 'not-found' });
  });
});
