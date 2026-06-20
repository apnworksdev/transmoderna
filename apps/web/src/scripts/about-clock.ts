let clockInterval: number | null = null;

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function destroyAboutClock(): void {
  if (clockInterval != null) {
    window.clearInterval(clockInterval);
    clockInterval = null;
  }
}

export function initAboutClock(): void {
  destroyAboutClock();

  const clock = document.querySelector<HTMLElement>('[data-about-clock]');
  if (!clock) {
    return;
  }

  const update = () => {
    const now = new Date();
    clock.textContent = formatClockTime(now);
    clock.setAttribute('datetime', now.toISOString());
  };

  update();
  clockInterval = window.setInterval(update, 1000);
}
