(function () {
// Pure matching helper; region rules and activity-specific insoles are independent.
function resolveRecommendations(areas, rules, activity) {
  const order = ['foot-sole', 'toes', 'heel', 'ankle', 'calf', 'upper-calf', 'knee', 'wrist', 'elbow', 'arm', 'back'];
  const selected = Array.from(new Set(areas));
  if (!selected.length || selected.length > 2 || selected.some(function (area) { return !rules[area]; })) return [];
  selected.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
  const result = [];
  selected.forEach(function (area) {
    const handles = selected.length === 2 ? rules[area].slice(0, 1) : rules[area];
    handles.forEach(function (handle) {
      const existing = result.find(function (item) { return item.handle === handle; });
      if (existing) existing.areas.push(area);
      else result.push({ handle: handle, areas: [area] });
    });
  });
  const insoles = {
    running: 'quickfit-balance-ortopedik-tabanlik',
    football: 'quickfit-control-ortopedik-tabanlik',
    'court-sports': 'quickfit-balance-ortopedik-tabanlik',
    fitness: 'quickfit-balance-ortopedik-tabanlik',
    cycling: 'quickfit-control-ortopedik-tabanlik',
    outdoor: 'quickfit-balance-ortopedik-tabanlik'
  };
  if (Object.prototype.hasOwnProperty.call(insoles, activity)) {
    result.push({ handle: insoles[activity], areas: [], kind: 'insole' });
  }
  return result;
}
function initAdvisor(advisor) {
  if (!advisor || advisor.dataset.initialized === 'true') return;
  advisor.dataset.initialized = 'true';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const t = (turkish, english) => isEnglish ? english : turkish;

  if (document.getElementById('PBarNextFrame')) {
  advisor.classList.add('has-shopify-preview-bar');
}

  const closeButton = advisor.querySelector(
    '.fb-product-advisor__close'
  );
  const overlay = advisor.querySelector(
    '.fb-product-advisor__overlay'
  );

  const purposeCards = advisor.querySelectorAll('[data-purpose]');
  const areaCards = advisor.querySelectorAll('[data-area]');
  const timeCards = advisor.querySelectorAll('[data-usage-time]');
  const activityCards = advisor.querySelectorAll('[data-activity]');

  const areaNote = advisor.querySelector(
    '.fb-product-advisor__area-note'
  );

  const stepPanels = advisor.querySelectorAll(
    '[data-advisor-step]'
  );
  const stepIndicators = advisor.querySelectorAll(
    '[data-step-indicator]'
  );
  const activityIndicators = advisor.querySelectorAll(
    '[data-activity-indicator]'
  );

  const backButton = advisor.querySelector(
    '[data-advisor-back]'
  );
  const nextButton = advisor.querySelector(
    '[data-advisor-next]'
  );

  const resultsPanel = advisor.querySelector(
  '[data-advisor-results]'
);
const restartButton = advisor.querySelector(
  '[data-advisor-restart]'
);
const stepsContainer = advisor.querySelector(
  '.fb-product-advisor__steps'
);
const footer = advisor.querySelector(
  '.fb-product-advisor__footer'
);
const body = advisor.querySelector(
  '.fb-product-advisor__body'
);
const eyebrow = advisor.querySelector(
  '.fb-product-advisor__eyebrow'
);
const title = advisor.querySelector(
  '.fb-product-advisor__title'
);
const subtitle = advisor.querySelector(
  '.fb-product-advisor__subtitle'
);
const detailProgress = advisor.querySelector(
  '[data-advisor-step="2"] .fb-product-advisor__small-title'
);

  const resultGrid = advisor.querySelector('[data-result-grid]');
  const resultNotice = advisor.querySelector('[data-result-notice]');
  const packageBox = advisor.querySelector('[data-advisor-package]');
  const packageProducts = advisor.querySelector('[data-package-products]');
  const packageButton = advisor.querySelector('[data-package-add]');
  const packageStatus = advisor.querySelector('[data-package-status]');
  const editButton = advisor.querySelector('[data-advisor-edit]');
  const originalHeading = { eyebrow: eyebrow.textContent.trim(), title: title.textContent.trim(), subtitle: subtitle.textContent.trim() };
  // Amaç, zaman ve aktivite anatomik ürün sırasını değiştirmez.
  // İki Bölge: her bölgenin ilk önerisi; tabanlık ayrıca aktiviteye göre eklenir.
  const singleAreaProducts = {
    'foot-sole': ['plantar-fasiit-corabi'],
    toes: ['basparmak-bunyon-koruma-corabi', 'halluks-valgus-basparmak-ateli'],
    heel: ['plantar-fasiit-corabi', 'wp4-diyabet-saglik-corabi'],
    back: ['seyahat-corabi'],
    ankle: ['af7-ayak-bilek-destegi'],
    calf: ['cs6-kalf-koruyucu', 'kompresyon-corabi'],
    'upper-calf': ['quadriceps-ust-bacak-destegi'],
    knee: ['os1st-ks7-diz-koruyucu-destek'],
    wrist: ['el-bilek-destegi'],
    elbow: ['tenisci-golfcu-dirsegi-destegi', 'epikondilit-dirsek-destegi'],
    arm: ['kol-destegi', 'tenisci-golfcu-dirsegi-destegi']
  };
  let isShowingResults = false;
  let purposeTimer;
  let preparingTimers = [];
  let previousBodyOverflow = '';
  let opener = null;
  let currentStep = 0;
  let selectedPurpose = null;
  let selectedAreas = [];
  let selectedUsageTime = null;
  let selectedActivity = null;

  function needsActivityStep() {
    return true; // Her kullanım amacı için aktiviteye bağlı tabanlık seçilir.
  }

  function formatPackageMoney(cents) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  function getPackageSelection(card) {
    const form = card.querySelector('.fb-product-advisor__product-form');
    const idField = form && form.querySelector('[name="id"]');
    const select = form && form.querySelector('[data-result-variant]');
    const selectedOption = select && select.selectedOptions[0];
    const variantId = idField && idField.value;
    const priceCents = selectedOption && selectedOption.value
      ? Number(selectedOption.dataset.priceCents)
      : Number(card.dataset.basePriceCents);
    return {
      card: card,
      id: variantId,
      ready: Boolean(variantId) && (!select || Boolean(selectedOption && selectedOption.value && !selectedOption.disabled)),
      priceCents: Number.isFinite(priceCents) ? priceCents : 0
    };
  }

  function syncPackage() {
    if (!packageBox || !packageProducts || !packageButton) return;
    const cards = Array.from(resultGrid.querySelectorAll('.fb-product-advisor__result-card'));
    if (cards.length < 2) {
      packageBox.hidden = true;
      return;
    }
    packageBox.hidden = false;
    packageProducts.replaceChildren();
    packageProducts.classList.toggle('is-two-products', cards.length === 2);
    packageProducts.classList.toggle('is-three-products', cards.length === 3);
    const countNode = packageBox.querySelector('[data-package-count]');
    if (countNode) countNode.textContent = cards.length;

    const selections = cards.map(getPackageSelection);
    selections.forEach(function (selection) {
      const card = selection.card;
      const row = document.createElement('div');
      row.className = 'fb-advisor-demo-package__product';
      const imageWrap = document.createElement('div');
      imageWrap.className = 'fb-advisor-demo-package__image';
      const sourceImage = card.querySelector('.fb-product-advisor__result-image img');
      if (sourceImage) {
        const image = document.createElement('img');
        image.src = sourceImage.currentSrc || sourceImage.src;
        image.alt = sourceImage.alt;
        image.width = 80;
        image.height = 90;
        imageWrap.appendChild(image);
      }
      const name = document.createElement('strong');
      name.textContent = card.querySelector('.fb-product-advisor__result-name').textContent.trim();
      const price = document.createElement('span');
      price.textContent = formatPackageMoney(selection.priceCents) + ' TRY';
      row.append(imageWrap, name, price);
      packageProducts.appendChild(row);
    });

    const original = selections.reduce(function (sum, item) { return sum + item.priceCents; }, 0);
    const discounted = Math.round(original * 0.85);
    const originalNode = packageBox.querySelector('[data-package-original]');
    const discountedNode = packageBox.querySelector('[data-package-discounted]');
    const savingNode = packageBox.querySelector('[data-package-saving]');
    if (originalNode) originalNode.textContent = formatPackageMoney(original);
    if (discountedNode) discountedNode.textContent = formatPackageMoney(discounted);
    if (savingNode) savingNode.textContent = formatPackageMoney(original - discounted);

    const ready = selections.every(function (item) { return item.ready; });
    packageButton.disabled = !ready;
    packageButton.textContent = ready ? t('Paketi Sepete Ekle →', 'Add bundle to cart →') : t('Önce tüm seçenekleri seç', 'Choose all options first');
    if (packageStatus) {
      packageStatus.textContent = ready
        ? t('Paket hazır. Tüm ürünler tek seferde sepete eklenecek.', 'Your bundle is ready. All products will be added to the cart together.')
        : t('Paket için yukarıdaki ürünlerin renk ve beden seçeneklerini tamamla.', 'Choose the color and size for each product above.');
    }
  }

  async function addPackageToCart() {
    if (!packageButton || packageButton.disabled || packageButton.dataset.pending === 'true') return;
    const selections = Array.from(resultGrid.querySelectorAll('.fb-product-advisor__result-card')).map(getPackageSelection);
    if (selections.length < 2 || selections.some(function (item) { return !item.ready; })) {
      syncPackage();
      return;
    }
    packageButton.dataset.pending = 'true';
    packageButton.disabled = true;
    packageButton.textContent = 'Paket ekleniyor…';
    if (packageStatus) packageStatus.textContent = '';
    try {
      const root = window.Shopify && window.Shopify.routes && window.Shopify.routes.root || '/';
      const response = await fetch(root + 'cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: selections.map(function (item) {
            return {
              id: Number(item.id),
              quantity: 1,
              properties: { '_FootBalance Wizard Paketi': 'WIZARD15' }
            };
          })
        })
      });
      const payload = await response.json();
      if (!response.ok || payload.status >= 400) throw new Error(payload.description || 'Paket sepete eklenemedi.');
      packageButton.textContent = '✓ Paket sepete eklendi';
      if (packageStatus) packageStatus.textContent = t('%15 indirim uygulanarak sepete yönlendiriliyorsun…', 'Your 15% discount is being applied. Redirecting to your cart…');
      const code = packageBox.dataset.discountCode || 'WIZARD15';
      window.location.assign('/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent('/cart'));
    } catch (error) {
      packageButton.dataset.pending = 'false';
      packageButton.disabled = false;
      packageButton.textContent = 'Paketi Sepete Ekle →';
      if (packageStatus) packageStatus.textContent = error && error.message ? error.message : t('Paket eklenemedi. Lütfen tekrar dene.', 'The bundle could not be added. Please try again.');
    }
  }

  if (packageButton) packageButton.addEventListener('click', addPackageToCart);

  window.FBProductAdvisor = {
    snapshot: function () {
      return {
        step: currentStep,
        purpose: selectedPurpose,
        areas: selectedAreas.slice(),
        usageTime: selectedUsageTime,
        activity: selectedActivity
      };
    },

    restore: function (saved) {
      if (!saved || typeof saved !== 'object') return;
      clearTimeout(purposeTimer);
      selectedPurpose = saved.purpose || null;
      selectedAreas = Array.isArray(saved.areas) ? saved.areas.slice(0, 2) : [];
      selectedUsageTime = saved.usageTime || null;
      selectedActivity = saved.activity || null;
      purposeCards.forEach(function (card) {
        const active = card.dataset.purpose === selectedPurpose;
        card.classList.toggle('is-selected', active);
        card.setAttribute('aria-pressed', String(active));
      });
      if (selectedPurpose) advisor.dataset.selectedPurpose = selectedPurpose;
      updateAreaSelection();
      updateTimeSelection();
      updateActivitySelection();
      updateActivityStepVisibility();
      goToStep(Math.max(0, Math.min(3, Number(saved.step) || 0)));
    },

    open: function () {
      if (!advisor.hidden) return;
      opener = document.activeElement;
      previousBodyOverflow = document.body.style.overflow;
      advisor.classList.toggle('has-shopify-preview-bar', Boolean(document.getElementById('PBarNextFrame')));
      advisor.hidden = false;
      document.body.style.overflow = 'hidden';
      if (!isShowingResults) goToStep(currentStep);
      if (closeButton) closeButton.focus({ preventScroll: true });
    },

    close: function () {
      clearTimeout(purposeTimer);
      if (advisor.dataset.preparing === 'true') restartAdvisor();
      advisor.hidden = true;
      document.body.style.overflow = previousBodyOverflow;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
  };

function updateFooter() {
  if (backButton) {
    backButton.style.visibility =
      currentStep === 0 ? 'hidden' : 'visible';
  }

  if (!nextButton) return;

  if (currentStep === 0) {
    nextButton.style.display = 'none';
    return;
  }

  nextButton.style.display = 'inline-flex';

  if (currentStep === 1) {
    const canContinue = selectedAreas.length > 0;

    nextButton.disabled = !canContinue;
    nextButton.style.visibility =
      canContinue ? 'visible' : 'hidden';

    nextButton.innerHTML =
      t('Devam et', 'Continue') + ' <span aria-hidden="true">›</span>';
  }

  if (currentStep === 2) {
    const canContinue = Boolean(selectedUsageTime);

    nextButton.disabled = !canContinue;
    nextButton.style.visibility =
      canContinue ? 'visible' : 'hidden';

    nextButton.innerHTML = needsActivityStep()
      ? t('Devam et', 'Continue') + ' <span aria-hidden="true">›</span>'
      : t('Önerilerimi Gör', 'See my recommendations') + ' <span aria-hidden="true">›</span>';
  }

  if (currentStep === 3) {
    const canContinue = Boolean(selectedActivity);

    nextButton.disabled = !canContinue;
    nextButton.style.visibility =
      canContinue ? 'visible' : 'hidden';

    nextButton.innerHTML =
      t('Önerilerimi Gör', 'See my recommendations') + ' <span aria-hidden="true">›</span>';
  }
}

function updateActivityStepVisibility() {
  const shouldShow = needsActivityStep();

  activityIndicators.forEach(function (element) {
    element.hidden = !shouldShow;
  });

  stepPanels.forEach(function (panel) {
    const progress = panel.querySelector('.fb-product-advisor__small-title');
    const index = Number(panel.dataset.advisorStep);
    const names = isEnglish ? ['USE', 'SUPPORT', 'DETAILS', 'ACTIVITY'] : ['KULLANIM', 'DESTEK', 'DETAY', 'AKTİVİTE'];
    if (progress) progress.textContent = (index + 1) + ' / ' + (shouldShow ? 4 : 3) + ' · ' + names[index];
  });
  if (detailProgress) {
    detailProgress.textContent = shouldShow
      ? t('3 / 4 · DETAY', '3 / 4 · DETAILS')
      : t('3 / 3 · DETAY', '3 / 3 · DETAILS');
  }
}

  function goToStep(stepIndex) {
    isShowingResults = false;
    advisor.classList.remove('has-results');
    if (resultsPanel) resultsPanel.hidden = true;
    if (stepsContainer) stepsContainer.style.display = '';
    if (footer) footer.style.display = '';
    eyebrow.textContent = originalHeading.eyebrow;
    title.textContent = originalHeading.title;
    subtitle.textContent = originalHeading.subtitle;
    currentStep = stepIndex;

    stepPanels.forEach(function (panel) {
      panel.classList.toggle(
        'is-active',
        Number(panel.dataset.advisorStep) === stepIndex
      );
    });

    stepIndicators.forEach(function (indicator) {
      indicator.classList.toggle(
        'is-active',
        Number(indicator.dataset.stepIndicator) === stepIndex
      );
    });

    updateActivityStepVisibility();
    updateFooter();
    if (body) body.scrollTop = 0;
  }

  function updateAreaSelection() {
    areaCards.forEach(function (card) {
      const isSelected = selectedAreas.includes(
        card.dataset.area
      );

      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });

    if (areaNote) {
      areaNote.textContent =
        t('En fazla 2 bölge seçebilirsin. (', 'You can select up to 2 areas. (') +
        selectedAreas.length +
        '/2)';
    }

    advisor.dataset.selectedAreas = selectedAreas.join(',');
    updateFooter();
  }

  function updateTimeSelection() {
    timeCards.forEach(function (card) {
      const isSelected =
        card.dataset.usageTime === selectedUsageTime;

      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });

    if (selectedUsageTime) {
      advisor.dataset.selectedUsageTime = selectedUsageTime;
    } else {
      delete advisor.dataset.selectedUsageTime;
    }

    updateFooter();
  }

  function updateActivitySelection() {
    activityCards.forEach(function (card) {
      const isSelected =
        card.dataset.activity === selectedActivity;

      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });

    if (selectedActivity) {
      advisor.dataset.selectedActivity = selectedActivity;
    } else {
      delete advisor.dataset.selectedActivity;
    }

    updateFooter();
  }

  function showPreparing(destination, productCount) {
    if (advisor.dataset.preparing === 'true') return;
    advisor.dataset.preparing = 'true';
    isShowingResults = false;

    stepPanels.forEach(function (panel) { panel.classList.remove('is-active'); });
    if (resultsPanel) resultsPanel.hidden = true;
    if (stepsContainer) stepsContainer.style.display = 'none';
    if (footer) footer.style.display = 'none';

    advisor.classList.remove('has-results');
    advisor.classList.add('is-preparing');
    eyebrow.textContent = t('KİŞİSEL ÖNERİLERİN', 'YOUR PERSONAL RECOMMENDATIONS');
    title.textContent = t('Tavsiyeleriniz hazırlanıyor', 'Preparing your recommendations');
    subtitle.textContent = t('Seçimlerinize en uygun ürünleri belirliyoruz.', 'Finding the best products for your choices.');

    let preparing = body.querySelector('[data-advisor-preparing]');
    if (!preparing) {
      preparing = document.createElement('div');
      preparing.className = 'fb-product-advisor__preparing';
      preparing.setAttribute('data-advisor-preparing', '');
      preparing.setAttribute('role', 'status');
      preparing.setAttribute('aria-live', 'polite');
      preparing.innerHTML =
        '<div class="fb-product-advisor__preparing-icon" aria-hidden="true">' +
          '<span class="fb-product-advisor__preparing-spinner"></span>' +
          '<svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.4 3.4 7.6-8"/></svg>' +
        '</div>' +
        '<strong>' + t('Önerileriniz eşleştiriliyor', 'Matching your recommendations') + '</strong>' +
          '<span data-preparing-copy>' + productCount + t(' ürünlük tavsiye listeniz oluşturuluyor.', ' recommended products are being prepared.') + '</span>' +
        '<div class="fb-product-advisor__preparing-track"><i></i></div>';
      body.appendChild(preparing);
    }
    preparing.hidden = false;

    preparingTimers.push(window.setTimeout(function () {
      preparing.classList.add('is-complete');
      const copy = preparing.querySelector('[data-preparing-copy]');
      if (copy) copy.textContent = t('Tavsiyeleriniz hazır! Ürünlere yönlendiriliyorsunuz.', 'Your recommendations are ready! Redirecting to products.');
    }, 1050));

    preparingTimers.push(window.setTimeout(function () {
      window.location.assign(destination);
    }, 1800));
  }

  function showResults() {
    if (!resultGrid || !resultsPanel) return;
    isShowingResults = true;
    stepPanels.forEach(function (panel) { panel.classList.remove('is-active'); });
    resultsPanel.hidden = false;
    stepsContainer.style.display = 'none';
    footer.style.display = 'none';
    advisor.classList.add('has-results');
    eyebrow.textContent = t('KİŞİSEL ÖNERİLERİN', 'YOUR PERSONAL RECOMMENDATIONS');
    resultGrid.replaceChildren();
    const insoleSection = advisor.querySelector('[data-insole-section]');
    const insoleGrid = advisor.querySelector('[data-insole-grid]');
    if (insoleGrid) insoleGrid.replaceChildren();
    if (insoleSection) insoleSection.hidden = true;
    resultNotice.hidden = true;
    resultNotice.textContent = '';
    resultGrid.classList.remove('is-single-result', 'is-three-results');

    const area = selectedAreas[0];
    function areaLabel(key) {
      const areaCard = Array.from(areaCards).find(function (card) { return card.dataset.area === key; });
      return areaCard ? areaCard.querySelector('strong').textContent.trim() : '';
    }
    const recommendations = resolveRecommendations(selectedAreas, singleAreaProducts, selectedActivity);
    const activityCard = Array.from(activityCards).find(function (card) { return card.dataset.activity === selectedActivity; });
    const activityLabel = activityCard ? activityCard.querySelector('strong').textContent.trim() : '';
    const label = selectedAreas.map(areaLabel).join(t(' ve ', ' and '));
    if (recommendations.length) {
      const recommendationState = {
        version: 2,
        handles: recommendations.map(function (item) { return item.handle; }),
        purpose: selectedPurpose,
        areas: selectedAreas.slice(),
        usageTime: selectedUsageTime,
        activity: selectedActivity,
        label: label,
        activityLabel: activityLabel,
        savedAt: Date.now()
      };

      try {
        localStorage.setItem('fbAdvisorRecommendationsV2', JSON.stringify(recommendationState));
        window.dispatchEvent(new Event('fb:recommendations-updated'));
      } catch (storageError) {
        /* Sonuç yönlendirmesi depolama kapalı olsa da çalışır. */
      }

      const resultsUrl = new URL(advisor.dataset.allProductsUrl || '/collections/all', window.location.origin);
      resultsUrl.searchParams.set('fb_advisor', '1');
      resultsUrl.searchParams.set('sort_by', 'manual');
      showPreparing(resultsUrl.href, recommendationState.handles.length);
      return;
    }
    if (!recommendations.length) {
      title.textContent = t('Seçimini aldık', 'We have your selection');
      if (area === 'general') {
        subtitle.textContent = t('Bölgesel destek ihtiyacı belirtmedin.', 'You did not select a support area.');
        resultNotice.textContent = t('Bu seçim için henüz ürün önerisi tanımlanmadı. Dilersen bir destek bölgesi seçebilirsin.', 'No products are available for this selection yet. You can choose a support area.');
      } else {
        subtitle.textContent = t('Bu bölge için henüz ürün eşleştirmesi bulunmuyor.', 'No products match this area yet.');
        resultNotice.textContent = t('Farklı bir destek bölgesi seçebilirsin.', 'You can choose a different support area.');
      }
      resultNotice.hidden = false;
    } else {
      let count = 0;
      recommendations.forEach(function (recommendation, index) {
        const handle = recommendation.handle;
        const template = advisor.querySelector('template[data-advisor-product="' + handle + '"]');
        if (!template) return;
        const card = template.content.firstElementChild.cloneNode(true);
        card.dataset.productHandle = handle;
        card.querySelector('[data-result-badge]').textContent = recommendation.kind === 'insole' ? t('AKTİVİTENE GÖRE TABANLIK', 'INSOLE FOR YOUR ACTIVITY') : selectedAreas.length === 2
          ? t('BÖLGEYE GÖRE ÖNERİ', 'RECOMMENDED FOR YOUR AREA') : (index === 0 ? t('ÖNCELİKLİ ÖNERİ', 'TOP RECOMMENDATION') : t('İKİNCİ ÖNERİ', 'SECOND RECOMMENDATION'));
        const fallbackReason = card.querySelector('[data-result-reason]');
        if (fallbackReason) {
          fallbackReason.textContent = (recommendation.kind === 'insole' ? activityLabel : recommendation.areas.map(areaLabel).join(t(' ve ', ' and '))) + t(' seçimine göre listelenmiştir.', ' has been selected based on your choice.');
        }
        const variantSelect = card.querySelector('[data-result-variant]');
        if (variantSelect) {
          variantSelect.addEventListener('change', function () {
            const option = variantSelect.selectedOptions[0];
            if (!option || !option.value || option.disabled) return;
            card.querySelector('[data-price-amount]').textContent = option.dataset.price;
            const fromLabel = card.querySelector('[data-price-from]');
            if (fromLabel) fromLabel.hidden = true;
            const link = card.querySelector('.fb-product-advisor__result-primary');
            const url = new URL(link.href, window.location.href);
            url.searchParams.set('variant', option.value);
            link.href = url.href;
            syncPackage();
          });
        }
        bindAjaxCart(card);
        if (recommendation.kind === 'insole') {
          const reasonHeading = card.querySelector('.fb-product-advisor__result-reasons > strong');
          if (reasonHeading && card.querySelector('[data-result-reason]')) reasonHeading.textContent = t('Seçtiğin aktivite için', 'For your chosen activity');
        }
        resultGrid.appendChild(card);
        count += 1;
      });
      title.textContent = count ? t('Seçtiğin bölge için önerilerimiz', 'Recommendations for your selected area') : t('Ürünler şu anda görüntülenemiyor', 'Products are unavailable right now');
      subtitle.textContent = count ? (isEnglish ? count + ' products for ' + label + (activityLabel ? ' and ' + activityLabel : '') + '.' : label + (activityLabel ? ' ve ' + activityLabel + ' seçimine göre ' : ' için ') + count + ' ürün listeleniyor.') : t('Lütfen daha sonra tekrar dene.', 'Please try again later.');
      resultGrid.classList.toggle('is-single-result', count === 1);
      resultGrid.classList.toggle('is-three-results', count === 3);
      syncPackage();
      if (count !== recommendations.length) {
        resultNotice.textContent = count ? t('Önerilen ürünlerin bir kısmı şu anda mağazada görüntülenemiyor.', 'Some recommended products are unavailable in the store right now.') : t('Bu bölgeye bağlı ürünler şu anda mağazada görüntülenemiyor.', 'Products for this area are unavailable in the store right now.');
        resultNotice.hidden = false;
      }
    }
    if (body) body.scrollTop = 0;
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }

function bindAjaxCart(card) {
  const form = card.querySelector('.fb-product-advisor__product-form');
  const button = form && form.querySelector('button[type="submit"]');
  const status = form && form.querySelector('[data-cart-status]');
  const select = form && form.querySelector('[data-result-variant]');
  if (!button || !status || button.disabled) return;
  let pending = false;
  let added = false;
  if (select) select.addEventListener('change', function () {
    if (pending) return;
    added = false;
    button.disabled = false;
    button.textContent = t('Sepete Ekle', 'Add to cart');
    status.textContent = '';
  });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (pending || added || button.disabled || !form.reportValidity()) return;
    const data = new FormData(form);
    if (!data.get('id')) return;
    pending = true;
    button.disabled = true;
    button.textContent = t('Ekleniyor…', 'Adding…');
    status.textContent = '';
    form.setAttribute('aria-busy', 'true');
    if (select) select.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      const url = new URL(form.action, window.location.href);
      url.pathname = url.pathname.replace(/\/$/, '').replace(/(?:\.js)?$/, '.js');
      const response = await fetch(url.href, {
        method: 'POST', body: data, credentials: 'same-origin',
        headers: { Accept: 'application/json' }, signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok || payload.status >= 400) {
        button.disabled = false;
        button.textContent = t('Sepete Ekle', 'Add to cart');
        status.textContent = typeof payload.description === 'string'
          ? payload.description : t('Ürün eklenemedi. Seçeneği ve stok durumunu kontrol et.', 'The product could not be added. Check the option and stock status.');
        return;
      }
      added = true;
      button.textContent = t('✓ Sepete eklendi', '✓ Added to cart');
      status.textContent = t('Seçtiğin ürün sepete eklendi. Diğer öneriyi de ekleyebilirsin.', 'The product was added to your cart. You can add another recommendation.');
    } catch (error) {
      // Yanıt kaybolduysa istek yine de işlenmiş olabilir; otomatik tekrar yok.
      button.textContent = t('Sepetini kontrol et', 'Check your cart');
      status.textContent = t('İşlem sonucu doğrulanamadı. Tekrar eklemeden önce aşağıdaki bağlantıdan sepetini kontrol et.', 'The result could not be confirmed. Check your cart using the link below before trying again.');
    } finally {
      clearTimeout(timeout);
      pending = false;
      form.removeAttribute('aria-busy');
      if (select) select.disabled = false;
    }
  });
}

