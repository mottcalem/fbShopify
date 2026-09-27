(function () {
  function moveNewsletterIntoBrand() {
    var newsletter = document.querySelector('.fb-footer > .fb-footer__newsletter');
    var brand = document.querySelector('.fb-footer__brand');

    if (!newsletter || !brand || newsletter.parentElement === brand) return;
    brand.appendChild(newsletter);

    if (!document.documentElement.lang.toLowerCase().startsWith('en')) {
      var heading = newsletter.querySelector('.fb-footer__newsletter-copy h2');
      if (heading) heading.textContent = '%5 indirim alın!';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveNewsletterIntoBrand);
  } else {
    moveNewsletterIntoBrand();
  }
})();
