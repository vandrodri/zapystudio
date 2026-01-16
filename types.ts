
export enum AppView {
  EDITOR = 'EDITOR',
  LOGO_GEN = 'LOGO_GEN'
}

export enum SocialPreset {
  INSTAGRAM_SQUARE = 'INSTAGRAM_SQUARE',
  INSTAGRAM_STORY = 'INSTAGRAM_STORY',
  FACEBOOK_POST = 'FACEBOOK_POST',
  GBP_PHOTO = 'GBP_PHOTO',
  CUSTOM = 'CUSTOM'
}

export interface Layer {
  id: string;
  type: 'image' | 'text' | 'logo';
  content: string; // Base64 para imagem/logo, string para texto
  x: number;
  y: number;
  rotation: number;
  fontSize?: number;
  color?: string;
  bgColor?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
  scale?: number;
  textBorderWidth?: number;
  textBorderColor?: string;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const PRESETS: Record<SocialPreset, CanvasDimensions> = {
  [SocialPreset.INSTAGRAM_SQUARE]: { width: 1080, height: 1080 },
  [SocialPreset.INSTAGRAM_STORY]: { width: 1080, height: 1920 },
  [SocialPreset.FACEBOOK_POST]: { width: 1200, height: 630 },
  [SocialPreset.GBP_PHOTO]: { width: 1200, height: 900 },
  [SocialPreset.CUSTOM]: { width: 1080, height: 1080 },
};

export const FONTS = [
  'Poppins',
  'Montserrat',
  'Roboto',
  'Playfair Display',
  'Arial',
  'Verdana',
  'Georgia'
];
