declare module 'astro:env/client' {
	export const PUBLIC_KEYSTATIC_GITHUB_APP_SLUG: string | undefined;	
}declare module 'astro:env/server' {
	export const KEYSTATIC_GITHUB_CLIENT_ID: string | undefined;	
	export const KEYSTATIC_GITHUB_CLIENT_SECRET: string | undefined;	
	export const KEYSTATIC_SECRET: string | undefined;	
}