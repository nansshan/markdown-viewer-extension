import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FILE = path.join(__dirname, '..', 'temp', 'edge-store-descriptions.json');
const CHROME_STORE_URL_PATTERN = /https:\/\/chromewebstore\.google\.com\/detail\/markdown-viewer\/jekhhoflgcfoikceikgeenibinpojaoi/g;
const INSTALL_LABELS = [
  'Install Now',
  '立即安装',
  '立即安裝',
  'Installer nu',
  'Installeer nu',
  'Asenna nyt',
  'Installer Maintenant',
  'Jetzt installieren',
  'अभी इंस्टॉल करें',
  'Instal Sekarang',
  'Installa subito',
  '今すぐインストール',
  '지금 설치',
  'Installige kohe',
  'Installer nå',
  'Zainstaluj teraz',
  'Instale agora',
  'Cài đặt ngay',
  'Установить сейчас',
  'Instalar Ahora',
  'Installera nu',
  'ติดตั้งเลย',
  'Şimdi Yükleyin',
  'Встановити зараз'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeDescription(value) {
  let result = value.replace(CHROME_STORE_URL_PATTERN, '');

  for (const label of INSTALL_LABELS) {
    const labelPattern = new RegExp(`(?:^|\\s)${escapeRegExp(label)}:\\s*`, 'g');
    result = result.replace(labelPattern, ' ');
  }

  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  return result;
}

function main() {
  const targetFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FILE;
  const raw = fs.readFileSync(targetFile, 'utf8');
  const descriptions = JSON.parse(raw);
  const sanitized = Object.fromEntries(
    Object.entries(descriptions).map(([locale, description]) => [locale, sanitizeDescription(description)])
  );

  fs.writeFileSync(targetFile, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8');
  console.log(`Sanitized Edge store descriptions: ${targetFile}`);
}

main();