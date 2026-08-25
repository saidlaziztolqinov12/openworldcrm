export const getLocalDate = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  } catch {
    return new Date().toISOString().substring(0, 10);
  }
};

export const getLocalMonth = (): string => {
  return getLocalDate().substring(0, 7);
};
