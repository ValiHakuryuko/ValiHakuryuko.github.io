// Sidebar toggle for mobile
const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

toggleBtn.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('open');
  toggleBtn.setAttribute('aria-expanded', isOpen);
});

// Typing animation
const text = "Hello! I'm Vali. I’m passionate about cybersecurity, web technologies, and hands-on learning through projects.";
const typedTextElem = document.getElementById('typed-text');
let index = 0;

function type() {
  if (index < text.length) {
    typedTextElem.textContent += text.charAt(index);
    index++;
    setTimeout(type, 50);
  }
}

type();

// Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTopBtn.classList.add('show');
  } else {
    backToTopBtn.classList.remove('show');
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Your theme toggle function (example)
function toggleTheme() {
  document.body.classList.toggle('light-theme');
}
