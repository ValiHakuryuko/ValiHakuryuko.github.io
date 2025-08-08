\
#!/usr/bin/env python3
"""
Generate sitemap.xml, search_index.json, feed.xml (Atom) for a static site.

Usage:
  python scripts/generate_site_artifacts.py --site-url https://example.github.io
"""
import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent.parent  # repo root

EXCLUDE_DIRS = {
    ".git", ".github", "node_modules", "vendor", "dist", "build", "assets", "images", "img", "css", "js"
}
HTML_FILES_GLOB = ["*.html", "**/*.html"]

def git_last_iso8601(path: Path) -> str:
    """Return last commit date for file in ISO 8601, fallback to now."""
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cI", str(path)], cwd=str(HERE)
        ).decode().strip()
        if out:
            return out
    except Exception:
        pass
    # fallback to filesystem time in UTC
    ts = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    return ts

def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def extract_page_info(path: Path):
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.string.strip() if soup.title and soup.title.string else path.stem
    meta_desc = ""
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content"):
        meta_desc = md["content"].strip()

    # Prefer <main>, else body text (exclude nav/footer/aside)
    for tag in soup.select("nav, footer, aside, script, style"):
        tag.decompose()
    content_node = soup.find("main") or soup.body or soup
    content_text = clean_text(content_node.get_text(separator=" ", strip=True))
    if meta_desc and meta_desc not in content_text:
        content_text = meta_desc + " " + content_text

    return {
        "title": clean_text(title),
        "description": meta_desc,
        "content": content_text[:2000],  # cap to keep index light
    }

def discover_html_files():
    files = set()
    for pattern in HTML_FILES_GLOB:
        for p in HERE.glob(pattern):
            if not p.is_file():
                continue
            rel = p.relative_to(HERE)
            if any(part in EXCLUDE_DIRS for part in rel.parts):
                continue
            files.add(rel)
    return sorted(files)

def build_search_index(site_url: str):
    items = []
    for rel in discover_html_files():
        info = extract_page_info(HERE / rel)
        url = "/" + str(rel).replace(os.sep, "/")
        lastmod = git_last_iso8601(HERE / rel)[:10]
        items.append({
            "url": url,
            "title": info["title"],
            "content": info["content"],
            "tags": "",  # optional; can be filled later
            "lastmod": lastmod
        })
    # Bonus: extract anchors from blog.html for finer search granularity
    blog_path = HERE / "blog.html"
    if blog_path.exists():
        html = blog_path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(html, "lxml")
        # Look for headings with IDs or <article id="">
        candidates = soup.select("h1[id],h2[id],h3[id],article[id]")
        for c in candidates:
            cid = c.get("id")
            if not cid:
                continue
            # capture text around the section for snippet
            text = []
            sib = c.find_next_sibling()
            steps = 0
            while sib and steps < 5:
                if sib.name in ("p", "ul", "ol", "pre", "code"):
                    text.append(sib.get_text(" ", strip=True))
                sib = sib.find_next_sibling()
                steps += 1
            snippet = clean_text(" ".join(text))[:600]
            items.append({
                "url": f"/blog.html#{cid}",
                "title": clean_text(c.get_text(" ", strip=True)),
                "content": snippet or "Blog section",
                "tags": "blog, section",
                "lastmod": git_last_iso8601(blog_path)[:10]
            })
    return items

def build_sitemap(site_url: str):
    urls = []
    for rel in discover_html_files():
        loc = f"{site_url}/" + str(rel).replace(os.sep, "/")
        lastmod = git_last_iso8601(HERE / rel)[:10]
        urls.append((loc, lastmod))
    # dedupe and sort
    urls = sorted(set(urls), key=lambda x: x[0])
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    for loc, lastmod in urls:
        parts.append("  <url>")
        parts.append(f"    <loc>{loc}</loc>")
        parts.append(f"    <lastmod>{lastmod}</lastmod>")
        parts.append("  </url>")
    parts.append("</urlset>")
    return "\n".join(parts) + "\n"

def build_feed(site_url: str):
    # Create Atom entries from blog.html anchors or fallback to blog.html
    entries = []
    blog_rel = Path("blog.html")
    blog_path = HERE / blog_rel
    updated = git_last_iso8601(blog_path) if blog_path.exists() else datetime.now(timezone.utc).isoformat()

    if blog_path.exists():
        html = blog_path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(html, "lxml")
        candidates = soup.select("h1[id],h2[id],h3[id],article[id]")
        for c in candidates[:30]:
            cid = c.get("id")
            if not cid:
                continue
            title = clean_text(c.get_text(" ", strip=True))
            # summary from nearby text
            summary = ""
            sib = c.find_next_sibling()
            steps = 0
            chunks = []
            while sib and steps < 4:
                if sib.name in ("p", "ul", "ol", "pre", "code"):
                    chunks.append(sib.get_text(" ", strip=True))
                sib = sib.find_next_sibling()
                steps += 1
            summary = clean_text(" ".join(chunks))[:500]
            url = f"{site_url}/blog.html#{cid}"
            entries.append({
                "title": title or f"Post: {cid}",
                "url": url,
                "id": url,
                "updated": updated,
                "published": updated,
                "summary": summary or "Blog update"
            })
    if not entries:
        # fallback to at least one blog entry if blog.html exists
        if blog_path.exists():
            u = f"{site_url}/blog.html"
            entries.append({
                "title": "Blog update",
                "url": u, "id": u,
                "updated": updated, "published": updated,
                "summary": "New content on the blog."
            })

    # Build XML
    parts = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        '  <title>Vali Hakuryuko — Blog</title>',
        '  <subtitle>Security notes, walkthroughs, and tools</subtitle>',
        f'  <link href="{site_url}/feed.xml" rel="self"/>',
        f'  <link href="{site_url}/"/>',
        f'  <updated>{updated}</updated>',
        f'  <id>{site_url}/</id>',
        '  <author><name>Vali Hakuryuko</name></author>',
    ]
    for e in entries:
        parts.extend([
            '  <entry>',
            f'    <title>{e["title"]}</title>',
            f'    <link href="{e["url"]}"/>',
            f'    <id>{e["id"]}</id>',
            f'    <updated>{e["updated"]}</updated>',
            f'    <published>{e["published"]}</published>',
            '    <summary type="html"><![CDATA[' + e["summary"] + ']]></summary>',
            '  </entry>'
        ])
    parts.append('</feed>')
    return "\n".join(parts) + "\n"

