import { persisted } from './persisted';

export const headerOpen = persisted<boolean>('header-open', true);
export const darkMode = persisted<boolean>('dark-mode', true);
export const selectedTheme = persisted<string>('theme', 'dark');