function restartAdvisor() {
  clearTimeout(purposeTimer);
  preparingTimers.forEach(function (timer) { clearTimeout(timer); });
  preparingTimers = [];
  currentStep = 0;
  selectedPurpose = null;
  selectedAreas = [];
  selectedUsageTime = null;
  selectedActivity = null;
  delete advisor.dataset.preparing;
  advisor.classList.remove('is-preparing');
  const preparing = body && body.querySelector('[data-advisor-preparing]');
  if (preparing) preparing.remove();

  delete advisor.dataset.selectedPurpose;
  delete advisor.dataset.selectedAreas;
  delete advisor.dataset.selectedUsageTime;
  delete advisor.dataset.selectedActivity;

  purposeCards.forEach(function (card) {
    card.classList.remove('is-selected');
    card.setAttribute('aria-pressed', 'false');
  });

  if (resultsPanel) {
    resultsPanel.hidden = true;
  }

  if (stepsContainer) {
    stepsContainer.style.display = '';
  }

  if (footer) {
    footer.style.display = '';
  }

  if (eyebrow) {
    eyebrow.textContent = t('KİŞİSEL ÜRÜN ÖNERİSİ', 'PERSONAL PRODUCT RECOMMENDATIONS');
  }

  if (title) {
    title.textContent = t('Sana uygun desteği bulalım', "Let's find the right support for you");
  }

  if (subtitle) {
    subtitle.textContent =
      t('Birkaç kısa soruyla sana en uygun ürünleri önerelim.', 'Answer a few quick questions to find the best products for you.');
  }

  advisor.classList.remove('has-results');

  updateAreaSelection();
  updateTimeSelection();
  updateActivitySelection();
  updateActivityStepVisibility();
  goToStep(0);

  if (body) {
    body.scrollTop = 0;
  }
}

  if (closeButton) {
    closeButton.addEventListener('click', function () {
      window.FBProductAdvisor.close();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      window.FBProductAdvisor.close();
    });
  }

  document
    .querySelectorAll('a[href$="#fb-product-advisor"], [data-fb-advisor-open]')
    .forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        window.FBProductAdvisor.open();
      });
    });

  purposeCards.forEach(function (card) {
    card.setAttribute('aria-pressed', 'false');

    card.addEventListener('click', function () {
      purposeCards.forEach(function (item) {
        item.classList.remove('is-selected');
        item.setAttribute('aria-pressed', 'false');
      });

      card.classList.add('is-selected');
      card.setAttribute('aria-pressed', 'true');

      selectedPurpose = card.dataset.purpose;
      selectedUsageTime = null;
      selectedActivity = null;

      advisor.dataset.selectedPurpose = selectedPurpose;

      updateTimeSelection();
      updateActivitySelection();
      updateActivityStepVisibility();

      clearTimeout(purposeTimer);
      purposeTimer = setTimeout(function () {
        if (!advisor.hidden) goToStep(1);
      }, 300);
    });
  });

  areaCards.forEach(function (card) {
    card.setAttribute('aria-pressed', 'false');

    card.addEventListener('click', function () {
      const area = card.dataset.area;
      const isNoneOption = area === 'general';
      const isAlreadySelected = selectedAreas.includes(area);

      if (isAlreadySelected) {
        selectedAreas = selectedAreas.filter(function (item) {
          return item !== area;
        });

        updateAreaSelection();
        return;
      }

      if (isNoneOption) {
        selectedAreas = ['general'];
        updateAreaSelection();
        return;
      }

      selectedAreas = selectedAreas.filter(function (item) {
        return item !== 'general';
      });

      if (selectedAreas.length >= 2) return;

      selectedAreas.push(area);
      updateAreaSelection();
    });
  });

  timeCards.forEach(function (card) {
    card.setAttribute('aria-pressed', 'false');

    card.addEventListener('click', function () {
      selectedUsageTime = card.dataset.usageTime;
      updateTimeSelection();
    });
  });

  activityCards.forEach(function (card) {
    card.setAttribute('aria-pressed', 'false');

    card.addEventListener('click', function () {
      selectedActivity = card.dataset.activity;
      updateActivitySelection();
    });
  });

