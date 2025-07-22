document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const backToTopBtn = document.getElementById('back-to-top');

  // Toggle sidebar open/close on button click
  toggleBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen);
  });

  // Show/hide Back to Top button on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });

  // Smooth scroll to top on Back to Top button click
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Theme toggle function (make sure you have a button with class 'theme-toggle' in your HTML)
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchBar");
  const posts = document.querySelectorAll(".blog-post");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();

    posts.forEach((post) => {
      const text = post.textContent.toLowerCase();
      if (text.includes(query)) {
        post.style.display = "block";
      } else {
        post.style.display = "none";
      }
    });
  });
});
