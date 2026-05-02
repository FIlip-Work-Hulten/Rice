#!/usr/bin/env python3
import os
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
HTML_DIR = ROOT / 'src' / 'frontend' / 'html'
PROJECTS_DIR = ROOT / 'src' / 'frontend' / 'projects'
STATIC_DIR = ROOT / 'src' / 'frontend' / 'static'

class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag == 'script' and 'src' in attrs:
            self.links.append(attrs['src'])
        if tag == 'img' and 'src' in attrs:
            self.links.append(attrs['src'])

def collect_files(dirpath):
    for p in sorted(dirpath.glob('*.html')):
        yield p

def check_file(path):
    p = Path(path)
    if p.exists():
        return True
    # allow absolute /static/... -> map to STATIC_DIR
    s = str(path)
    if s.startswith('/static/'):
        candidate = STATIC_DIR / s[len('/static/'):]
        return candidate.exists()
    return False

def scan_html(file_path):
    text = file_path.read_text(encoding='utf-8')
    parser = LinkCollector()
    parser.feed(text)
    missing = []
    for lk in parser.links:
        if lk.startswith('http://') or lk.startswith('https://'):
            continue
        if not check_file(lk):
            missing.append(lk)
    return missing

def main():
    all_html = list(collect_files(HTML_DIR)) + list(collect_files(PROJECTS_DIR))
    ok = True
    for h in all_html:
        missing = scan_html(h)
        if missing:
            ok = False
            print(f"{h.relative_to(ROOT)}: missing {len(missing)} assets:")
            for m in missing:
                print('  -', m)
    if ok:
        print('All static links resolved for HTML pages.')
        return 0
    return 2

if __name__ == '__main__':
    raise SystemExit(main())
