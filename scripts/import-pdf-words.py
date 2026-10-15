"""Extract numbered vocabulary tables. Usage: python scripts/import-pdf-words.py INPUT_DIR"""
import fitz, pathlib, re, json, unicodedata, hashlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
INPUT = pathlib.Path(sys.argv[1])
BOOKS = [
    ('bbdc_XDFTOEFL_p3v6.pdf', 'xdf', '托福词汇', 4262),
    ('bbdc_GDTOEFL7T_RUVc.pdf', 'seven-days', '7天搞定托福单词', 2061),
    ('bbdc_TFCYLJ_7527.pdf', 'categories', '托福词以类记2.0', 4124),
    ('bbdc_TOEFLHXCZ_EHzT.pdf', 'core-phrases', '托福真题核心词组', 650),
    ('bbdc_TOEFLTZCZ_5pHb.pdf', 'extended-phrases', '托福真题拓展词组', 670),
]

def clean(text):
    return unicodedata.normalize('NFKC', re.sub(r'\s+', ' ', text).strip())

def entries(text):
    out, number = {}, None
    for line in text.strip().splitlines():
        match = re.fullmatch(r'(\d+)(?:\s+(.*))?', line.strip())
        if match:
            number = int(match[1])
            assert number not in out
            out[number] = [match[2]] if match[2] else []
        else:
            assert number is not None, line
            out[number].append(line)
    return {i: clean(' '.join(value)) for i, value in out.items()}

merged, report = {}, []
for filename, book_id, title, expected in BOOKS:
    document = fitz.open(INPUT / filename)
    indices = []
    for page_no, page in enumerate(document, 1):
        parts = page.get_text().split('Word\nMeaning\n')
        assert len(parts) == 3, (filename, page_no)
        left = entries(parts[1])
        right = entries(re.split(r'\n[^\n]*\n\s*\n共 \d+ 词 ', parts[2])[0])
        assert left.keys() == right.keys(), (filename, page_no)
        for index, lemma in left.items():
            gloss = right[index]
            assert lemma and re.search('[\u4e00-\u9fff]', gloss), (filename, page_no, index)
            assert not re.search('[\u4e00-\u9fff]', lemma), (filename, page_no, index)
            key = lemma.casefold()
            indices.append(index)
            word = merged.setdefault(key, {
                'id': 'pdf-' + hashlib.sha256(key.encode()).hexdigest()[:16],
                'lemma': lemma, 'glosses': [], 'sources': [],
            })
            if gloss not in word['glosses']:
                word['glosses'].append(gloss)
            word['sources'].append({'bookId': book_id, 'page': page_no, 'index': index})
    assert indices == list(range(1, expected + 1)), (filename, len(indices), expected)
    report.append({'file': filename, 'id': book_id, 'title': title, 'pages': len(document), 'entries': len(indices)})
output = ROOT / 'src/data'
output.mkdir(exist_ok=True)
(output / 'pdfWords.json').write_text(json.dumps(list(merged.values()), ensure_ascii=False, separators=(',', ':')) + '\n')
(output / 'sources.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'sources': report, 'sourceEntries': sum(book['entries'] for book in report), 'unique': len(merged)}, ensure_ascii=False, indent=2))
