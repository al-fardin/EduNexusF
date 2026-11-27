"""Build the Bengali, evidence-linked commit history PDF from an explicit Git snapshot.

Bengali shaping is rendered with Chromium rather than ReportLab's basic text path.
No application server, user browser, network requests or private environment files are used.
"""
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / "tmp/pdfs"
OUT = ROOT / "output/pdf/edunexus-commit-history-bn.pdf"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def escape(value: object) -> str:
    return html.escape(str(value))


def collect(revision: str) -> list[dict]:
    rows = []
    for sha in git("rev-list", "--reverse", revision).splitlines():
        parts = git("show", "-s", "--format=%H%x00%h%x00%cs%x00%s", sha).strip().split("\0", 3)
        changes = []
        for line in git("diff-tree", "--root", "--no-commit-id", "--numstat", "-r", "-M", sha).splitlines():
            added, deleted, name = line.split("\t", 2)
            changes.append({"path": name, "added": int(added) if added.isdigit() else None,
                            "deleted": int(deleted) if deleted.isdigit() else None})
        rows.append(dict(zip(["sha", "short", "date", "subject"], parts)) | {"changes": changes})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", default="78ca06f")
    parser.add_argument("--runtime-root", default=str(Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies"))
    args = parser.parse_args()
    revision = git("rev-parse", "--verify", args.revision + "^{commit}").strip()
    rows = collect(revision)
    definitions = {}
    for line in (ROOT / "scripts/docs/commit-explanations-bn.txt").read_text(encoding="utf-8").splitlines():
        short, title, change, meaning = line.split("|")
        definitions[short] = (title, change, meaning)
    missing = [r["short"] for r in rows if r["short"] not in definitions]
    if missing:
        raise ValueError(f"Reviewed Bengali explanations required for commits: {missing}")
    for r in rows:
        r["title"], r["change"], r["meaning"] = definitions[r["short"]]
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    (TMP / "commit-history.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    remote = git("remote", "get-url", "origin").strip().removesuffix(".git")
    logo = (ROOT / "docs/branding/edunexus-titanium-master.png").as_uri()
    pages = []

    def page(body: str, extra: str = "") -> None:
        pages.append(f'<section class="page {extra}">{body}</section>')

    page(f'''<div class="cover-top"><img src="{logo}"><span>EDUNEXUS / DEVELOPMENT RECORD</span></div>
      <div class="eyebrow">বাংলায় source-based ব্যাখ্যা</div>
      <h1 class="cover-title">কোন commit-এ<br>কী বদলেছে</h1>
      <p class="cover-sub">প্রথম সংরক্ষিত snapshot থেকে বর্তমান codebase study guides পর্যন্ত।
      প্রতিটি পরিবর্তনের কাজ, অর্থ ও source evidence।</p>
      <div class="cover-stats"><div><b>{len(rows)}</b><span>commit ব্যাখ্যা</span></div>
      <div><b>১৪ অক্টোবর</b><span>history শুরু / ২০২৬</span></div>
      <div><b>২৭ নভেম্বর</b><span>snapshot / ২০২৬</span></div></div>
      <div class="cover-bottom"><p><b>Snapshot</b> <code>{escape(revision)}</code></p>
      <p><b>Repository</b> <a href="{escape(remote)}">al-fardin / EduNexusF</a></p>
      <p>Codebase শেখা, project handover ও judge-এর technical প্রশ্নের প্রস্তুতির জন্য।</p></div>''', "cover")

    page('''<div class="eyebrow">পড়ার নিয়ম</div><h1>এই report কী বলছে</h1>
      <p class="lead">প্রতিটি commit একটি নির্দিষ্ট সময়ের change set। Feature এখন কেমন আছে বুঝতে পরবর্তী fix, redesign ও hardening-ও পড়তে হবে।</p>
      <div class="note"><b>Coverage:</b> main-এর snapshot 78ca06f থেকে reachable ৯৪টি commit; oldest-first ক্রমে। Repository shallow নয়। অন্য branch-এর unreachable/deleted commits বা Git-এর আগের কাজ এই report-এর দাবি নয়।</div>
      <h2>প্রতিটি entry-তে যা আছে</h2>
      <p><b>Hash ও তারিখ:</b> Git committer date এবং unique commit identity।<br>
      <b>বাংলা ব্যাখ্যা:</b> কী বদলেছে ও ব্যবহার/maintenance-এ তার অর্থ।<br>
      <b>Source scope:</b> নির্বাচিত representative paths এবং মোট changed-file entry count।<br>
      <b>Diff link:</b> GitHub-এ সম্পূর্ণ change set।<br>
      <b>Text churn:</b> Git numstat-এর added/deleted lines; quality score বা নিজের লেখা business-code count নয়।</p>
      <h2>যে ভুলগুলো করা যাবে না</h2>
      <ul><li>Root commit-এ বহু existing file আছে; সব প্রথম ওই দিন বানানো হয়েছিল বলা যায় না।</li>
      <li>Test file পরিবর্তিত হওয়া মানে test তখন বা এখন pass করেছে এমন প্রমাণ নয়।</li>
      <li>Deployment/push/AI setup থাকা মানে provider configured বা service live নয়।</li>
      <li>পুরোনো N logo ও violet theme পরের commits-এ replace হয়েছে।</li>
      <li>Folder reorganisation-এর আগের internal/ paths এখন backend/internal/-এ থাকতে পারে।</li></ul>
      <div class="note">এই PDF source-history explanation; নতুন penetration test, SonarQube score বা full runtime verification report নয়। PDF তৈরির নিজস্ব পরবর্তী commit এই frozen snapshot-এর বাইরে থাকবে।</div>''')

    phases = [
        ("01 - 15", "Exam foundation ও mobile", "Desktop pairing/recovery, optional tester, question bank, assignments, notifications, analytics, tutor ও mobile entry।"),
        ("16 - 30", "Communication ও reliability", "Messaging, topics, answer review, push, calls, HTTPS testing, quality checks, audit ও offline coursework।"),
        ("31 - 48", "Organisation ও academic tools", "Repository cleanup, gradebook, digests, calendar/search/progress, backups, semesters ও signed Android updates।"),
        ("49 - 66", "Controls, enrollment ও sections", "Account security, moderation/reports, join approval, CSV/QR, schedules, optional audience ও sections।"),
        ("67 - 81", "Advanced teaching ও authoring", "Personal timing/planner, private workspace, optional institutions, rich MCQ/import/OCR ও readiness।"),
        ("82 - 94", "Fixes, hardening ও current identity", "Recovery/authorization, backup CI, Windows launcher, production security, brown palette, logo ও study guides।"),
    ]
    page('<div class="eyebrow">বড় ছবিটা</div><h1>Development-এর ছয়টি ধাপ</h1><p class="lead">Commit range ধরে পড়লে feature-এর জন্ম, interface, fixes ও documentation-এর সম্পর্ক বোঝা সহজ।</p>' +
         ''.join(f'<div class="phase"><code>{a}</code><div><h2>{b}</h2><p>{c}</p></div></div>' for a,b,c in phases) +
         '<div class="note"><b>Judge-কে বোঝানোর সূত্র:</b> user problem → commit/change → code evidence → limitation। Commit count দিয়ে project-এর security বা quality মাপবেন না।</div>')

    index_size = 24
    index_pages = (len(rows) + index_size - 1) // index_size
    first_log_page = 4 + index_pages
    for block in range(index_pages):
        entries = []
        for offset, r in enumerate(rows[block*index_size:(block+1)*index_size], block*index_size):
            number = offset + 1
            log_page = first_log_page + offset // 3
            entries.append(f'<tr><td>{number:02}</td><td><a href="#commit-{r["short"]}"><code>{r["short"]}</code></a></td><td>{escape(r["title"])}</td><td>{log_page}</td></tr>')
        page(f'<div class="eyebrow">দ্রুত খোঁজ / {block+1} of {index_pages}</div><h1>Commit সূচি</h1><table class="index"><thead><tr><th>নং</th><th>Hash</th><th>পরিবর্তন</th><th>পৃষ্ঠা</th></tr></thead><tbody>{"".join(entries)}</tbody></table>')

    for start in range(0, len(rows), 3):
        cards = []
        for offset, r in enumerate(rows[start:start+3], start):
            changes = r["changes"]
            # Show implementation before tests/config/lockfiles, with one example per major directory.
            def priority(c: dict) -> tuple:
                name = c["path"]
                return (int("test" in name.lower()), int(name.endswith((".sum", ".json", ".md"))), int(name.startswith(".")), name)
            selected, roots = [], set()
            for c in sorted(changes, key=priority):
                scope = c["path"].split("/")[0]
                if scope not in roots:
                    selected.append(c["path"]); roots.add(scope)
                if len(selected) == 3:
                    break
            for c in sorted(changes, key=priority):
                if len(selected) >= 3:
                    break
                if c["path"] not in selected:
                    selected.append(c["path"])
            add = sum(c["added"] or 0 for c in changes)
            delete = sum(c["deleted"] or 0 for c in changes)
            binary = sum(c["added"] is None for c in changes)
            url = f'{remote}/commit/{r["sha"]}'
            cards.append(f'''<article class="card" id="commit-{r['short']}">
              <div class="meta"><b>{offset+1:02} / {len(rows)}</b><code>{r['short']}</code><span>{r['date']}</span><a href="{url}">পূর্ণ diff ↗</a></div>
              <h2>{escape(r['title'])}</h2><p class="subject">{escape(r['subject'])}</p>
              <p><b>বদল:</b> {escape(r['change'])}</p><p><b>অর্থ:</b> {escape(r['meaning'])}</p>
              <div class="paths"><b>প্রধান paths:</b> {'<br>'.join(escape(p) for p in selected)}</div>
              <div class="stats">{len(changes)} file entries &nbsp; | &nbsp; +{add:,} / -{delete:,} text lines &nbsp; | &nbsp; {binary} binary entries</div>
              </article>''')
        page(f'<div class="log-head"><span>EDUNEXUS / COMMIT RECORD</span><span>{start+1:02} - {min(start+3,len(rows)):02}</span></div><div class="cards">{"".join(cards)}</div>', "log")

    css = '''
    @page {size:A4; margin:15mm 15mm 15mm;}
    *{box-sizing:border-box}html{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    body{margin:0;color:#262421;font:10.6pt/1.5 "Nirmala UI","Segoe UI",sans-serif}
    .page{width:180mm;height:266mm;break-after:page;position:relative;overflow:visible}
    .page:last-child{break-after:auto}h1,h2,p{margin:0}h1{font-size:25pt;line-height:1.3;margin:4mm 0 8mm;letter-spacing:-.3px}
    h2{font-size:13pt;line-height:1.35;margin:4mm 0 2mm}p{margin:0 0 3mm}ul{padding-left:6mm;margin:0 0 5mm}li{margin:0 0 2mm}
    a{color:#855132;text-decoration:none}code{font:9pt/1.4 Consolas,monospace;color:#6e4934;overflow-wrap:anywhere}
    .eyebrow{color:#855132;font:700 9pt/1.4 "Segoe UI",sans-serif;letter-spacing:1px;border-top:2px solid #855132;padding-top:4mm}
    .lead{font-size:13pt;line-height:1.65;color:#5d554d;margin-bottom:7mm}.note{padding:4mm 5mm;background:#f5efe8;border-left:3px solid #a77c57;margin:5mm 0;font-size:10.5pt}
    .cover{padding-top:6mm;background:linear-gradient(145deg,#fff 35%,#faf5ef 100%)}
    .cover-top{display:flex;align-items:center;gap:5mm;color:#6f503a;font:600 9pt "Segoe UI";letter-spacing:1px;margin-bottom:25mm}
    .cover-top img{width:22mm;height:22mm;object-fit:contain}.cover .eyebrow{border:0;padding:0;font-size:11pt}
    .cover-title{font-size:39pt;line-height:1.35;margin:7mm 0}.cover-sub{font-size:14pt;line-height:1.75;max-width:155mm;color:#62564b}
    .cover-stats{display:flex;gap:12mm;border-top:1px solid #dac9b7;border-bottom:1px solid #dac9b7;padding:7mm 0;margin:13mm 0}
    .cover-stats div{flex:1}.cover-stats b{font-size:18pt;display:block;color:#855132}.cover-stats span{font-size:10pt;color:#74695e}
    .cover-bottom{margin-top:14mm;font-size:10pt}.cover-bottom code{font-size:8pt}.phase{display:flex;gap:6mm;padding:5mm 0;border-bottom:1px solid #e7ddd2}
    .phase code{flex:0 0 21mm;padding-top:1mm}.phase h2{margin:0 0 2mm;font-size:13pt}.phase p{margin:0;color:#5c564f}
    table.index{border-collapse:collapse;width:100%;font-size:10pt}th{text-align:left;background:#f2e9df;color:#68452d;font-size:9pt;padding:2mm}
    td{padding:1.55mm 2mm;border-bottom:1px solid #e9e1d8;line-height:1.3}td:first-child{width:10mm;color:#8c7c6f}td:nth-child(2){width:23mm}td:last-child{text-align:right;width:13mm}
    .log-head{display:flex;justify-content:space-between;border-top:2px solid #855132;padding-top:3mm;margin-bottom:5mm;color:#866d57;font:600 9pt "Segoe UI";letter-spacing:1px}
    .cards{display:grid;grid-template-rows:repeat(3,1fr);gap:4mm;height:249mm}.card{border:1px solid #e4d8cb;border-radius:3mm;padding:4mm 4.5mm;min-height:0;position:relative;overflow:visible}
    .meta{display:flex;gap:4mm;align-items:center;font:8pt "Segoe UI";color:#796b60;margin-bottom:2mm}.meta b{background:#f2e8de;color:#785338;padding:1mm 2mm;border-radius:1mm}.meta a{margin-left:auto}
    .card h2{font-size:14pt;line-height:1.3;margin:0 0 1.5mm}.subject{font:italic 8pt/1.3 "Segoe UI";color:#827466;margin-bottom:2.5mm}
    .card p:not(.subject){font-size:10.2pt;line-height:1.45;margin-bottom:2mm}.paths{border-top:1px solid #eee5dc;padding-top:2mm;font:7.8pt/1.4 Consolas,"Nirmala UI",monospace;color:#6e665f;overflow-wrap:anywhere}
    .paths b{font-family:"Nirmala UI";font-size:8pt;display:inline-block;margin-right:2mm}.stats{font:7.5pt "Segoe UI";color:#8b7d70;margin-top:2mm}
    '''
    source = f'<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>EduNexus - Bengali Commit History</title><style>{css}</style></head><body>{"".join(pages)}</body></html>'
    (TMP / "commit-history.html").write_text(source, encoding="utf-8")
    runtime = Path(args.runtime_root)
    playwright = runtime / "node/node_modules/playwright"
    renderer = '''const {chromium}=require(process.argv[2]);
    (async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});
    try {const page=await browser.newPage();
    await page.route('**/*',route=>route.request().url().startsWith('file:')||route.request().url().startsWith('data:')?route.continue():route.abort());
    await page.goto(process.argv[3],{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.evaluate(()=>[...document.querySelectorAll('.page,.card')].map((e,i)=>({i,cls:e.className,h:e.clientHeight,sh:e.scrollHeight})).filter(e=>e.sh>e.h+2));
    if(overflow.length)throw Error('Layout overflow: '+JSON.stringify(overflow));
    await page.pdf({path:process.argv[4],format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:'<div style="font:8px Arial;color:#8a7d70;width:100%;padding:0 15mm;display:flex;justify-content:space-between"><span>EDUNEXUS | Snapshot 78ca06f | 27 Nov 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',outline:true,tagged:true});
    console.log(JSON.stringify({pages:await page.locator('.page').count(),cards:await page.locator('.card').count(),overflow}));
    }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});'''
    renderer = renderer.replace("Snapshot 78ca06f", "Snapshot " + revision[:7])
    js = TMP / "render-commit-history.cjs"
    js.write_text(renderer, encoding="utf-8")
    subprocess.run([str(runtime / "node/bin/node.exe"), str(js), str(playwright),
                    (TMP / "commit-history.html").as_uri(), str(OUT)], check=True, cwd=ROOT)
    print(f"Created {OUT} from {len(rows)} commits at {revision}")


if __name__ == "__main__":
    main()
