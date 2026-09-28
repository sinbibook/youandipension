(function (global) {
  'use strict';

  function LayoutMapMapper() {
    BaseDataMapper.call(this);
  }
  LayoutMapMapper.prototype = Object.create(BaseDataMapper.prototype);
  LayoutMapMapper.prototype.constructor = LayoutMapMapper;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function setBg(el, url) {
    if (!el) return;
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  }

  LayoutMapMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0]) || null;
  };

  LayoutMapMapper.prototype.mapPage = function () {
    var section = this.getSection();
    // 섹션 없음/비활성 → 404 리다이렉트 (헤더 ROOMS>미리보기 노출과 일관)
    // preview(iframe)에선 백오피스 데이터 도착 전(currentData 없음) 정적 JSON으로 튕기는 것만 방지.
    // 백오피스에서 '비노출' 선택(currentData 있음)이면 preview에도 404를 보여준다.
    if (!section || section.enabled === false) {
      if (window.parent !== window && !(window.previewHandler && window.previewHandler.currentData)) return;
      window.location.replace('404.html');
      return;
    }
    this.mapHero(section);
    this.mapRoomNav();
    this.mapRoomSlides();
    this.mapLayoutImage(section);
    this.refreshLoco();
  };

  LayoutMapMapper.prototype.refreshLoco = function () {
    window.setTimeout(function () {
      if (window.locoScroll && window.locoScroll.update) window.locoScroll.update();
    }, 400);
  };

  // sub_visual ← layoutMap.hero.images[isSelected]
  LayoutMapMapper.prototype.mapHero = function (section) {
    var wrapper = document.querySelector('[data-layout-map-hero-slides]');
    if (!wrapper) return;
    var images = this.getSelectedImages((section.hero && section.hero.images) || []);

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
        return '<div class="swiper-slide" style="background:url(' + img.url + ') no-repeat 50% 45%;background-size:cover;"></div>';
      }).join('');
    }
    if (typeof window.initVisualSwiper === 'function') window.initVisualSwiper();
  };

  // #snb_wrap ← roomtypes[] (미리보기 li 보존 + 객실 동적, room.html?room_id={id})
  LayoutMapMapper.prototype.mapRoomNav = function () {
    var nav = document.querySelector('[data-room-list-nav]');
    if (!nav) return;
    var roomtypes = this.getRoomtypes().filter(function (rt) { return rt.name && rt.name.trim(); });
    var roomItems = this.getRoomMenuItems(roomtypes, function (rt) { return (rt && rt.name) || ''; });

    var statics = [];
    Array.prototype.forEach.call(nav.children, function (ch) {
      if (!ch.hasAttribute('data-mapped')) statics.push(ch.outerHTML);
    });
    var self = this;
    var lis = roomItems.map(function (item) {
      var name = self.getRoomMenuLabel(item);
      return '<li data-mapped><a href="' + escapeHtml(self.getRoomMenuLink(item)) + '">' +
        escapeHtml(name) + '</a></li>';
    });
    nav.innerHTML = statics.join('') + lis.join('');
  };

  // main_room ← roomtypes[] (이미지=썸네일, btxt=name, stxt=nameEn, 링크 room.html?room_id={id})
  LayoutMapMapper.prototype.mapRoomSlides = function () {
    var wrapper = document.querySelector('[data-room-list-slides]');
    if (!wrapper) return;
    var self = this;
    var roomtypes = this.getRoomtypes().filter(function (rt) { return rt.name && rt.name.trim(); });

    var sig = roomtypes.map(function (rt) { return rt.id; }).join('|') || 'empty';
    if (wrapper.dataset.roomSig === sig) return;
    wrapper.dataset.roomSig = sig;

    if (!roomtypes.length) {
      wrapper.innerHTML = '<div class="swiper-slide item c01"><div class="img" data-noimg></div></div>';
    } else {
      // Room Preview 카드는 groupName 과 무관하게 **항상 전체 객실**을 깐다.
      // 그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이고,
      // 카드는 저마다 자기 객실 상세로 연결한다.
      wrapper.innerHTML = roomtypes.map(function (rt) {
        var name = (rt && rt.name) || '';
        var thumb = self.getRoomtypeThumbnailUrl(rt) || '';
        var imgDiv = thumb
          ? '<div class="img" style="background:url(' + thumb + ') no-repeat center center;background-size:cover;"></div>'
          : '<div class="img" data-noimg></div>';
        return '' +
          '<div class="swiper-slide item c01">' +
            '<a href="' + escapeHtml(self.getRoomMenuLink(rt)) + '" class="link">' +
              imgDiv +
              '<div class="txt">' +
                '<p class="btxt">' + escapeHtml(name) + '</p>' +
                '<p class="stxt">' + escapeHtml(rt.nameEn || '') + '</p>' +
              '</div>' +
            '</a>' +
          '</div>';
      }).join('');
    }
    wrapper.querySelectorAll('.img[data-noimg]').forEach(function (el) {
      ImageHelpers.applyBackgroundPlaceholder(el);
    });
    if (typeof window.initRoomSwiper === 'function') window.initRoomSwiper();
  };

  // pre-wrap 배치도 ← layoutMap.about.images[isSelected] (동적 생성)
  LayoutMapMapper.prototype.mapLayoutImage = function (section) {
    var container = document.querySelector('[data-layout-map-images]');
    if (!container) return;
    var about = section.about || {};
    var images = this.getSelectedImages(about.images || []);

    if (!images.length) {
      container.innerHTML = '<div class="img fadeUp" data-scroll="" style="background-repeat:no-repeat;background-position:right top;background-size:cover"></div>';
      ImageHelpers.applyBackgroundPlaceholder(container.firstChild);
    } else {
      container.innerHTML = images.map(function (img) {
        return '<div class="img fadeUp" data-scroll="" style="background:url(' + img.url + ') no-repeat right top;background-size:cover"></div>';
      }).join('');
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new LayoutMapMapper();
    mapper.initialize();
    global.layoutMapMapperInstance = mapper;
  });

  global.LayoutMapMapper = LayoutMapMapper;
})(window);
