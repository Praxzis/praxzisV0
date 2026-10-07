/**
 * Material hierarchy:
 *   paper → ink → graphite → navy (Praxzis) → turquoise (discovery) → shadow → binding
 *
 * Night is its own notebook (deep charcoal-navy paper, warm off-white ink),
 * not an inversion of the day palette.
 */

export type PaperTone = 'ivory' | 'cream' | 'bright' | 'kraft' | 'sticky' | 'mint';

export type Materials = {
  scheme: 'day' | 'night';
  desk: string;
  deskDeep: string;
  paper: Record<PaperTone, string>;
  /** Slightly darker / lighter versions of a page, used for tonal drift. */
  paperShade: string;
  paperGlow: string;
  pageEdge: string;
  ink: string;
  inkSoft: string;
  graphite: string;
  graphiteSoft: string;
  navy: string;
  turquoise: string;
  turquoiseInk: string;
  marker: string;
  rule: string;
  margin: string;
  shadow: string;
  shadowStrength: number;
  grainOpacity: number;
  binding: string;
  bindingHighlight: string;
  tape: string;
  onNavy: string;
  focus: string;
  cloth: readonly string[];
};

export const day: Materials = {
  scheme: 'day',
  desk: '#DED2BD',
  deskDeep: '#CDBEA4',
  paper: {
    ivory: '#F6F0E3',
    cream: '#F1E7D3',
    bright: '#FAF6EC',
    kraft: '#D8C3A0',
    sticky: '#F2E6B8',
    mint: '#DDE9E2',
  },
  paperShade: '#B89F7A',
  paperGlow: '#FFFDF6',
  pageEdge: '#E4D8C2',
  ink: '#22263A',
  inkSoft: 'rgba(34,38,58,0.78)',
  graphite: '#6A645B',
  graphiteSoft: '#97907F',
  navy: '#1E2B50',
  turquoise: '#2A8A8A',
  turquoiseInk: '#21797A',
  marker: 'rgba(78,182,176,0.26)',
  rule: 'rgba(30,43,80,0.085)',
  margin: 'rgba(42,138,138,0.22)',
  shadow: '#3B2D17',
  shadowStrength: 1,
  grainOpacity: 0.16,
  binding: '#3C3F48',
  bindingHighlight: 'rgba(255,255,255,0.35)',
  tape: 'rgba(236,226,196,0.72)',
  onNavy: '#F6F0E3',
  focus: '#2A8A8A',
  cloth: ['#7A3E35', '#3F5B4B', '#25335C', '#A8843F', '#525B68', '#5E4256', '#8C6A4F', '#2F5E63'],
};

export const night: Materials = {
  scheme: 'night',
  desk: '#0D1119',
  deskDeep: '#080B11',
  paper: {
    ivory: '#1B2131',
    cream: '#1E2434',
    bright: '#222939',
    kraft: '#2A2A2C',
    sticky: '#2B2A24',
    mint: '#1A2A2D',
  },
  paperShade: '#05070C',
  paperGlow: '#2C3448',
  pageEdge: '#151A27',
  ink: '#ECE4D3',
  inkSoft: 'rgba(236,228,211,0.8)',
  graphite: '#A29B8D',
  graphiteSoft: '#7A7569',
  navy: '#D5DCEE',
  turquoise: '#63C2BA',
  turquoiseInk: '#6CC9C1',
  marker: 'rgba(99,194,186,0.2)',
  rule: 'rgba(236,228,211,0.06)',
  margin: 'rgba(99,194,186,0.16)',
  shadow: '#000000',
  shadowStrength: 1.6,
  grainOpacity: 0.12,
  binding: '#5A5F6C',
  bindingHighlight: 'rgba(255,255,255,0.18)',
  tape: 'rgba(120,118,104,0.45)',
  onNavy: '#141927',
  focus: '#63C2BA',
  cloth: ['#5C3330', '#334A3F', '#2C3A63', '#7C6534', '#454C58', '#4A3646', '#6A5240', '#2A4F53'],
};

export const fonts = {
  hand: 'Caveat_500Medium',
  handRegular: 'Caveat_400Regular',
  handStrong: 'Caveat_600SemiBold',
  handBold: 'Caveat_700Bold',
  serif: 'EBGaramond_400Regular',
  serifItalic: 'EBGaramond_400Regular_Italic',
  serifMedium: 'EBGaramond_500Medium',
  serifStrong: 'EBGaramond_600SemiBold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiStrong: 'Inter_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40 } as const;

/** Minimum touch target in points. */
export const TOUCH = 44;
