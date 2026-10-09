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

  // ── 랜딩 진입 판단 ─────────────────────────────────────────
  // index.html 진입을 landing.html 로 돌려야 하면 true. 쿼리 파라미터 없이 "어디서 왔는지(referrer)" 로 가른다.
  //   - 어드민 프리뷰 iframe → false (운영자가 "홈" 탭을 직접 볼 수 있어야 한다)
  //   - pages.landing.sections[0].enabled !== true → false (명시적으로 켠 경우만. 어드민 저장 시
  //     undefined 는 JSON 에서 키째 빠지므로, 누락을 '켜짐' 으로 보면 랜딩을 안 쓰는 숙소가 튕긴다)
  //   - 같은 사이트 안에서 넘어옴 → false (헤더/푸터 로고, 랜딩의 자기 자신 카드)
  //   - 랜딩 카드에 등록된 연결 숙소 도메인에서 넘어옴 → false (그 숙소 랜딩의 카드를 눌러 온 경우)
  //   - 그 외(주소 직접 입력·즐겨찾기·검색/외부 링크) → true
  function shouldEnterLanding(landingPage) {
    if (window.top !== window.self) return false;

    var section = landingPage && landingPage.sections && landingPage.sections[0];
    if (!section || section.enabled !== true) return false;

    return !isFromSameSite() && !isFromLinkedProperty(section);
  }

  function getReferrerUrl() {
    try {
      return document.referrer ? new URL(document.referrer) : null;
    } catch (e) {
      return null;
    }
  }

  function isFromSameSite() {
    var ref = getReferrerUrl();
    return !!ref && ref.origin === window.location.origin;
  }

  // 크로스 도메인 referrer 는 브라우저 기본 정책상 origin 만 오므로 호스트로만 비교한다 (www. 유무는 무시).
  function isFromLinkedProperty(section) {
    var ref = getReferrerUrl();
    if (!ref) return false;

    var refHost = normalizeHost(ref.host);
    return ((section && section.about) || []).some(function (card) {
      var domain = card && typeof card.domain === 'string' ? card.domain.trim() : '';
      if (!domain) return false;
      try {
        var url = new URL(/^https?:\/\//i.test(domain) ? domain : 'https://' + domain);
        return normalizeHost(url.host) === refHost;
      } catch (e) {
        return false;
      }
    });
  }

  // 랜딩으로 이동을 시작했으면 true. location.replace 는 즉시 페이지를 떠나지 않으므로,
  // 그 사이 다른 매핑(헤더 등)이 끝나며 부르는 __tplReveal 이 index 를 잠깐 드러내지 않게 막는 데 쓴다.
  var leavingToLanding = false;

  function goToLanding() {
    leavingToLanding = true;
    window.location.replace('landing.html');
  }

  function normalizeHost(host) {
    return String(host || '').toLowerCase().replace(/^www\./, '');
  }

  IndexMapper.prototype.getIndexSection = function () {
    var pages = this.getPages();
    return (pages.index && pages.index.sections && pages.index.sections[0]) || {};
  };

  IndexMapper.prototype.mapPage = function () {
    if (this.maybeRedirectToLanding()) return;

    this.mapSignature();
    this.mapHero();
    this.mapAbout();
    this.mapRooms();
    this.mapMemory();
    this.mapStay();
  };

  // 루트 가드: 랜딩 진입 대상이면 index.html 진입을 landing.html 로 되돌린다 (판단은 shouldEnterLanding).
  IndexMapper.prototype.maybeRedirectToLanding = function () {
    if (!shouldEnterLanding(this.getPages().landing)) return false;

    goToLanding();
    return true;
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
    // 브라우저 기본 컨트롤 — 마우스를 올리면 재생바(재생/일시정지·진행·음량·전체화면)가 나온다
    video.controls = true;
    // 속성으로도 넣어야 일부 모바일 브라우저에서 자동재생이 막히지 않는다
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('controls', '');
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

  // 조기 랜딩 가드 — 매핑을 기다리지 않고 이 스크립트가 로드되자마자 랜딩 여부부터 판단한다.
  //   standalone 에서는 preview-handler 가 어드민 데이터를 2초 기다린 뒤에야 index 를 매핑하는데,
  //   그 사이 헤더 매핑이 렌더 게이트를 먼저 풀어 매핑 전 index 가 보였다가
  //   랜딩으로 넘어갔다. 판단이 끝날 때까지 __tplReveal 을 붙잡아 둔다.
  //   - 랜딩 진입 대상(shouldEnterLanding) → 화면을 풀지 않고 곧장 landing.html. 이동 판단 뒤에 헤더 매핑이
  //     끝나며 노출을 요청해도 무시한다 (판단 = 노출 허용으로 보면 페이지를 떠나기 직전 index 가 비친다)
  //   - 그 외 → 붙잡아 둔 노출을 그대로 진행 (기존과 같은 화면. JSON 한 번 더 읽는 시간만큼 늦게 뜰 수 있다)
  //   - 네트워크 실패/지연 대비 3초 뒤에는 무조건 판단을 끝낸다 (head 의 렌더 게이트 타임아웃과 같은 값)
  //   iframe(어드민 프리뷰)·내부 이동은 JSON 을 읽기 전에 바로 건너뛴다 (어차피 랜딩으로 안 보낸다).
  (function earlyLandingGate() {
    if (window.top !== window.self) return;
    if (isFromSameSite()) return;

    var reveal = window.__tplReveal;
    var decided = false;
    var pending = false;

    function finish() {
      if (decided) return;
      decided = true;
      if (pending && reveal) reveal();
    }

    window.__tplReveal = function () {
      if (leavingToLanding) return; // 랜딩으로 떠나는 중 — 노출하지 않는다
      if (decided) {
        if (reveal) reveal();
      } else {
        pending = true;
      }
    };

    setTimeout(function () {
      pending = true;
      finish();
    }, 3000);

    fetch('standard-template-data.json?t=' + Date.now())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        // BaseDataMapper.getPages 와 같은 순서: homepage.customFields.pages 가 비어 있으면 customFields.pages
        var homepagePages = data && data.homepage && data.homepage.customFields && data.homepage.customFields.pages;
        var pages =
          homepagePages && Object.keys(homepagePages).length > 0
            ? homepagePages
            : (data && data.customFields && data.customFields.pages) || {};
        var landing = pages.landing;
        if (!decided && shouldEnterLanding(landing)) {
          decided = true;
          goToLanding(); // 노출하지 않고 이동한다 (이후 들어오는 노출 요청은 무시)
          return;
        }
        finish();
      })
      .catch(finish);
  })();

  global.IndexMapper = IndexMapper;
})(window);
