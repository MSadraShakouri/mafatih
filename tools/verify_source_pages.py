#!/usr/bin/env python3
"""Verify recorded page witnesses against the exact external HTML snapshot.

The source text is not distributed here. This is an offline, read-only
comparison, not a text, translation, rights or scholarly review.
"""
from __future__ import annotations
import argparse
import bisect
import hashlib
import html as html_lib
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
HEADING = re.compile(r'<h([1-9])\b[^>]*>(.*?)</h\1\s*>', re.I | re.S)
FOOTER = re.compile(r'<p\b[^>]*>\s*<span\b[^>]*>\s*ص\s*:\s*([\d۰-۹٠-٩]+)\s*</span>\s*</p\s*>', re.I | re.S)
PARAGRAPH = re.compile(r'<p\b(?=[^>]*class="[^"]*\bcontent_paragraph\b)[^>]*>(.*?)</p\s*>', re.I | re.S)
PAGE_TEXT = re.compile(r'ص\s*:\s*[\d۰-۹٠-٩]+')


def clean(value: str) -> str:
    return ' '.join(html_lib.unescape(re.sub(r'<[^>]*>', ' ', value)).split())


def normalize_heading(value: str) -> str:
    value = unicodedata.normalize('NFKC', value)
    value = ''.join(c for c in value if not unicodedata.category(c).startswith('M'))
    return re.sub(r'[^\w\d]+', '', value.translate(str.maketrans('يكأإآةۀؤ', 'یکاااههو')), flags=re.U).casefold()


def unambiguous_pair(previous: int | None, following: int | None) -> bool:
    """A gap in the footers is not proof of the intervening printed page."""
    if following is None:
        return False
    if previous is None:
        return True
    return following == previous + 1 or (previous, following) == (20, 1)


def final_paragraph_footer(start: int, stop: int, markers: list[tuple[int, int]],
                           paragraphs: list[tuple[int, str]]) -> tuple[int | None, int | None]:
    paragraph_positions = [position for position, _ in paragraphs]
    index = bisect.bisect_left(paragraph_positions, stop) - 1
    if index < 0 or paragraphs[index][0] < start:
        return None, None
    marker_positions = [position for position, _ in markers]
    marker_index = bisect.bisect_right(marker_positions, paragraphs[index][0])
    previous = markers[marker_index - 1][1] if marker_index else None
    following = markers[marker_index][1] if marker_index < len(markers) else None
    return previous, following


def observe_headings(source: str) -> tuple[list[dict], list[tuple[int, int]], list[tuple[int, str]]]:
    """Extract observations, without assuming missing markers are pages."""
    headings = [{'position': match.start(), 'level': int(match[1]), 'title': clean(match[2])}
                for match in HEADING.finditer(source)]
    markers = [(match.start(), int(match[1])) for match in FOOTER.finditer(source)]
    positions = [position for position, _ in markers]
    paragraphs = []
    for match in PARAGRAPH.finditer(source):
        value = clean(match[1])
        if not value or value in ('صوت', '***') or PAGE_TEXT.fullmatch(value):
            continue
        paragraphs.append((match.start(), value))
    for i, heading in enumerate(headings):
        index = bisect.bisect_left(positions, heading['position'])
        heading['previous_footer'] = markers[index - 1][1] if index else None
        heading['next_footer'] = markers[index][1] if index < len(markers) else None
        stop = headings[i + 1]['position'] if i + 1 < len(headings) else len(source)
        previous, following = final_paragraph_footer(heading['position'], stop, markers, paragraphs)
        heading['last_text_previous_footer'] = previous
        heading['last_text_footer'] = following
    return headings, markers, paragraphs


