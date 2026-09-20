(function(){
  const KEY='fbAdvisorRecommendationsV2';
  const PEEK_KEY='fbPersonalWidgetPeekShownV1';
  const CACHE_TTL=30*60*1000;
  const isEnglish=document.documentElement.lang.toLowerCase().startsWith('en');
  const t=(turkish,english)=>isEnglish?english:turkish;
  function init(){
    const widgets=Array.from(document.querySelectorAll('[data-fb-personal-widget]'));
    if(!widgets.length)return;
    const root=widgets[widgets.length-1];
    widgets.slice(0,-1).forEach(widget=>{widget.hidden=true;widget.setAttribute('aria-hidden','true')});
    initWidget(root);
  }
  function initWidget(root){
    if(root.dataset.ready==='true')return;
    root.dataset.ready='true';
    try{
      if(sessionStorage.getItem(PEEK_KEY)==='1'){
        root.classList.add('has-peeked');
      }else{
        sessionStorage.setItem(PEEK_KEY,'1');
      }
    }catch(e){}
    const drawer=root.querySelector('.fb-personal-widget__drawer');
    const shade=root.querySelector('.fb-personal-widget__shade');
    const content=root.querySelector('[data-fb-widget-content]');
    const empty=root.querySelector('[data-fb-widget-empty]');
    const summary=root.querySelector('[data-fb-widget-summary]');
    let visible=[];
    let expiryTimer;
    let refreshTimer;
    let renderVersion=0;
    const hiddenBundles=new Map();
    const cartPage=/\/cart\/?$/.test(window.location.pathname);
    const main=document.querySelector('#MainContent, main');
    const observer=cartPage&&main?new MutationObserver(()=>{
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(render,50);
    }):null;
    function observe(){if(observer)observer.observe(main,{childList:true,subtree:true})}
    function hideBundle(bundle){
      if(!hiddenBundles.has(bundle))hiddenBundles.set(bundle,bundle.hidden);
      bundle.hidden=true;
    }
    function money(cents){return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2}).format(cents/100)}
    function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
    function state(){
      try{
        const saved=JSON.parse(localStorage.getItem(KEY)||'null');
        if(!saved||!Number.isFinite(Number(saved.savedAt))||Date.now()-Number(saved.savedAt)>=CACHE_TTL){
          localStorage.removeItem(KEY);
          return null;
        }
        return saved;
      }catch(e){
        try{localStorage.removeItem(KEY)}catch(ignore){}
        return null;
      }
    }
    function scheduleExpiry(saved){
      clearTimeout(expiryTimer);
      if(!saved)return;
      const remaining=CACHE_TTL-(Date.now()-Number(saved.savedAt));
      expiryTimer=setTimeout(()=>{
        // Re-read first: another tab may have saved newer recommendations.
        render();
      },Math.max(0,remaining));
    }
    function open(){root.classList.add('has-interacted','is-open');shade.hidden=false;drawer.setAttribute('aria-hidden','false');root.querySelector('[data-fb-widget-open]').setAttribute('aria-expanded','true');document.documentElement.classList.add('fb-widget-lock')}
    function close(){root.classList.remove('is-open');shade.hidden=true;drawer.setAttribute('aria-hidden','true');root.querySelector('[data-fb-widget-open]').setAttribute('aria-expanded','false');document.documentElement.classList.remove('fb-widget-lock')}
    function renderInlineRecommendations(saved){
      document.querySelectorAll('[data-fb-inline-recommendations]').forEach(old=>old.remove());
      hiddenBundles.forEach((hidden,bundle)=>{if(bundle.isConnected)bundle.hidden=hidden});
      hiddenBundles.clear();
      const url=new URL(window.location.href);
      const legacy=url.searchParams.getAll('filter.p.tag').some(tag=>tag.indexOf('wizard-')===0);
      const isProductPage=document.body.classList.contains('template-product')||/\/(?:[a-z]{2}\/)?products\//.test(window.location.pathname)||Boolean(document.querySelector('product-info'));
      const isCartPage=cartPage;
      if(!isProductPage&&!isCartPage&&url.searchParams.get('fb_advisor')!=='1'&&!legacy)return;
      if(!saved||!visible.length)return;
      const productGrid=isProductPage
        ? document.querySelector('main')
        : isCartPage
          ? (document.querySelector('.fb-cart__actions')||document.querySelector('cart-items .page-width')||document.querySelector('cart-items')||document.querySelector('[data-fb-cart-bundle]'))
        : document.querySelector('#product-grid, [data-id="product-grid"], .product-grid');
      if(!productGrid)return;
      const section=document.createElement('section');section.className='fb-inline-recommendations';section.setAttribute('data-fb-inline-recommendations','');
      const header=document.createElement('div');header.className='fb-inline-recommendations__header';
      header.innerHTML='<div><span>'+t("%20'ye varan indirimler için tümünü sepete ekleyin",'Add all to cart for up to 20% off')+'</span><h2>'+t('Seçimlerinize uygun ürünler','Products matching your choices')+'</h2><p>'+t('İhtiyacınıza uygun olarak seçtiğimiz ürünleri inceleyebilirsiniz.','Explore products selected for your needs.')+'</p></div>';
      const list=document.createElement('div');list.className='fb-inline-recommendations__list';
      visible.forEach(card=>{
        const item=document.createElement('article');item.className='fb-inline-recommendations__product';
        const image=card.querySelector('.fb-personal-widget__image img');
        const title=card.querySelector('.fb-personal-widget__info>a strong').textContent;
        const href=card.querySelector('.fb-personal-widget__image').getAttribute('href');
        item.innerHTML='<a class="fb-inline-recommendations__image" href="'+escapeHtml(href)+'">'+(image?image.outerHTML:'')+'</a><div><h3>'+escapeHtml(title)+'</h3><p>'+money(Number(card.dataset.fbWidgetBasePrice||0))+' TRY</p><a href="'+escapeHtml(href)+'">'+t('Ürünü İncele','View product')+'</a></div>';
        list.appendChild(item);
      });
      section.append(header,list);
      if(isProductPage){
        const productInfo=document.querySelector('product-info');
        const productSection=(productInfo&&productInfo.closest('.shopify-section'))||document.querySelector('main > .shopify-section');
        let reviews=document.querySelector('#reviews, #shopify-product-reviews, .product-reviews, .reviews-wrapper, .jdgm-widget, .spr-container, [data-reviews], section[id*="review" i]');
        if(reviews&&productSection&&productSection.contains(reviews))reviews=null;
        if(!reviews){
          const reviewText=Array.from(document.querySelectorAll('h1,h2,h3,h4,div,p')).find(function(el){return el.textContent.trim()==='Müşteri Değerlendirmeleri'});
          reviews=reviewText&& (reviewText.closest('.shopify-section')||reviewText.closest('section')||reviewText.parentElement);
        }
        if(reviews&&reviews.parentNode){
          reviews.parentNode.insertBefore(section,reviews);
        }else{
          if(productSection&&productSection.parentNode){
            productSection.parentNode.insertBefore(section,productSection.nextSibling);
          }else if(productGrid){
            productGrid.appendChild(section);
          }else{return;}
        }
        document.querySelectorAll('.fb-bundle[data-fb-product-recommendation]').forEach(hideBundle);
      }else if(isCartPage){
        // Mount in the cart column, even when Liquid rendered no static bundle.
        section.style.width='100%';
        section.style.maxWidth='none';
        section.style.margin='32px 0';
        section.style.boxSizing='border-box';
        if(productGrid.matches('.fb-cart__actions'))productGrid.after(section);
        else if(productGrid.matches('[data-fb-cart-bundle]'))productGrid.before(section);
        else productGrid.appendChild(section);
        document.querySelectorAll('[data-fb-cart-bundle]').forEach(hideBundle);
      }else{
        productGrid.parentNode.insertBefore(section,productGrid);
      }
    }
    async function cartProductHandles(){
      try{
        const response=await fetch('/cart.js',{headers:{Accept:'application/json'},credentials:'same-origin'});
        if(!response.ok)throw new Error('Cart request failed');
        const cart=await response.json();
        return new Set((cart.items||[]).map(item=>item.handle||item.product_handle).filter(Boolean));
      }catch(error){
        // Sepet bilgisi alınamazsa önerileri gizlemeyelim; normal liste gösterilsin.
        return new Set();
      }
    }
    async function render(){
      if(!root.isConnected){if(observer)observer.disconnect();clearTimeout(expiryTimer);return}
      if(observer)observer.disconnect();
      const version=++renderVersion;
      try{await renderContent(version)}finally{if(version===renderVersion)observe()}
    }
    async function renderContent(version){
      const saved=state();visible=[];const cards=Array.from(root.querySelectorAll('[data-fb-widget-product]'));cards.forEach(card=>card.hidden=true);
      scheduleExpiry(saved);
      if(!saved||!Array.isArray(saved.handles)||!saved.handles.length){empty.hidden=false;content.hidden=true;summary.textContent='';renderInlineRecommendations(null);return}
      const cartHandles=await cartProductHandles();
      if(version!==renderVersion)return;
      const recommendedHandles=Array.from(new Set(saved.handles));
      const excludedCount=recommendedHandles.filter(handle=>cartHandles.has(handle)).length;
      recommendedHandles.forEach(handle=>{
        // Sepette bulunan ürün tekrar tavsiye edilmez.
        if(cartHandles.has(handle))return;
        const card=cards.find(item=>item.dataset.fbWidgetProduct===handle);
        if(card){card.hidden=false;visible.push(card)}
      });
      empty.hidden=visible.length>0;content.hidden=visible.length===0;
      if(visible.length===0&&excludedCount){
        empty.querySelector('strong').textContent=t('Önerdiğimiz ürünler zaten sepetinizde.','The recommended products are already in your cart.');
        empty.querySelector('span').textContent=t('Sepetinizdeki ürünleri inceleyebilir veya seçimlerinizi değiştirebilirsiniz.','Review your cart or change your choices.');
      }else{
        empty.querySelector('strong').textContent=t('Henüz kişisel seçim oluşturmadınız.',"You haven't made a selection yet.");
        empty.querySelector('span').textContent=t('Kısa ürün bulucuyu tamamlayarak önerilerinizi hazırlayın.','Complete the quick product finder to get recommendations.');
      }
      const areaNames={general:'No specific area','foot-sole':'Sole of foot',toes:'Toes',heel:'Heel',back:'Lower back',ankle:'Ankle',calf:'Calf','upper-calf':'Upper leg',knee:'Knee',wrist:'Wrist',elbow:'Elbow',arm:'Arm'};
      const activityNames={running:'Running and walking',football:'Football','court-sports':'Court sports',fitness:'Fitness',cycling:'Cycling',outdoor:'Standing – all-day work'};
      const selectedLabel=isEnglish&&Array.isArray(saved.areas)?saved.areas.map(area=>areaNames[area]||area).join(' and '):(saved.label||'Seçimleriniz');
      const selectedActivity=isEnglish?activityNames[saved.activity]:(saved.activityLabel||'');
      summary.textContent=isEnglish?visible.length+' products recommended for '+(selectedLabel||'your choices')+(selectedActivity?' · '+selectedActivity:'')+'.':selectedLabel+(selectedActivity?' · '+selectedActivity:'')+' için '+visible.length+' ürün tavsiye ediyoruz.';
      renderInlineRecommendations(saved);
    }
    root.querySelector('[data-fb-widget-open]').addEventListener('click',()=>{render();open()});
    root.querySelectorAll('[data-fb-widget-close]').forEach(el=>el.addEventListener('click',close));
    root.querySelectorAll('[data-fb-widget-start]').forEach(el=>el.addEventListener('click',()=>{close();if(window.FBProductAdvisor)window.FBProductAdvisor.open()}));
    window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)render()});
    window.addEventListener('fb:recommendations-updated',render);
    window.addEventListener('pageshow',render);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('shopify:section:load',init);
})();
