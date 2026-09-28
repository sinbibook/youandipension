(function (global) {
  'use strict';

  function IndexMapper() {
    BaseDataMapper.call(this);
  }
  IndexMapper.prototype = Object.create(BaseDataMapper.prototype);
  IndexMapper.prototype.constructor = IndexMapper;

  function nl2br(s) {
    return String(s == null ? '' : s).replace(/\n/g, '<br>');
  }
  // ⚠️ 매퍼 파일은 각각 독립 IIFE 라 다른 파일의 로컬 `escapeHtml` 을 볼 수 없다.
  //    이 파일에도 정의를 두지 않으면 mapRooms() 에서 ReferenceError 가 나고,
  //    initialize() 의 catch 가 삼켜서 **그 뒤 mapMemory/mapStay 가 통째로 중단**된다.
  //    (다른 매퍼 5종과 같은 구현)
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  // 빈 값도 항상 반영 (백오피스에서 값 삭제 시 이전 값/기본 텍스트 잔존 방지)
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

  IndexMapper.prototype.getIndexSection = function () {
    var pages = this.getPages();
    return (pages.index && pages.index.sections && pages.index.sections[0]) || {};
  };

  IndexMapper.prototype.mapPage = function () {
    this.mapSignature();
    this.mapHero();
    this.mapAbout();
    this.mapRooms();
    this.mapMemory();
    this.mapStay();
  };

  // vimeoWrap(히어로 위 영상 밴드) ← signature (mediaType==='video' 일 때만 노출)
  // 영상이 없는 숙소는 영역째 숨긴다.
  IndexMapper.prototype.mapSignature = function () {
    var wrap = document.querySelector('[data-index-signature]');
    if (!wrap) return;

    var signature = this.getIndexSection().signature || {};
    // videos[] 는 images[] 와 같은 형태({url,isSelected,sortOrder})라 이미지 헬퍼를 그대로 쓴다
    var url = (signature.mediaType === 'video') ? this.getFirstSelectedImage(signature.videos || []) : '';

    var sig = url || 'none';
    if (wrap.dataset.signatureSig === sig) return; // 동일 데이터 재실행 시 재생 리셋 방지
    wrap.dataset.signatureSig = sig;

    wrap.innerHTML = '';
    if (!url) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';

    var video = document.createElement('video');
    video.className = 'signature-video';
    video.src = url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    // 속성으로도 넣어야 일부 모바일 브라우저에서 자동재생이 막히지 않는다
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    wrap.appendChild(video);
  };

  // main_visual ← customFields.pages.index.sections[0].hero.images[isSelected]
  IndexMapper.prototype.mapHero = function () {
    var hero = this.getIndexSection().hero || {};
    var wrapper = document.querySelector('[data-index-hero-slides]');
    if (!wrapper) return;

    var images = this.getSelectedImages(hero.images || []);
    var sig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === sig) return; // 동일 데이터 재실행 시 재초기화 생략(autoplay 리셋 방지)
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

  // main_about (Greeting) ← essence (title / description / 첫 이미지) + hero.title(앞 장식 문구)
  IndexMapper.prototype.mapAbout = function () {
    var section = this.getIndexSection();
    var essence = section.essence || {};
    setText('[data-index-about-eyebrow]', section.hero && section.hero.title);
    setText('[data-index-about-title]', essence.title);
    setHtml('[data-index-about-description]', essence.description);
    setBg(document.querySelector('[data-index-about-image]'), this.getFirstSelectedImage(essence.images || []));
  };

  // main_room ← customFields.roomtypes[] (이미지=썸네일, btxt=name, stxt=nameEn, 링크 room.html?room_id={id})
  IndexMapper.prototype.mapRooms = function () {
    var wrapper = document.querySelector('[data-index-room-slides]');
    if (!wrapper) return;
    var self = this;
    // 원본이 내려둔 객실은 카드도 내지 않는다 — 그룹도 없고 사진도 없으면 보여줄 게 없다.
    // 크롤러가 이름·사진을 못 읽은 경우는 groupName 이 남아 있어 여기서 걸리지 않는다.
    var roomtypes = this.getRoomtypes().filter(function (rt) {
      if (!rt || !rt.name || !rt.name.trim()) return false;
      return !!(rt.groupName || '').trim() || !!(rt.images || []).length;
    });

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
                '<p class="stxt">' + (rt.nameEn || '') + '</p>' +
              '</div>' +
            '</a>' +
          '</div>';
      }).join('');
    }
    // 썸네일 없는 슬라이드 No-Image placeholder
    wrapper.querySelectorAll('.img[data-noimg]').forEach(function (el) {
      ImageHelpers.applyBackgroundPlaceholder(el);
    });
    if (typeof window.initRoomSwiper === 'function') window.initRoomSwiper();
  };

  // main_memory ← closing (description / 첫 이미지)
  IndexMapper.prototype.mapMemory = function () {
    var closing = this.getIndexSection().closing || {};
    setHtml('[data-index-memory-description]', closing.description);
    setBg(document.querySelector('[data-index-memory-image]'), this.getFirstSelectedImage(closing.images || []));
  };

  // main_stay ← gallery (title=태그라인 / description) + property.name + gallery.images(3칸)
  IndexMapper.prototype.mapStay = function () {
    var gallery = this.getIndexSection().gallery || {};
    setText('[data-index-stay-tagline]', gallery.title);
    setHtml('[data-index-stay-description]', gallery.description);
    setText('[data-index-stay-name]', this.getPropertyName());
    setText('[data-index-stay-name-en]', this.getPropertyNameEn());

    // 3칸 레이아웃(stay-img01/02/03) 유지하며 배경만 교체
    var container = document.querySelector('[data-index-stay-images]');
    if (container) {
      var imgs = this.getSelectedImages(gallery.images || []);
      var ps = container.querySelectorAll('li .img p');
      ps.forEach(function (p, i) { setBg(p, imgs[i] && imgs[i].url); });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    // previewHandler가 데이터를 받았으면 스킵 (preview-handler가 처리)
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new IndexMapper();
    mapper.initialize();
    global.indexMapperInstance = mapper;
  });

  global.IndexMapper = IndexMapper;
})(window);
