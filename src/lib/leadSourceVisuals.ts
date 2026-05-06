// Single source of truth for "what colour represents this lead source".
// Returns a Tailwind background-colour class for the source dot used on
// LeadCard, and a short human label for tooltips / aria.
//
// Sources beyond the built-in defaults fall through to a brand-tinted
// neutral so org-customised sources still get a coloured dot rather
// than a missing one.

export interface SourceVisual {
  dotClass: string  // tailwind bg- class for the round indicator
  label:    string
}

export function getSourceVisual(source: string | null | undefined): SourceVisual {
  switch (source) {
    case 'meta':
    case 'facebook':
      return { dotClass: 'bg-blue-500',    label: 'Facebook Ads' }
    case 'instagram':
      return { dotClass: 'bg-pink-500',    label: 'Instagram Ads' }
    case 'instagram_dm':
      return { dotClass: 'bg-fuchsia-500', label: 'Instagram DM' }
    case 'instagram_comment':
      return { dotClass: 'bg-purple-500',  label: 'Instagram Comment' }
    case 'instagram_mention':
      return { dotClass: 'bg-amber-500',   label: 'Instagram Mention' }
    case 'offline':
      return { dotClass: 'bg-slate-400',   label: 'Offline' }
    case 'referral':
      return { dotClass: 'bg-emerald-500', label: 'Referral' }
    case 'bulk':
      return { dotClass: 'bg-orange-400',  label: 'Bulk Upload' }
    case 'manual':
      return { dotClass: 'bg-teal-500',    label: 'Manual' }
    default:
      return { dotClass: 'bg-brand-400',   label: source ?? 'Unknown' }
  }
}
