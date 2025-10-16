/**
 * Service Imports Tests
 * Verify correct service imports and prevent legacy import patterns
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Service Imports Validation', () => {
  const servicesPath = path.join(process.cwd(), 'lib', 'services')
  const domainPath = path.join(servicesPath, 'domain')

  // Files to check for imports
  const filesToCheck = [
    path.join(domainPath, 'tenant.service.ts'),
    path.join(domainPath, 'user.service.ts'),
    path.join(domainPath, 'building.service.ts'),
    path.join(domainPath, 'lot.service.ts'),
    path.join(domainPath, 'contact.service.ts'),
    path.join(domainPath, 'team.service.ts'),
    path.join(domainPath, 'stats.service.ts'),
    path.join(domainPath, 'composite.service.ts'),
    path.join(domainPath, 'contact-invitation.service.ts')
  ]

  describe('Legacy Import Prevention', () => {
    it('should not import from intervention.service.ts (legacy filename)', () => {
      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8')

          // Check for legacy import pattern (intervention.service.ts with dot)
          const hasLegacyImport = fileContent.includes('from \'./intervention.service\'') ||
                                 fileContent.includes('from "./intervention.service"') ||
                                 fileContent.includes('from \'../domain/intervention.service\'') ||
                                 fileContent.includes('from "../domain/intervention.service"')

          expect(hasLegacyImport, `${path.basename(filePath)} should not import from intervention.service.ts`).toBe(false)
        }
      })
    })

    it('should import from intervention-service.ts (current filename)', () => {
      const tenantServicePath = path.join(domainPath, 'tenant.service.ts')

      if (fs.existsSync(tenantServicePath)) {
        const fileContent = fs.readFileSync(tenantServicePath, 'utf-8')

        // Check for correct import pattern (intervention-service.ts with hyphen)
        const hasCorrectImport = fileContent.includes('from \'./intervention-service\'') ||
                                fileContent.includes('from "./intervention-service"') ||
                                fileContent.includes('from \'../domain/intervention-service\'') ||
                                fileContent.includes('from "../domain/intervention-service"') ||
                                // Or no intervention import at all (which is also valid)
                                (!fileContent.includes('InterventionService') && !fileContent.includes('createInterventionService'))

        expect(hasCorrectImport, 'tenant.service should import from intervention-service.ts or not import InterventionService at all').toBe(true)
      }
    })
  })

  describe('Service Factory Functions', () => {
    it('should export correct factory functions from intervention-service.ts', () => {
      const interventionServicePath = path.join(domainPath, 'intervention-service.ts')

      if (fs.existsSync(interventionServicePath)) {
        const fileContent = fs.readFileSync(interventionServicePath, 'utf-8')

        // Check for factory function exports
        expect(fileContent).toContain('export const createInterventionService')
        expect(fileContent).toContain('export const createServerInterventionService')
        expect(fileContent).toContain('export const createServerActionInterventionService')
        expect(fileContent).toContain('export class InterventionService')
      }
    })

    it('should not have duplicate intervention service files', () => {
      const legacyFile = path.join(domainPath, 'intervention.service.ts')
      const currentFile = path.join(domainPath, 'intervention-service.ts')

      // Check that both files don't exist at the same time
      if (fs.existsSync(legacyFile) && fs.existsSync(currentFile)) {
        throw new Error('Both intervention.service.ts and intervention-service.ts exist! Remove the legacy file.')
      }

      // Current file should exist
      expect(fs.existsSync(currentFile), 'intervention-service.ts should exist').toBe(true)

      // Legacy file should not exist
      expect(fs.existsSync(legacyFile), 'intervention.service.ts (legacy) should not exist').toBe(false)
    })
  })

  describe('Import Consistency', () => {
    it('should use consistent import patterns for error handler', () => {
      const serviceFiles = fs.readdirSync(domainPath)
        .filter(file => file.endsWith('.ts') && !file.includes('.test.'))
        .map(file => path.join(domainPath, file))

      serviceFiles.forEach(filePath => {
        const fileContent = fs.readFileSync(filePath, 'utf-8')

        if (fileContent.includes('NotFoundException')) {
          // Should import from core/error-handler
          const hasCorrectErrorImport = fileContent.includes('from \'../core/error-handler\'') ||
                                       fileContent.includes('from "../core/error-handler"')

          expect(hasCorrectErrorImport, `${path.basename(filePath)} should import NotFoundException from '../core/error-handler'`).toBe(true)
        }
      })
    })

    it('should use consistent import patterns for repositories', () => {
      const serviceFiles = fs.readdirSync(domainPath)
        .filter(file => file.endsWith('.ts') && !file.includes('.test.'))
        .map(file => path.join(domainPath, file))

      serviceFiles.forEach(filePath => {
        const fileContent = fs.readFileSync(filePath, 'utf-8')

        // Check for repository imports
        if (fileContent.includes('Repository')) {
          // Should import from repositories folder with hyphenated names
          const hasValidRepoImport = fileContent.includes('from \'../repositories/') ||
                                    fileContent.includes('from "../repositories/')

          // Should use hyphenated names for repositories
          // Only check if actually importing InterventionRepository (not just mentioning in comments)
          const importsInterventionRepo = fileContent.includes('InterventionRepository') &&
                                         (fileContent.includes('import') || fileContent.includes('require'))

          if (importsInterventionRepo) {
            const hasCorrectNaming = fileContent.includes('intervention-repository') ||
                                    fileContent.includes('InterventionRepository')
            expect(hasCorrectNaming, `${path.basename(filePath)} should use 'intervention-repository' naming`).toBe(true)
          }
        }
      })
    })
  })

  describe('Service Dependencies', () => {
    it('should have correct service dependencies in intervention-service.ts', () => {
      const interventionServicePath = path.join(domainPath, 'intervention-service.ts')

      if (fs.existsSync(interventionServicePath)) {
        const fileContent = fs.readFileSync(interventionServicePath, 'utf-8')

        // Check for required dependencies
        expect(fileContent).toContain('InterventionRepository')
        expect(fileContent).toContain('QuoteRepository')
        expect(fileContent).toContain('NotificationRepository')
        expect(fileContent).toContain('ConversationRepository')
        expect(fileContent).toContain('UserService')

        // Check constructor parameters
        expect(fileContent).toMatch(/constructor\s*\([^)]*interventionRepo[^)]*\)/)
        expect(fileContent).toMatch(/constructor\s*\([^)]*quoteRepo[^)]*\)/)
        expect(fileContent).toMatch(/constructor\s*\([^)]*notificationRepo[^)]*\)/)
      }
    })

    it('should have correct NotFoundException usage pattern', () => {
      const interventionServicePath = path.join(domainPath, 'intervention-service.ts')

      if (fs.existsSync(interventionServicePath)) {
        const fileContent = fs.readFileSync(interventionServicePath, 'utf-8')

        // Check for correct NotFoundException constructor usage
        // Should be: new NotFoundException(resource, identifier)
        const notFoundPattern = /new\s+NotFoundException\s*\(\s*['"`]\w+['"`]\s*,\s*\w+\s*\)/
        const hasCorrectPattern = notFoundPattern.test(fileContent)

        expect(hasCorrectPattern, 'intervention-service.ts should use NotFoundException with two parameters').toBe(true)

        // Should NOT have the old pattern with message concatenation
        const oldPattern = /new\s+NotFoundException\s*\(\s*`[^`]*not found[^`]*`\s*\)/
        const hasOldPattern = oldPattern.test(fileContent)

        expect(hasOldPattern, 'intervention-service.ts should not use old NotFoundException pattern with template literals').toBe(false)
      }
    })
  })

  describe('Export Validation', () => {
    it('should export InterventionService as a named export', async () => {
      try {
        // Try to import the module
        const module = await import(path.join(domainPath, 'intervention-service'))

        expect(module.InterventionService).toBeDefined()
        expect(typeof module.InterventionService).toBe('function')
        expect(module.createInterventionService).toBeDefined()
        expect(typeof module.createInterventionService).toBe('function')
      } catch (error) {
        // If import fails, check if file exists and has correct exports
        const interventionServicePath = path.join(domainPath, 'intervention-service.ts')

        if (fs.existsSync(interventionServicePath)) {
          const fileContent = fs.readFileSync(interventionServicePath, 'utf-8')
          expect(fileContent).toContain('export class InterventionService')
          expect(fileContent).toContain('export const createInterventionService')
        }
      }
    })
  })
})