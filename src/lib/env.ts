export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
export const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
export const googleBooksKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY ?? '';
export { aiKey, aiModel, hasAi } from './ai';

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);
export const hasGoogleBooks = Boolean(googleBooksKey);
