document.addEventListener('DOMContentLoaded', ()=>{
  const toggles = document.querySelectorAll('.nav-toggle');
  toggles.forEach(btn => btn.addEventListener('click', ()=>{
    const nav = document.querySelector('.main-nav');
    if(!nav) return;
    nav.style.display = nav.style.display === 'block' ? '' : 'block';
  }));

  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  if(themeToggle){
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'dark'){
      document.body.classList.add('dark');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggle.addEventListener('click', ()=>{
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
});

function requestQuote(id){
  const name = prompt('Your name');
  const email = prompt('Your email');
  if(!name || !email){ alert('Name and email required'); return; }
  fetch('/api/request-quote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ materialId: id, name, email }) })
    .then(r => r.json()).then(j => alert(j.message || 'Requested')).catch(()=>alert('Request failed'));
}
