// Converts a plain username (e.g. 'saidlaziz' or 'admin_1') into a valid Firebase Auth email format
export const formatAuthLogin = (loginInput: string): string => {
  const clean = loginInput.trim().toLowerCase();
  if (clean === 'admin' || clean === 'director') {
    return 'admin@openworld.academy';
  }
  return clean.includes('@') ? clean : `${clean}@openworld.academy`;
};
