import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getClearbitLogo(company: string): string {
  // Common Cambodia companies domain mapping for better logo resolution
  const domainMap: Record<string, string> = {
    'ABA Bank': 'ababank.com',
    'Grab': 'grab.com',
    'Prudential': 'prudential.com.kh',
    'Coca-Cola': 'cocacola.com',
    'Heineken': 'heineken.com',
    'DHL': 'dhl.com',
    'Nestle': 'nestle.com.kh',
    'Unilever': 'unilever.com',
    'Smart Axiata': 'smart.com.kh',
    'Cellcard': 'cellcard.com.kh',
    'Wing Bank': 'wingbank.com.kh',
    'Manulife': 'manulife.com.kh',
    'PPCBank': 'ppcbank.com.kh',
    'Soma Software': 'soma.com.kh',
    'Vattanac Bank': 'vattanacbank.com',
    'Nham24': 'nham24.com',
    'Sabay Digital': 'sabay.com.kh',
    'Chip Mong Bank': 'chipmongbank.com',
    'Sathapana Bank': 'sathapana.com.kh',
    'ACLEDA Bank': 'acledabank.com.kh',
    'J Trust Royal Bank': 'jtrustroyal.com',
    'Canadia Bank': 'canadiabank.com.kh',
    'Breadstack': 'breadstack.com',
  };

  const domain = domainMap[company] || `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  return `https://logo.clearbit.com/${domain}?size=200`;
}

/**
 * Resolves a company logo with a fallback hierarchy.
 * @param company The company name.
 * @param providedUrl An optional provided logo URL.
 * @param level The fallback level: 0 = Priority/Provided, 1 = Clearbit, 2 = Avatar.
 */
export function getCompanyLogo(company: string, providedUrl?: string | null, level: number = 0): string {
  // Level 0: Try Provided URL. Fallback to Clearbit if missing/invalid.
  if (level === 0) {
    const isUrlValid = providedUrl && 
                      providedUrl.startsWith('http') && 
                      providedUrl.length > 10 && 
                      !providedUrl.includes('placeholder') && 
                      !providedUrl.includes('broken');
    
    if (isUrlValid) {
      return providedUrl as string;
    }
    // If provided URL is invalid, we return the Level 1 choice (Clearbit)
    return getClearbitLogo(company);
  }

  // Level 1: Try Clearbit.
  if (level === 1) {
    return getClearbitLogo(company);
  }

  // Level 2 (or default): Fallback to Avatar.
  return getFallbackAvatar(company);
}

export function getFallbackAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;
}
