// Keep the notices accessible in the built distribution without displaying
// license text in the reader/settings UI. Vite emits local URLs for these files.
import amiri from './fonts/licenses/Amiri-OFL.txt?url';
import noto from './fonts/licenses/NotoNaskhArabic-OFL.txt?url';
import scheherazade from './fonts/licenses/ScheherazadeNew-OFL.txt?url';
import vazirmatn from './fonts/licenses/Vazirmatn-OFL.txt?url';
import lucide from './icons/LICENSE-lucide.txt?url';

export function attachLegalNotices(): void {
  for (const [label, href] of Object.entries({ amiri, noto, scheherazade, vazirmatn, lucide })) {
    const link = document.createElement('link');
    link.rel = 'license'; link.href = href; link.title = `${label} license`;
    document.head.append(link);
  }
}
