const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const environment = {
  apiBaseUrl: stripTrailingSlash(
    process.env.API_BASE_URL ?? 'https://truck-life-simulator-api.onrender.com',
  ),
  frontendBaseUrl: stripTrailingSlash(
    process.env.FRONTEND_BASE_URL ?? 'https://luislipinski.github.io/truck-life-simulator',
  ),
} as const;
