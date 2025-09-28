/**
 * AddressInput Component Tests
 *
 * Demonstrates comprehensive testing strategy for atomic components
 * in the modular property creation architecture.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddressInput } from '../atoms/form-fields/AddressInput'
import type { AddressInfo, ValidationState } from '../types'

describe('AddressInput', () => {
  const defaultProps = {
    value: {
      address: '',
      postalCode: '',
      city: '',
      country: 'Belgique'
    } as AddressInfo,
    onChange: jest.fn(),
    validation: {
      isValid: true,
      errors: {},
      warnings: {}
    } as ValidationState
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all address fields correctly', () => {
      render(<AddressInput {...defaultProps} />)

      expect(screen.getByLabelText(/adresse complète/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/code postal/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ville/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pays/i)).toBeInTheDocument()
    })

    it('displays required asterisk when required prop is true', () => {
      render(<AddressInput {...defaultProps} required />)

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('hides country selector when showCountrySelector is false', () => {
      render(<AddressInput {...defaultProps} showCountrySelector={false} />)

      expect(screen.queryByLabelText(/pays/i)).not.toBeInTheDocument()
    })

    it('renders with pre-filled values', () => {
      const value = {
        address: '123 Rue de la Paix',
        postalCode: '1000',
        city: 'Bruxelles',
        country: 'Belgique'
      }

      render(<AddressInput {...defaultProps} value={value} />)

      expect(screen.getByDisplayValue('123 Rue de la Paix')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bruxelles')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onChange when address field is modified', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      await user.type(addressInput, '123 Main Street')

      await waitFor(() => {
        expect(onChange).toHaveBeenLastCalledWith({
          address: '123 Main Street',
          postalCode: '',
          city: '',
          country: 'Belgique'
        })
      })
    })

    it('calls onChange when postal code is modified', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} />)

      const postalCodeInput = screen.getByLabelText(/code postal/i)
      await user.type(postalCodeInput, '1050')

      await waitFor(() => {
        expect(onChange).toHaveBeenLastCalledWith({
          address: '',
          postalCode: '1050',
          city: '',
          country: 'Belgique'
        })
      })
    })

    it('calls onChange when city is modified', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} />)

      const cityInput = screen.getByLabelText(/ville/i)
      await user.type(cityInput, 'Ixelles')

      await waitFor(() => {
        expect(onChange).toHaveBeenLastCalledWith({
          address: '',
          postalCode: '',
          city: 'Ixelles',
          country: 'Belgique'
        })
      })
    })

    it('calls onChange when country is changed', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} />)

      const countrySelect = screen.getByRole('combobox')
      await user.click(countrySelect)

      const franceOption = screen.getByText('France')
      await user.click(franceOption)

      await waitFor(() => {
        expect(onChange).toHaveBeenLastCalledWith({
          address: '',
          postalCode: '',
          city: '',
          country: 'France'
        })
      })
    })
  })

  describe('Validation States', () => {
    it('displays error states correctly', () => {
      const validation = {
        isValid: false,
        errors: {
          address: 'L\'adresse est requise',
          postalCode: 'Code postal invalide'
        },
        warnings: {}
      }

      render(<AddressInput {...defaultProps} validation={validation} />)

      expect(screen.getByText('L\'adresse est requise')).toBeInTheDocument()
      expect(screen.getByText('Code postal invalide')).toBeInTheDocument()
    })

    it('displays warning states correctly', () => {
      const validation = {
        isValid: true,
        errors: {},
        warnings: {
          general: 'Veuillez vérifier l\'adresse'
        }
      }

      render(<AddressInput {...defaultProps} validation={validation} />)

      expect(screen.getByText('Veuillez vérifier l\'adresse')).toBeInTheDocument()
    })

    it('applies error styling to input fields', () => {
      const validation = {
        isValid: false,
        errors: {
          address: 'Erreur adresse'
        },
        warnings: {}
      }

      render(<AddressInput {...defaultProps} validation={validation} />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      expect(addressInput).toHaveClass('border-red-500')
    })
  })

  describe('Disabled State', () => {
    it('disables all inputs when disabled prop is true', () => {
      render(<AddressInput {...defaultProps} disabled />)

      expect(screen.getByLabelText(/adresse complète/i)).toBeDisabled()
      expect(screen.getByLabelText(/code postal/i)).toBeDisabled()
      expect(screen.getByLabelText(/ville/i)).toBeDisabled()
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('does not call onChange when disabled', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} disabled />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      await user.type(addressInput, 'Should not work')

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AddressInput {...defaultProps} required />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      expect(addressInput).toHaveAttribute('id', 'address')

      const postalCodeInput = screen.getByLabelText(/code postal/i)
      expect(postalCodeInput).toHaveAttribute('id', 'postalCode')

      const cityInput = screen.getByLabelText(/ville/i)
      expect(cityInput).toHaveAttribute('id', 'city')

      const countrySelect = screen.getByLabelText(/pays/i)
      expect(countrySelect).toHaveAttribute('id', 'country')
    })

    it('associates error messages with inputs', () => {
      const validation = {
        isValid: false,
        errors: {
          address: 'Adresse requise'
        },
        warnings: {}
      }

      render(<AddressInput {...defaultProps} validation={validation} />)

      const errorMessage = screen.getByText('Adresse requise')
      expect(errorMessage).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()

      render(<AddressInput {...defaultProps} />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      await user.click(addressInput)
      expect(addressInput).toHaveFocus()

      await user.tab()
      const postalCodeInput = screen.getByLabelText(/code postal/i)
      expect(postalCodeInput).toHaveFocus()

      await user.tab()
      const cityInput = screen.getByLabelText(/ville/i)
      expect(cityInput).toHaveFocus()

      await user.tab()
      const countrySelect = screen.getByRole('combobox')
      expect(countrySelect).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('handles null/undefined values gracefully', () => {
      const value = {
        address: null as any,
        postalCode: undefined as any,
        city: '',
        country: 'Belgique'
      }

      expect(() => {
        render(<AddressInput {...defaultProps} value={value} />)
      }).not.toThrow()
    })

    it('handles missing validation object', () => {
      expect(() => {
        render(<AddressInput {...defaultProps} validation={undefined as any} />)
      }).not.toThrow()
    })

    it('handles long text inputs without breaking layout', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<AddressInput {...defaultProps} onChange={onChange} />)

      const addressInput = screen.getByLabelText(/adresse complète/i)
      const longAddress = 'A'.repeat(500)

      await user.type(addressInput, longAddress)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            address: longAddress
          })
        )
      })
    })
  })
})

/**
 * `★ Insight ─────────────────────────────────────`
 * Tests Strategy pour l'architecture modulaire :
 *
 * 1. **Unit Tests** : Chaque composant atomique testé isolément
 * 2. **Integration Tests** : Composants composés testés avec leurs dépendances
 * 3. **E2E Tests** : Flows complets building/lot creation
 * 4. **Visual Regression Tests** : Screenshots comparaison
 * 5. **Performance Tests** : Bundle size, render time
 * 6. **Accessibility Tests** : WCAG compliance automatisé
 *
 * COVERAGE TARGET: 90%+ pour tous les composants atomiques
 * `─────────────────────────────────────────────────`
 */