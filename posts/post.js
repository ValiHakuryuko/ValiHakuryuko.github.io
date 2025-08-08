// Post helpers: reading time, TOC, code copy, anchors, quiz
(function () {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', () => {
    const article = $('.post');
    if (!article) return;

    // Reading time (avg 200 wpm)
    const text = article.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    const rt = $('#reading-time');
    if (rt) rt.textContent = minutes + ' min read';

    // Build TOC for h2/h3
    const tocList = $('#toc-list');
    if (tocList) {
      const headings = $$('.post h2, .post h3').filter(h => !h.closest('.post-header'));
      headings.forEach(h => {
        if (!h.id) {
          const slug = (h.textContent || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
          if (slug) h.id = slug;
        }
        // Anchor icon
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.className = 'anchor';
        a.textContent = '¶';
        h.prepend(a);

        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#' + h.id;
        link.textContent = h.textContent.replace(/^¶\s*/, '');
        li.appendChild(link);
        if (h.tagName === 'H3') li.style.marginLeft = '1rem';
        tocList.appendChild(li);
      });
    }

    // Code copy buttons
    $$('.post pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText || '';
        try {
          await navigator.clipboard.writeText(code);
          const old = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = old), 1200);
        } catch (e) {
          console.error('Copy failed', e);
          btn.textContent = 'Error';
          setTimeout(() => (btn.textContent = 'Copy'), 1200);
        }
      });
      pre.appendChild(btn);
    });

    // Quiz
    const quizBtn = $('#quiz-check');
    const quizResult = $('#quiz-result');
    if (quizBtn && quizResult) {
      quizBtn.addEventListener('click', () => {
        const groups = ['q1','q2','q3'];
        let score = 0;
        groups.forEach(name => {
          const selected = $(`input[name="${name}"]:checked`);
          if (selected && selected.hasAttribute('data-correct')) score++;
        });
        quizResult.textContent = `Score: ${score}/3`;
        quizResult.style.color = score === groups.length ? '#10b981' : '#f59e0b';
      });
    }
  });
})();