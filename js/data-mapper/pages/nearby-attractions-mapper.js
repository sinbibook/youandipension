(function (global) {
  'use strict';

  function NearbyAttractionsMapper() {
    BaseDataMapper.call(this);
  }
  NearbyAttractionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  NearbyAttractionsMapper.prototype.constructor = NearbyAttractionsMapper;

  function nl2br(s) {
    return String(s == null ? '' : s).replace(/\n/g, '<br>');
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad2(n) { return ('0' + n).slice(-2); }
  // 빈 값도 항상 반영 (백오피스에서 값 삭제 시 이전 값/기본 텍스트 잔존 방지)
  function setText(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = (val == null ? '' : val); });
  }

  NearbyAttractionsMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (pages.nearbyAttractions && pages.nearbyAttractions.sections &&
      pages.nearbyAttractions.sections[0]) || null;
  };

  NearbyAttractionsMapper.prototype.mapPage = function () {
    var section = this.getSection();
    // 섹션 없음/비활성 → 404 리다이렉트 (헤더 메뉴 숨김과 일관)
    // preview(iframe)에선 백오피스 데이터 도착 전(currentData 없음) 정적 JSON으로 튕기는 것만 방지.
    // 백오피스에서 '비노출' 선택(currentData 있음)이면 preview에도 404를 보여준다.
    if (!section || section.enabled === false) {
      if (window.parent !== window && !(window.previewHandler && window.previewHandler.currentData)) return;
      window.location.replace('404.html');
      return;
    }
    this.mapHero(section);
    setText('[data-nearby-subtitle]', (section.hero && section.hero.description) || '');
    this.mapNavAndList(section);
    this.refreshLoco();
  };

  NearbyAttractionsMapper.prototype.refreshLoco = function () {
    window.setTimeout(function () {
      if (window.locoScroll && window.locoScroll.update) window.locoScroll.update();
      if (window.refreshTravelSpy) window.refreshTravelSpy();
    }, 400);
  };

  // sub_visual ← hero.images[isSelected][0] 단일 고정 (슬라이드 미사용)
  NearbyAttractionsMapper.prototype.mapHero = function (section) {
    var el = document.querySelector('[data-nearby-hero-image]');
    if (!el) return;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = '50% 66%';
    el.style.backgroundSize = 'cover';
    var url = this.getFirstSelectedImage((section.hero && section.hero.images) || []);
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  };

  // about[] → 좌측 앵커 네비(.travel-slide) + 우측 카드(.travel-list) 동적 생성 (앵커 id 매칭)
  NearbyAttractionsMapper.prototype.mapNavAndList = function (section) {
    var nav = document.querySelector('[data-nearby-nav]');
    var list = document.querySelector('[data-nearby-list]');
    if (!nav || !list) return;
    var about = section.about || [];
    var self = this;
    var EMPTY = ImageHelpers.EMPTY_IMAGE_SVG;

    var navHtml = '';
    var listHtml = '';
    about.forEach(function (block, i) {
      block = block || {};
      var id = 'anchor' + pad2(i + 1);
      var title = escapeHtml(block.title || '');
      var url = self.getFirstSelectedImage(block.images || []);
      var imgUrl = url || EMPTY;

      navHtml += '<li' + (i === 0 ? ' class="active"' : '') +
        '><a href="#' + id + '" class="anchor-btn">' + title + '</a></li>';

      listHtml += '' +
        '<li data-index="' + i + '">' +
          '<div class="sch" id="' + id + '"></div>' +
          '<div class="img fadeUp is-inview" data-scroll="" style="background:url(' + imgUrl + ') no-repeat center top;background-size:cover;">' +
            '<img src="' + imgUrl + '" alt="' + title + '">' +
          '</div>' +
          '<div class="txt">' +
            '<p class="btxt fadeUp is-inview" data-scroll="">' + title + '</p>' +
            '<p class="stxt fadeUp is-inview" data-scroll="">' + (block.description ? '<img src="../images/travel_contact.png" alt="" style="vertical-align:middle;margin-right:4px;">' + nl2br(block.description) : '') + '</p>' +
          '</div>' +
        '</li>';
    });

    nav.innerHTML = navHtml;
    list.innerHTML = listHtml;
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new NearbyAttractionsMapper();
    mapper.initialize();
    global.nearbyAttractionsMapperInstance = mapper;
  });

  global.NearbyAttractionsMapper = NearbyAttractionsMapper;
})(window);
