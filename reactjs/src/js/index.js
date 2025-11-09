import 'bootstrap/dist/css/bootstrap.css';

// Loader animation
window.addEventListener('load', () => {
  const loaderText = document.querySelector('article#newLoader p');
  const loader = document.getElementById('newLoader');
  const loaderSection = document.querySelector('article#newLoader section');
  
  loaderText.textContent = "We're Ready";
  
  setTimeout(() => {
    loader.classList.add('fadeOut');
  }, 800);
  
  setTimeout(() => {
    loader.style.display = 'none';
    loader.style.zIndex = '0';
    loaderSection.style.display = 'none';
  }, 2000);
});

// Scroll effects and footer
document.addEventListener('DOMContentLoaded', () => {
  const bckColorElements = document.querySelectorAll('.bckColor');
  const bckElement = document.getElementById('bck');
  let isScrolled = false;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 940 && !isScrolled) {
      isScrolled = true;
      bckColorElements.forEach(el => {
        el.style.transition = 'opacity 0.15s';
        el.style.opacity = '1';
      });
      if (bckElement) {
        bckElement.style.transition = 'opacity 0.5s';
        bckElement.style.opacity = '0';
        setTimeout(() => {
          bckElement.style.display = 'none';
        }, 500);
      }
    }
    
    if (scrollTop < 920 && isScrolled) {
      isScrolled = false;
      bckColorElements.forEach(el => {
        el.style.transition = 'opacity 0.2s';
        el.style.opacity = '0';
      });
      if (bckElement) {
        bckElement.style.display = 'block';
        bckElement.style.transition = 'opacity 0.2s';
        bckElement.style.opacity = '1';
      }
    }
  });

  // Automatic copyright year
  const year = new Date().getFullYear();
  const footerElements = document.querySelectorAll('footer article p, footer article p[title]');
  footerElements.forEach(el => {
    el.textContent = `©${year}, Hero-Log. All rights reserved.`;
  });
});