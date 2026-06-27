export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:image')) return url;
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
  return `${baseUrl}/${url.startsWith('/') ? url.substring(1) : url}`;
};