if (nextButton) {
  nextButton.addEventListener('click', function () {
    if (
      currentStep === 1 &&
      selectedAreas.length > 0
    ) {
      goToStep(2);
      return;
    }

    if (
      currentStep === 2 &&
      selectedUsageTime &&
      needsActivityStep()
    ) {
      goToStep(3);
      return;
    }

    if (
      currentStep === 2 &&
      selectedUsageTime &&
      !needsActivityStep()
    ) {
      showResults();
      return;
    }

    if (
      currentStep === 3 &&
      selectedActivity
    ) {
      showResults();
    }
  });
}
if (editButton) {
  editButton.addEventListener('click', function () { goToStep(1); });
}
if (restartButton) {
  restartButton.addEventListener('click', function () {
    restartAdvisor();
  });
}

  if (backButton) {
    backButton.addEventListener('click', function () {
      if (currentStep > 0) {
        goToStep(currentStep - 1);
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !advisor.hidden) {
      window.FBProductAdvisor.close();
    }
  });

  updateAreaSelection();
  updateTimeSelection();
  updateActivitySelection();
  updateActivityStepVisibility();
  goToStep(0);
}
function initAllAdvisors() {
  document.querySelectorAll('.fb-product-advisor').forEach(initAdvisor);
  if (window.location.hash === '#fb-product-advisor' && window.FBProductAdvisor) {
    window.FBProductAdvisor.open();
  }
}
document.addEventListener('click', function (event) {
  const trigger = event.target.closest && event.target.closest('a[href$="#fb-product-advisor"], [data-fb-advisor-open]');
  if (!trigger) return;
  event.preventDefault();
  if (window.FBProductAdvisor) window.FBProductAdvisor.open();
}, true);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAllAdvisors);
else initAllAdvisors();
document.addEventListener('shopify:section:load', initAllAdvisors);
})();
