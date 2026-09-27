(function () {
  function moveNewsletterIntoBrand() {
    var newsletter = document.querySelector('.fb-footer > .fb-footer__newsletter');
    var brand = document.querySelector('.fb-footer__brand');

    if (!newsletter || !brand || newsletter.parentElement === brand) return;
    brand.appendChild(newsletter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveNewsletterIntoBrand);
  } else {
    moveNewsletterIntoBrand();
  }
})();
