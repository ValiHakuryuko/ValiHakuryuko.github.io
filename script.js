document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchBar");
  const cards = document.querySelectorAll(".card");
  const themeToggle = document.getElementById("theme-toggle");

  // Apply saved theme on load
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
  }

  // Theme toggle button logic
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    const currentTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
    localStorage.setItem("theme", currentTheme);
  });

  // Search logic
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    cards.forEach((card) => {
      const post = card.querySelector(".blog-post");

      if (!post) return;

      const text = post.textContent.toLowerCase();

      // Remove old highlights
      const highlights = card.querySelectorAll("mark");
      highlights.forEach((mark) => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });

      if (text.includes(query)) {
        card.style.display = "block";

        if (query !== "") {
          highlightMatches(post, query);
        }
      } else {
        card.style.display = "none";
      }
    });
  });

  // Highlight function
  function highlightMatches(element, keyword) {
    const regex = new RegExp(`(${keyword})`, "gi");

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          node.parentNode.nodeName !== "SCRIPT" &&
          node.parentNode.nodeName !== "STYLE" &&
          node.textContent.toLowerCase().includes(keyword)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      },
      false
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const span = document.createElement("span");
      span.innerHTML = node.textContent.replace(regex, "<mark>$1</mark>");
      node.parentNode.replaceChild(span, node);
    });
  }
});