def verify(html_path: pathlib.Path, data_root: pathlib.Path) -> tuple[int, int, int]:
    history = json.loads((data_root / 'editorial-history.json').read_text(encoding='utf-8'))
    batches = [batch for batch in history.get('navigation_page_corrections', [])
               if batch['method'] == 'heading-trailing-footers-v1']
    if len(batches) != 1:
        raise ValueError('Expected exactly one heading-trailing-footers-v1 page-history batch')
    batch = batches[0]
    raw = html_path.read_bytes()
    actual_hash = hashlib.sha256(raw).hexdigest()
    if actual_hash != batch['source_sha256']:
        raise ValueError(f"HTML SHA-256 differs: expected {batch['source_sha256']}, got {actual_hash}. "
                         'The expected hash identifies the retrieved proxy copy, not necessarily publisher bytes.')
    source = raw.decode('utf-8')
    headings, markers, paragraphs = observe_headings(source)
    changes = batch['changes']
    matched = [change for change in changes if change['observation']['heading'] is not None]
    if len(matched) != len(headings):
        raise ValueError(f'{len(headings)} HTML headings but {len(matched)} historical source headings')
    texts = {}
    for shard in sorted((data_root / 'texts').glob('*.json')):
        texts.update(json.loads(shard.read_text(encoding='utf-8')))
    for i, change in enumerate(matched):
        observation = change['observation']
        if observation['heading'] != i + 1:
            raise ValueError(f'Historical source-heading order differs at {i + 1}')
        heading = headings[i]
        if change['source_level'] != heading['level'] or normalize_heading(texts[change['title']]) != normalize_heading(heading['title']):
            raise ValueError(f'Heading title or level differs at {i + 1}')
        for field in ('previous_footer', 'next_footer', 'last_text_footer'):
            if observation[field] != heading[field]:
                raise ValueError(f'Heading {i + 1}: {field} differs from source')
        if observation['kind'] == 'source-heading':
            if not unambiguous_pair(heading['previous_footer'], heading['next_footer']):
                raise ValueError(f'Heading {i + 1}: missing or ambiguous footer after heading')
            if heading['last_text_footer'] is not None and not unambiguous_pair(
                    heading['last_text_previous_footer'], heading['last_text_footer']):
                raise ValueError(f'Heading {i + 1}: missing or ambiguous footer after last paragraph')
    group_count = 0
    for i, change in enumerate(matched):
        observation = change['observation']
        if observation['subtree_footer'] is None:
            continue
        path = change['path']
        last = i
        while last + 1 < len(matched) and matched[last + 1]['path'][:len(path)] == path:
            last += 1
        if last == i:
            raise ValueError(f'Subtree at heading {i + 1} has no descendants')
        stop = headings[last + 1]['position'] if last + 1 < len(headings) else len(source)
        previous, following = final_paragraph_footer(headings[i]['position'], stop, markers, paragraphs)
        if not unambiguous_pair(previous, following) or following != observation['subtree_footer']:
            raise ValueError(f'Subtree at heading {i + 1}: ambiguous or changed final footer')
        ends = [headings[j]['last_text_footer'] for j in range(i + 1, last + 1)
                if headings[j]['last_text_footer'] is not None]
        if not ends or max(ends) != observation['descendant_max_end'] or max(ends) != following:
            raise ValueError(f'Subtree at heading {i + 1}: descendant ends disagree')
        if observation['kind'] == 'source-heading':
            group_count += 1
    return len(headings), len(markers), group_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('html', type=pathlib.Path, help='Exact retrieved HTML snapshot; not saved by this tool')
    parser.add_argument('--data-root', type=pathlib.Path, default=ROOT / 'data')
    args = parser.parse_args()
    try:
        headings, markers, groups = verify(args.html, args.data_root)
    except (OSError, ValueError, KeyError, UnicodeError, json.JSONDecodeError) as error:
        print(f'Source-page comparison failed: {error}', file=sys.stderr)
        return 1
    print(f'Observed {headings} matching headings, {markers} page footers and {groups} inferred subtree ends.')
    print('Marker comparison only; text, translation, pagination interpretation and rights still require review.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
