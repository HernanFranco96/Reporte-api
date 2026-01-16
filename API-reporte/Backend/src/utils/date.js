// utils/date.js
export const getCurrentWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, ...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // si es domingo, retrocede 6 días
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { from: monday, to: sunday };
};
