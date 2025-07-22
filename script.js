document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchBar");
  const cards = document.querySelectorAll(".card");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    cards.forEach((card) => {
      const post = card.querySelector(".blog-post");

      if (!post) return;

      const text = post.textContent.toLowerCase();

      // Remove old highlights
      const highlights = card.querySelectorAll("mark");
      highlights.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize(); // merge adjacent text nodes
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

function toggleTheme() {
  document.body.classList.toggle("light-theme");

  // Optional: save user preference
  if (document.body.classList.contains("light-theme")) {
    localStorage.setItem("theme", "light");
  } else {
    localStorage.setItem("theme", "dark");
  }
}

// Apply saved theme on load
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
  }
});

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const span = document.createElement("span");
      span.innerHTML = node.textContent.replace(
        regex,
        "<mark>$1</mark>"
      );
      node.parentNode.replaceChild(span, node);
    });
  }
});
