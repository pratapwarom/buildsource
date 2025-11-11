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

function acceptQuote(materialId){
  if(confirm('Are you sure you want to accept this quote? This will create an approved quote entry.')){
    fetch('/api/admin/accept-quote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ materialId }) })
      .then(r => r.json()).then(j => {
        if(j.success){
          alert('Quote accepted successfully!');
          location.reload();
        } else {
          alert('Failed to accept quote: ' + (j.error || 'Unknown error'));
        }
      }).catch(()=>alert('Request failed'));
  }
}

function rejectQuote(materialId){
  const reason = prompt('Reason for rejection (optional):');
  fetch('/api/admin/reject-quote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ materialId, reason }) })
    .then(r => r.json()).then(j => {
      if(j.success){
        alert('Quote rejected successfully!');
        location.reload();
      } else {
        alert('Failed to reject quote: ' + (j.error || 'Unknown error'));
      }
    }).catch(()=>alert('Request failed'));
}

// Materials search functionality
function initMaterialSearch(){
  const searchInput = document.getElementById('material-search');
  if(!searchInput) return;

  searchInput.addEventListener('input', filterMaterials);
}

function filterMaterials(){
  const searchInput = document.getElementById('material-search');
  const query = searchInput.value.toLowerCase().trim();
  const materialCards = document.querySelectorAll('.material-card');

  materialCards.forEach(card => {
    const name = card.querySelector('h3').textContent.toLowerCase();
    const description = card.querySelector('.material-description').textContent.toLowerCase();
    const category = card.querySelector('.category').textContent.toLowerCase();
    const vendor = card.querySelector('.vendor').textContent.toLowerCase();

    const matches = name.includes(query) ||
                   description.includes(query) ||
                   category.includes(query) ||
                   vendor.includes(query);

    card.style.display = matches ? 'block' : 'none';
  });
}

function clearSearch(){
  const searchInput = document.getElementById('material-search');
  if(searchInput){
    searchInput.value = '';
    filterMaterials();
  }
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', ()=>{
  // Existing code...
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

  // Initialize material search
  initMaterialSearch();
});