def ensure_search_page():
    # Only create if missing, to allow custom styling in repo
    search_html_path = HERE / "search.html"
    if search_html_path.exists():
        return
    html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Search — Vali Hakuryuko</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
    .search-box { max-width: 720px; margin: 0 auto 1.5rem; }
    #search-input { width: 100%; padding: 0.75rem 1rem; font-size: 1rem; }
    .result { border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
    .result h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
    .muted { color: #6b7280; font-size: 0.9rem; }
  </style>
  <script src="https://unpkg.com/lunr/lunr.min.js"></script>
</head>
<body>
  <div class="search-box">
    <h1>Search</h1>
    <input id="search-input" type="search" placeholder="Type to search (e.g., 'Burp', 'SQLi', 'privesc')"/>
    <div id="results-count" class="muted"></div>
  </div>
  <div id="search-results"></div>
  <script>
  (function() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');
    const countEl = document.getElementById('results-count');

    fetch('search_index.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(docs => {
        const idx = lunr(function() {
          this.ref('url');
          this.field('title');
          this.field('content');
          this.field('tags');
          docs.forEach(doc => this.add(doc));
        });

        function render(results) {
          resultsEl.innerHTML = '';
          countEl.textContent = results.length ? results.length + ' result' + (results.length>1?'s':'') : 'No results';
          results.forEach(r => {
            const doc = docs.find(x => x.url === r.ref);
            if (!doc) return;
            const item = document.createElement('div');
            item.className = 'result';
            item.innerHTML = `
              <h3><a href="${doc.url}">${doc.title}</a></h3>
              <div class="muted">${(doc.content||'').slice(0, 180)}...</div>
              <div class="muted">Tags: ${doc.tags||''}</div>
            `;
            resultsEl.appendChild(item);
          });
        }

        // initial render: show everything
        render(docs.map(d => ({ ref: d.url })));

        input.addEventListener('input', () => {
          const q = input.value.trim();
          if (!q) { render(docs.map(d => ({ ref: d.url }))); return; }
          try {
            const results = idx.search(q + '*'); // prefix match
            render(results);
          } catch (e) {
            const ql = q.toLowerCase();
            const results = docs.filter(d =>
              (d.title||'').toLowerCase().includes(ql) ||
              (d.content||'').toLowerCase().includes(ql) ||
              (d.tags||'').toLowerCase().includes(ql)
            ).map(d => ({ ref: d.url }));
            render(results);
          }
        });
      })
      .catch(err => {
        resultsEl.textContent = 'Failed to load search index: ' + err;
      });
  })();
  </script>
</body>
</html>
"""
    search_html_path.write_text(html, encoding="utf-8")

def ensure_robots(site_url: str):
    robots_path = HERE / "robots.txt"
    if robots_path.exists():
        # ensure sitemap line exists; append if missing
        txt = robots_path.read_text(encoding="utf-8", errors="ignore")
        sitemap_line = f"Sitemap: {site_url}/sitemap.xml"
        if sitemap_line not in txt:
            txt = txt.rstrip() + "\n\n" + sitemap_line + "\n"
            robots_path.write_text(txt, encoding="utf-8")
        return
    robots = f"""User-agent: *
Allow: /

Sitemap: {site_url}/sitemap.xml
"""
    robots_path.write_text(robots, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", required=True, help="Canonical site URL, e.g., https://valihakuryuko.github.io")
    args = ap.parse_args()
    site_url = args.site_url.rstrip("/")

    # Build artifacts
    search_index = build_search_index(site_url)
    (HERE / "search_index.json").write_text(json.dumps(search_index, indent=2), encoding="utf-8")

    sitemap = build_sitemap(site_url)
    (HERE / "sitemap.xml").write_text(sitemap, encoding="utf-8")

    feed = build_feed(site_url)
    (HERE / "feed.xml").write_text(feed, encoding="utf-8")

    ensure_search_page()
    ensure_robots(site_url)

    print("Generated: feed.xml, sitemap.xml, robots.txt, search_index.json")
    print("Tip: Add a link to /search.html in your nav.")

if __name__ == "__main__":
    main()
