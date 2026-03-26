/** PEB/EPC energy rating color classes (Belgian standard color scheme) */
export function getPebColorClasses(rating: string): { bg: string; text: string; border: string } {
  switch (rating) {
    case 'A+': case 'A': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    case 'B': return { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' }
    case 'C': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
    case 'D': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
    case 'E': case 'F': case 'G': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
}
