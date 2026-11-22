import { publicPolicy } from '../public-policy';

export function validateScheduledPickup(value: string): string | null {
  if (!value) {
    return 'Choose a pickup date and time.';
  }

  const pickup = new Date(value);
  if (Number.isNaN(pickup.getTime())) {
    return 'Enter a valid pickup date and time.';
  }

  const now = Date.now();
  const minimum = now + publicPolicy.scheduledMinimumHours * 60 * 60 * 1000;
  const maximum = now + publicPolicy.scheduledMaximumDays * 24 * 60 * 60 * 1000;

  if (pickup.getTime() < minimum) {
    return `Scheduled pickup must be at least ${publicPolicy.scheduledMinimumHours} hours from now.`;
  }
  if (pickup.getTime() > maximum) {
    return `Scheduled pickup cannot be more than ${publicPolicy.scheduledMaximumDays} days away.`;
  }
  return null;
}

export function getBroadcastWindow(pickupAt: string): { startAt: string; endAt: string } {
  const pickup = new Date(pickupAt).getTime();
  const start = Math.max(
    Date.now(),
    pickup - publicPolicy.broadcastStartsHoursBeforePickup * 60 * 60 * 1000
  );
  const end = pickup - publicPolicy.broadcastEndsHoursBeforePickup * 60 * 60 * 1000;
  return {
    startAt: new Date(start).toISOString(),
    endAt: new Date(end).toISOString(),
  };
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not scheduled';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
