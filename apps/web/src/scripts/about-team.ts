const ACTIVE_CLASS = 'is-active';
const INIT_ATTR = 'data-about-team-init';

type MemberView = 'img' | 'info';

function getDefaultView(member: HTMLDetailsElement): MemberView {
  if (member.querySelector('[data-about-member-figure]')) {
    return 'img';
  }
  return 'info';
}

function setMemberView(member: HTMLDetailsElement, view: MemberView): void {
  const figure = member.querySelector<HTMLElement>('[data-about-member-figure]');
  const info = member.querySelector<HTMLElement>('[data-about-member-info]');
  const imgBtn = member.querySelector<HTMLButtonElement>('[data-about-view="img"]');
  const infoBtn = member.querySelector<HTMLButtonElement>('[data-about-view="info"]');

  const showInfo = view === 'info' && info != null;

  if (figure) {
    figure.hidden = showInfo;
  }

  if (info) {
    info.hidden = !showInfo;
  }

  if (imgBtn) {
    imgBtn.classList.toggle(ACTIVE_CLASS, !showInfo);
    imgBtn.setAttribute('aria-pressed', String(!showInfo));
  }

  if (infoBtn) {
    infoBtn.classList.toggle(ACTIVE_CLASS, showInfo);
    infoBtn.setAttribute('aria-pressed', String(showInfo));
  }
}

export function destroyAboutTeam(root: ParentNode = document): void {
  root.querySelector<HTMLElement>('[data-about-team]')?.removeAttribute(INIT_ATTR);
}

export function initAboutTeam(root: ParentNode = document): void {
  const teamRoot = root.querySelector<HTMLElement>('[data-about-team]');
  if (!teamRoot || teamRoot.hasAttribute(INIT_ATTR)) {
    return;
  }

  teamRoot.setAttribute(INIT_ATTR, 'true');

  const items = teamRoot.querySelectorAll<HTMLDetailsElement>('[data-about-member]');

  for (const item of items) {
    const summary = item.querySelector('summary');
    if (!summary) {
      continue;
    }

    if (item.open) {
      setMemberView(item, getDefaultView(item));
    }

    summary.addEventListener(
      'click',
      () => {
        if (item.open) {
          return;
        }

        for (const other of items) {
          if (other !== item && other.open) {
            other.open = false;
          }
        }
      },
      true
    );

    item.addEventListener('toggle', () => {
      if (!item.open) {
        return;
      }

      setMemberView(item, getDefaultView(item));
    });
  }

  teamRoot.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const viewBtn = target.closest<HTMLButtonElement>('[data-about-view]');
    if (!viewBtn) {
      return;
    }

    event.stopPropagation();

    const member = viewBtn.closest<HTMLDetailsElement>('[data-about-member]');
    const view = viewBtn.dataset.aboutView;

    if (member && (view === 'img' || view === 'info')) {
      setMemberView(member, view);
    }
  });
}
