/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 *
 * NOTA (20/09): este archivo ya venía con el proyecto (plantilla de Expo) y lo
 * usan algunos componentes de ejemplo que no tocamos (themed-text, app-tabs,
 * etc.). Lo dejamos como estaba y le agregamos, abajo, nuestra propia paleta
 * (COLORS) para las pantallas que sí construimos.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ---------------------------------------------------------------------------
// Paleta propia de la app: "oscuro y moderno, tipo bar premium", tomada de
// fotos reales del local (cartel de brasa + luces cálidas). Este es el color
// que usan las pantallas que construimos (index, catálogo, confirmación,
// empleado) — es el único bloque que hay que tocar para que se actualicen.
// ---------------------------------------------------------------------------
export const COLORS = {
  background: '#0B0B0D', // fondo principal, negro grafito
  surface: '#18181B', // tarjetas y superficies elevadas
  surfaceElevated: 'rgba(24, 24, 27, 0.85)', // paneles semi-transparentes sobre la cámara
  surfaceBorder: '#2A2A2E',
  accent: '#E2672E', // naranja brasa, tomado del cartel iluminado real de Ogham
  accentPressed: '#C14F1E',
  // Acento secundario (opcional): el celeste/turquesa del cartel de adentro del
  // bar. No se usa todavía en ninguna pantalla, queda disponible por si en
  // algún momento se quiere un segundo color de marca (ej. algún detalle chico).
  accentSecundario: '#3E7E8C',
  textPrimary: '#F5F1E8', // blanco cálido
  textSecondary: '#B9B6AE',
  textMuted: 'rgba(245, 241, 232, 0.55)',
  onAccent: '#171310', // texto oscuro sobre botones de acento (mejor contraste que blanco)
};
