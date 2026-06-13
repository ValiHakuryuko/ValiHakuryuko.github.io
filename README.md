# ValiHakuryuko.github.io

Personal cybersecurity blog and portfolio for documenting web security labs, write-ups, homelab experiments, tooling notes, and my BSCP → OSCP learning path.

Live site: https://valihakuryuko.github.io/

## What this site includes

- Interactive homepage with particle-backed hero, profile card, certifications, and contact section.
- Blog archive rendered from a shared `sitePosts` source of truth.
- Long-form security posts with reading progress, table-of-contents spy, code block tools, and resume-reading support.
- Command palette with keyboard access, quick actions, and terminal-style commands.
- Learning path page showing current security tracks, progress state, and recency markers.
- Client-side JWT decoder and SQLi payload playgrounds for relevant posts.
- SEO basics: Open Graph metadata, `robots.txt`, `sitemap.xml`, and custom `404.html`.

## Tech stack

This is intentionally lightweight and dependency-free:

- HTML
- CSS
- Vanilla JavaScript
- GitHub Pages

No framework, no build step, no runtime dependency. The interactive pieces use browser APIs such as `requestAnimationFrame`, `IntersectionObserver`, and `localStorage`.

## Local development

From the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

On Windows, this may also work:

```bash
py -m http.server 8000
```

## Key files

```text
index.html              Homepage
blog.html               Blog archive
learning-path.html      Recruiter-facing learning path
blog/                   Individual write-ups
script.js               Shared interactivity
site.css                Site-wide base styles
style.css               Main visual system
interactive.css         Built interactive enhancement layer
css/interactive/        Split source CSS modules for maintenance
robots.txt              Search crawler rules
sitemap.xml             Search engine sitemap
404.html                Custom GitHub Pages 404 page
```

## Content source of truth

Blog metadata is kept in the `sitePosts` array inside `script.js`. The blog archive, command palette, activity graph, and continue-reading logic are designed to stay aligned from that shared source.

## Deployment

This repository is intended to be deployed directly through GitHub Pages. Push changes to the configured branch and GitHub Pages will serve the static files.

```bash
git add .
git commit -m "Update interactive security blog"
git push
```

## License

See [`LICENSE`](LICENSE).
