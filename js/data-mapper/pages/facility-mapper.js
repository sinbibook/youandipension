(function (global) {
  'use strict';

  function FacilityMapper() {
    BaseDataMapper.call(this);
  }
  FacilityMapper.prototype = Object.create(BaseDataMapper.prototype);
  FacilityMapper.prototype.constructor = FacilityMapper;

  function nl2br(s) { return String(s == null ? '' : s).replace(/\n/g, '<br>'); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad2(n) { return ('0' + n).slice(-2); }
  function setText(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = (val == null ? '' : val); });
  }
  function setHtml(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.innerHTML = nl2br(val); });
  }
  function setBg(el, url) {
    if (!el) return;
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  }

  FacilityMapper.prototype.getFacilities = function () {
    return this.getProperty().facilities || [];
  };

  // MAPPER: customFields.pages.facility[현재 id].sections[0].hero.title
  FacilityMapper.prototype.getHeroTitle = function (f) {
    if (!f) return '';
    var list = this.getPages().facility;
    if (!Array.isArray(list)) return '';
    var entry = list.filter(function (p) { return String(p.id) === String(f.id); })[0];
    var hero = entry && entry.sections && entry.sections[0] && entry.sections[0].hero;
    return (hero && hero.title) ? hero.title : '';
  };

  // ?id={facility.id} 로 현재 시설 결정 (없으면 첫 시설)
  FacilityMapper.prototype.getCurrent = function (facilities) {
    var id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      var found = facilities.filter(function (f) { return String(f.id) === String(id); })[0];
      if (found) return found;
    }
    return facilities[0] || null;
  };

  FacilityMapper.prototype.mapPage = function () {
    var facilities = this.getFacilities().filter(function (f) { return f.name && String(f.name).trim(); });
    var current = this.getCurrent(facilities);
    if (!current) return;

    this.mapHero(current);
    this.mapNav(facilities, current);
    this.mapDetail(current);
    this.mapSlider(facilities);
    this.refreshLoco();
  };

  FacilityMapper.prototype.refreshLoco = function () {
    window.setTimeout(function () {
      if (window.locoScroll && window.locoScroll.update) window.locoScroll.update();
    }, 400);
  };

  // sub_visual ← facilities[current].images[isSelected]
  FacilityMapper.prototype.mapHero = function (current) {
    var wrapper = document.querySelector('[data-facility-hero-slides]');
    if (!wrapper) return;
    var images = this.getSelectedImages(current.images || []);

    var sig = (current.id || '') + '::' + images.map(function (s) { return s.url; }).join('|');
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

  // #snb_wrap ← facilities[] (현재 시설 li.on, facility.html?id={id})
  FacilityMapper.prototype.mapNav = function (facilities, current) {
    var nav = document.querySelector('[data-facility-nav]');
    if (!nav) return;
    nav.innerHTML = facilities.map(function (f) {
      var on = current && String(f.id) === String(current.id) ? ' class="on"' : '';
      return '<li' + on + '><a href="facility.html?id=' + escapeHtml(f.id) + '">' + escapeHtml(f.name) + '</a></li>';
    }).join('');
  };

  // 상단 상세: 이름/설명 + 대표 이미지 + 갤러리
  FacilityMapper.prototype.mapDetail = function (current) {
    setText('[data-facility-name]', current.name);
    setText('[data-facility-name-en]', this.getPropertyNameEn());
    // 이용안내: customFields hero.title 우선 → facilities[].description → usageGuide fallback (빈 값도 항상 반영)
    var heroTitle = this.getHeroTitle(current);
    // description(소개문)과 usageGuide(이용안내)를 한 줄 띄워 **둘 다** 보여준다.
    // 예전에는 폴백이라 description 이 있으면 usageGuide 가 통째로 묻혔다 —
    // 이용 요금·시간·제약이 화면에서 사라졌다. 둘 다 비면 슬롯을 숨긴다.
    // (t-template-H · I · J 와 같은 방식)
    var body = (current.description || '').trim();
    var guide = (current.usageGuide || '').trim();
    var joined = body + (body && guide ? '\n\n' : '') + guide;
    var descText = (heroTitle && heroTitle.trim()) ? heroTitle : joined;
    setHtml('[data-facility-description]', descText);
    // 둘 다 비면 슬롯을 숨긴다 — 빈 줄만 남기 때문이다.
    document.querySelectorAll('[data-facility-description]').forEach(function (el) {
      el.style.display = descText ? '' : 'none';
    });

    var images = this.getSelectedImages(current.images || []);
    setBg(document.querySelector('[data-facility-image]'), images[0] && images[0].url);

    var gallery = document.querySelector('[data-facility-gallery]');
    if (gallery) {
      // 대표(0) 다음 이미지로 고정 2칸 구성, 이미지 없는 칸은 No-Image placeholder
      var rest = images.slice(1, 3);
      var EMPTY = ImageHelpers.EMPTY_IMAGE_SVG;
      var html = '';
      for (var i = 0; i < 2; i++) {
        var img = rest[i] && rest[i].url;
        if (img) {
          html += '<li class="fadeUp is-inview" style="background-image:url(' + img + ')"><img src="' + img + '" alt=""></li>';
        } else {
          html += '<li class="fadeUp is-inview empty-image-placeholder" style="background-image:url(' + EMPTY + ')"><img src="' + EMPTY + '" alt=""></li>';
        }
      }
      gallery.innerHTML = html;
    }
  };

  // 하단 슬라이더(spec-img / spec-tit / spec-txt) ← facilities[] 전체
  FacilityMapper.prototype.mapSlider = function (facilities) {
    var imgWrap = document.querySelector('[data-facility-slides]');
    var titWrap = document.querySelector('[data-facility-titles]');
    var txtWrap = document.querySelector('[data-facility-texts]');
    if (!imgWrap && !titWrap && !txtWrap) return;
    var self = this;

    var imgHtml = '', titHtml = '', txtHtml = '';
    facilities.forEach(function (f, i) {
      var img = self.getFirstSelectedImage(f.images || []);
      var bg = img ? ('background-image:url(' + img + ')') : '';
      imgHtml += '<div class="swiper-slide item"><div class="img"' + (bg ? ' style="' + bg + '"' : '') + '></div></div>';
      titHtml += '<div class="txt-con' + (i === 0 ? ' on' : '') + '"><p class="btxt">' + escapeHtml(f.name) +
        '</p><p class="stxt">Special,</p></div>';
      txtHtml += '<div class="swiper-slide item"><div class="txt">' +
        '<a href="facility.html?id=' + escapeHtml(f.id) + '" class="btxt">' + pad2(i + 1) + '. ' + escapeHtml(f.name) + '</a>' +
        '<p class="stxt">' + escapeHtml(f.description || '') + '</p></div></div>';
    });

    if (imgWrap) imgWrap.innerHTML = imgHtml;
    if (titWrap) titWrap.innerHTML = titHtml;
    if (txtWrap) txtWrap.innerHTML = txtHtml;

    // placeholder for empty image slides
    if (imgWrap) {
      imgWrap.querySelectorAll('.img:not([style])').forEach(function (el) {
        ImageHelpers.applyBackgroundPlaceholder(el);
      });
    }
    if (typeof window.initSpecSwiper === 'function') window.initSpecSwiper();
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new FacilityMapper();
    mapper.initialize();
    global.facilityMapperInstance = mapper;
  });

  global.FacilityMapper = FacilityMapper;
})(window);
