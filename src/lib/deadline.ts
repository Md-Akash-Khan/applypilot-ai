import { addDays, endOfDay, startOfDay } from "date-fns";

export function isDeadlineExpired(deadline?: Date | null, now = new Date()) {
  return Boolean(deadline && endOfDay(deadline).getTime() < now.getTime());
}

export function isDeadlineSoon(deadline?: Date | null, days = 5, now = new Date()) {
  if (!deadline || isDeadlineExpired(deadline, now)) return false;
  return deadline.getTime() <= endOfDay(addDays(now, days)).getTime();
}

export function todayBoundary(now = new Date()) {
  return startOfDay(now);
}

