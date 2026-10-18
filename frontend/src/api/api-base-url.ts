const developmentApiUrl =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_BASE_URL = import.meta.env.DEV
  ? developmentApiUrl
  : '/api';
