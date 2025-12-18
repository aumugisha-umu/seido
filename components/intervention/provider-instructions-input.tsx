"use client"

import { User, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Provider {
  id: string
  name: string
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string
  speciality?: string
}

interface ProviderInstructionsInputProps {
  providers: Provider[]
  instructions: Record<string, string>
  onInstructionsChange: (providerId: string, instructions: string) => void
  className?: string
}

/**
 * ProviderInstructionsInput - Per-provider instructions input for separate mode
 *
 * Allows managers to provide specific instructions to each provider
 * when using "separate" assignment mode.
 */
export function ProviderInstructionsInput({
  providers,
  instructions,
  onInstructionsChange,
  className
}: ProviderInstructionsInputProps) {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(providers.map(p => p.id))
  )

  const toggleExpanded = (providerId: string) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(providerId)) {
        newSet.delete(providerId)
      } else {
        newSet.add(providerId)
      }
      return newSet
    })
  }

  const getProviderInitials = (provider: Provider) => {
    if (provider.first_name && provider.last_name) {
      return `${provider.first_name[0]}${provider.last_name[0]}`.toUpperCase()
    }
    return provider.name?.substring(0, 2).toUpperCase() || '??'
  }

  const getProviderDisplayName = (provider: Provider) => {
    if (provider.first_name && provider.last_name) {
      return `${provider.first_name} ${provider.last_name}`
    }
    return provider.name || 'Prestataire'
  }

  if (providers.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          Instructions spécifiques par prestataire
        </h3>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => {
          const isExpanded = expandedProviders.has(provider.id)
          const hasInstructions = !!instructions[provider.id]?.trim()

          return (
            <div
              key={provider.id}
              className={cn(
                "border rounded-lg transition-all overflow-hidden",
                hasInstructions ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
              )}
            >
              {/* Provider Header - Clickable */}
              <button
                type="button"
                onClick={() => toggleExpanded(provider.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors",
                  isExpanded && "bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={provider.avatar_url} alt={getProviderDisplayName(provider)} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                      {getProviderInitials(provider)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {getProviderDisplayName(provider)}
                    </p>
                    {provider.speciality && (
                      <p className="text-xs text-slate-500">{provider.speciality}</p>
                    )}
                  </div>

                  {hasInstructions && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Instructions ajoutées
                    </span>
                  )}
                </div>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {/* Expandable Instructions Input */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <Textarea
                    placeholder={`Instructions pour ${getProviderDisplayName(provider)}...`}
                    value={instructions[provider.id] || ''}
                    onChange={(e) => onInstructionsChange(provider.id, e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Seul ce prestataire verra ces instructions
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
