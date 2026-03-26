import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../../..')

// ---------------------------------------------------------------------------
// US-A02 + US-C02: Security headers in next.config.js
// ---------------------------------------------------------------------------
describe('next.config.js security headers', () => {
  const configSource = readFileSync(resolve(ROOT, 'next.config.js'), 'utf-8')

  it('includes Strict-Transport-Security header', () => {
    expect(configSource).toContain('Strict-Transport-Security')
    expect(configSource).toContain('max-age=63072000; includeSubDomains')
  })

  it('includes Permissions-Policy header', () => {
    expect(configSource).toContain('Permissions-Policy')
    expect(configSource).toContain('camera=()')
    expect(configSource).toContain('microphone=()')
    expect(configSource).toContain('geolocation=()')
    expect(configSource).toContain('browsing-topics=()')
  })

  it('includes Content-Security-Policy-Report-Only header (US-C02)', () => {
    expect(configSource).toContain('Content-Security-Policy-Report-Only')
  })

  it('report-only CSP points to /api/csp-report', () => {
    expect(configSource).toContain('report-uri /api/csp-report')
  })

  it('no-op webpack override has been removed (US-C05)', () => {
    // The no-op pattern was: webpack: (config) => { return config }
    // It should no longer be present
    expect(configSource).not.toMatch(/webpack:\s*\(config\)\s*=>\s*\{\s*return config\s*\}/)
  })
})

// ---------------------------------------------------------------------------
// US-C03: @vercel/analytics must be pinned (no "latest")
// ---------------------------------------------------------------------------
describe('package.json dependency hygiene', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))

  it('@vercel/analytics is pinned and not "latest"', () => {
    const version = pkg.dependencies['@vercel/analytics']
    expect(version).toBeDefined()
    expect(version).not.toBe('latest')
    // Should match semver range like ^1.5.0
    expect(version).toMatch(/^\^?\d+\.\d+\.\d+/)
  })

  // ---------------------------------------------------------------------------
  // US-C05: @radix-ui/react-toast removed, @types/* moved to devDependencies
  // ---------------------------------------------------------------------------
  it('@radix-ui/react-toast is not in dependencies', () => {
    expect(pkg.dependencies['@radix-ui/react-toast']).toBeUndefined()
  })

  it('@types/bcryptjs is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['@types/bcryptjs']).toBeUndefined()
    expect(pkg.devDependencies['@types/bcryptjs']).toBeDefined()
  })

  it('@types/mailparser is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['@types/mailparser']).toBeUndefined()
    expect(pkg.devDependencies['@types/mailparser']).toBeDefined()
  })

  it('@types/node-imap is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['@types/node-imap']).toBeUndefined()
    expect(pkg.devDependencies['@types/node-imap']).toBeDefined()
  })

  it('@types/nodemailer is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['@types/nodemailer']).toBeUndefined()
    expect(pkg.devDependencies['@types/nodemailer']).toBeDefined()
  })

  it('pino-pretty is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['pino-pretty']).toBeUndefined()
    expect(pkg.devDependencies['pino-pretty']).toBeDefined()
  })

  it('dotenv is in devDependencies, not dependencies', () => {
    expect(pkg.dependencies['dotenv']).toBeUndefined()
    expect(pkg.devDependencies['dotenv']).toBeDefined()
  })

  it('no dependency uses "latest" tag', () => {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }
    const latestEntries = Object.entries(allDeps).filter(([, v]) => v === 'latest')
    expect(latestEntries).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// US-C01: GitHub Actions CI file exists
// ---------------------------------------------------------------------------
describe('GitHub Actions CI pipeline', () => {
  it('.github/workflows/ci.yml exists', () => {
    const ciSource = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf-8')
    expect(ciSource).toContain('next lint')
  })

  it('CI runs on push to main and preview branches', () => {
    const ciSource = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf-8')
    expect(ciSource).toContain('main')
    expect(ciSource).toContain('preview')
  })
})
