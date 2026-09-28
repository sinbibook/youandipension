(function (global) {
  'use strict';

  function MainMapper() {
    BaseDataMapper.call(this);
  }
  MainMapper.prototype = Object.create(BaseDataMapper.prototype);
  MainMapper.prototype.constructor = MainMapper;

  var ABOUT_TITLE_FALLBACK = 'I support your beautiful trip.';

  function nl2br(s) {
    return String(s == null ? '' : s).replace(/\n/g, '<br>');
  }
  // 빈 값도 항상 반영 (백오피스에서 값 삭제 시 이전 값/기본 텍스트 잔존 방지)
  function setHtml(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.innerHTML = nl2br(val); });
  }
  function setBg(el, url) {
    if (!el) return;
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  }

  MainMapper.prototype.getMainSection = function () {
    var pages = this.getPages();
    return (pages.main && pages.main.sections && pages.main.sections[0]) || {};
  };

  MainMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapAboutInfo();
    this.mapAboutBlocks();
    this.refreshLoco();
  };

  // 동적 콘텐츠 주입 후 locomotive 높이 재계산 (footer까지 스크롤 보장)
  MainMapper.prototype.refreshLoco = function () {
    if (window.locoScroll && typeof window.locoScroll.update === 'function') {
      window.setTimeout(function () { window.locoScroll.update(); }, 300);
    }
  };

  // sub_visual ← customFields.pages.main.sections[0].hero.images[isSelected]
  MainMapper.prototype.mapHero = function () {
    var hero = this.getMainSection().hero || {};
    var wrapper = document.querySelector('[data-main-hero-slides]');
    if (!wrapper) return;

    var images = this.getSelectedImages(hero.images || []);
    var sig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === sig) return;
    wrapper.dataset.heroSig = sig;

    if (!images.length) {
      wrapper.innerHTML = '<div class="swiper-slide"></div>';
      var ph = wrapper.firstChild;
      ImageHelpers.applyBackgroundPlaceholder(ph);
      ph.style.backgroundSize = 'cover';
      ph.style.backgroundPosition = 'center';
    } else {
      wrapper.innerHTML = images.map(function (img) {
        return '<div class="swiper-slide" style="background:url(' + img.url + ') center;background-size:cover;"></div>';
      }).join('');
    }
    if (typeof window.initVisualSwiper === 'function') window.initVisualSwiper();
  };

  // about-wrap .info ← hero (텍스트=hero.description, 이미지 2칸=hero.images)
  MainMapper.prototype.mapAboutInfo = function () {
    var hero = this.getMainSection().hero || {};
    setHtml('[data-main-about-description]', hero.description);

    var container = document.querySelector('[data-main-about-images]');
    if (container) {
      var imgs = this.getSelectedImages(hero.images || []);
      var cells = container.querySelectorAll('li .img');
      cells.forEach(function (el, i) { setBg(el, imgs[i] && imgs[i].url); });
    }
  };

  // about-wrap ← about[] 개수만큼 .vimg 블록 동적 생성 (좌/우 모서리 교차)
  MainMapper.prototype.mapAboutBlocks = function () {
    var container = document.querySelector('[data-main-about-blocks]');
    if (!container) return;
    var about = this.getMainSection().about || [];
    var self = this;

    // 기존 .vimg 제거 후 재생성 (.info는 보존)
    container.querySelectorAll('.vimg').forEach(function (el) { el.parentNode.removeChild(el); });

    about.forEach(function (block, i) {
      block = block || {};
      var alt = (i % 2 === 1); // 짝수번째(2,4..) 블록은 좌상단 둥금
      var title = (block.title && String(block.title).trim()) ? block.title : ABOUT_TITLE_FALLBACK;
      var url = self.getFirstSelectedImage(block.images || []);

      var vimg = document.createElement('div');
      vimg.className = 'vimg' + (alt ? ' vimg-alt' : '');

      var h4 = document.createElement('h4');
      h4.className = 'fadeUp is-inview';
      h4.setAttribute('data-scroll', '');
      h4.textContent = title;

      var p = document.createElement('p');
      p.className = 'stit fadeUp is-inview';
      p.setAttribute('data-scroll', '');
      p.innerHTML = nl2br(block.description || '');

      var img = document.createElement('div');
      img.className = 'img fadeUp is-inview';
      img.setAttribute('data-scroll', '');
      img.style.backgroundRepeat = 'no-repeat';
      img.style.backgroundPosition = alt ? 'left top' : 'right top';
      img.style.backgroundSize = 'cover';
      if (url) img.style.backgroundImage = 'url(' + url + ')';
      else ImageHelpers.applyBackgroundPlaceholder(img);

      vimg.appendChild(h4);
      vimg.appendChild(p);
      vimg.appendChild(img);
      container.appendChild(vimg);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new MainMapper();
    mapper.initialize();
    global.mainMapperInstance = mapper;
  });

  global.MainMapper = MainMapper;
})(window);
