import { itemHref, type ReadingAnchor } from './routes.js';
import type { VersionedAnchorResult } from './row-split-anchor.js';

type Unresolved = Exclude<VersionedAnchorResult, { status: 'resolved' }>;

/** Present an explicit choice without pretending a tentative mapping is an
 * approved one. Only an interactive button may open a provisional target. */
export function showRowVersionNotice(main: HTMLElement, item: string, anchor: ReadingAnchor,
    result: Unresolved, openProvisional: (target: ReadingAnchor) => void): void {
  const content = main.querySelector<HTMLElement>('.content');
  if (!content) return;
  content.querySelector('[data-row-version-warning]')?.remove();
  const box = document.createElement('aside');
  box.className = 'row-version-warning'; box.dataset.rowVersionWarning = result.status;
  box.setAttribute('role', 'alert');
  const title = document.createElement('strong'); title.textContent = 'موقعیت این پیوند نیاز به بررسی دارد';
  const message = document.createElement('p');
  switch (result.status) {
    case 'ambiguous': message.textContent = 'این پیوند نسخه ندارد؛ گزینه‌های موجود را بررسی کنید.'; break;
    case 'unknown-version': message.textContent = 'نسخهٔ این پیوند شناخته‌شده نیست؛ مقصد آن به‌طور خودکار انتخاب نشد.'; break;
    case 'unavailable': message.textContent = 'این موقعیت، زبان یا نگاشت در نسخهٔ کنونی در دسترس نیست؛ مقصدی حدس زده نشد.'; break;
    case 'invalid-data': message.textContent = 'دادهٔ نسخهٔ پیوند قابل تأیید نیست؛ مقصدی حدس زده نشد.'; break;
    case 'provisional': message.textContent = 'این مقصد فقط یک پیشنهاد فنی بازبینی‌نشده است و درستی معنایی آن تأیید نشده است.'; break;
  }
  box.append(title, message);
  if (result.status === 'provisional') {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'row-version-accept';
    button.textContent = 'مشاهدهٔ مقصد پیشنهادی';
    button.addEventListener('click', () => openProvisional(result.anchor)); box.append(button);
  }
  const choices = result.choices.filter(choice => result.status !== 'provisional' || !choice.snapshots.includes(anchor.version ?? ''));
  if (choices.length) {
    const list = document.createElement('ul');
    for (const choice of choices) {
      const li = document.createElement('li');
      const label = choice.meaning === 'current' ? 'نسخهٔ کنونی' : 'نسخهٔ پیشین';
      const description = `${label}${choice.provisional ? ' (پیشنهادی، بازبینی‌نشده)' : ''}`;
      if (choice.target) {
        const link = document.createElement('a'); link.href = itemHref(item, { ...anchor, version: choice.version });
        link.append(document.createTextNode(description)); li.append(link);
      } else {
        const unavailable = document.createElement('span'); unavailable.textContent = `${description} — این موقعیت در دسترس نیست`;
        li.append(unavailable);
      }
      const version = document.createElement('code'); version.dir = 'ltr'; version.textContent = ` ${choice.version.slice(0, 12)}…`;
      version.title = choice.version; li.append(version); list.append(li);
    }
    box.append(list);
  }
  content.prepend(box);
}
