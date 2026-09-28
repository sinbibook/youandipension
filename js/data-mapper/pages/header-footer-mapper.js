(function (global) {
  'use strict';

  // 상담하기 — 뒤에 property.tripPropertyId 가 붙는다
  var CONSULT_BASE_URL = 'https://www.bookingplay.co.kr/api/cti_eicn/kakao_happy_talk?tid=';

  // 파트너 타입 — 원천은 백오피스 DB `public.contract_info.partner_type` 이고
  // BFF 가 코드 문자열을 그대로 내려준다. **분기는 템플릿이 한다**(PC/모바일은 템플릿만 안다).
  //
  //   distributor_a  총판A     PC 상담하기 / 모바일 상담하기 + 예약하기
  //   distributor_b  총판B     PC 없음     / 모바일 예약하기
  //   sales_agency   판매대행  PC 없음     / 모바일 예약하기
  //
  // ⚠️ 예약하기는 **파트너 타입과 무관**하다 — 세 타입 모두 모바일에서만 뜬다.
  //    그건 기존 `.ft_btn_reserve.for_m` 의 미디어쿼리가 이미 하고 있어 손대지 않는다.
  //    타입으로 갈리는 것은 상담하기 하나뿐이다.
  var CONSULT_PARTNER_TYPES = ['distributor_a'];

  // ⚠️ base-mapper 에 `cleanText` 가 없는 템플릿이 있어 의존하지 않는다.
  function consultText(v) {
    return v === undefined || v === null ? '' : String(v).trim();
  }



  function HeaderFooterMapper() {
    BaseDataMapper.call(this);
  }
  HeaderFooterMapper.prototype = Object.create(BaseDataMapper.prototype);
  HeaderFooterMapper.prototype.constructor = HeaderFooterMapper;

  HeaderFooterMapper.prototype.mapPage = function () {
    this.mapLogo();
    this.mapFavicon();
    this.mapBookingLinks();
    this.mapYbsButton();
    this.mapConsult();
    this.mapRoomMenu();
    this.mapFacilityMenu();
    this.mapTravelMenu();
    this.mapPreviewMenu();
    this.mapFooter();
    // SEO: homepage.seo → <title data-page-title> + description/keywords + 네이버/구글 사이트 인증 (standalone 보장)
    this.updateMetaTags();
    this.mapOgTags();
  };

  // MAPPER: homepage.seo → og:title / og:description (standalone 보장, admin은 applySeo)
  HeaderFooterMapper.prototype.mapOgTags = function () {
    var seo = this.getHomepage().seo || {};
    function setMeta(key, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[property="' + key + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', key);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }
    setMeta('og:title', seo.title);
    setMeta('og:description', seo.description);
  };

  // MAPPER: layoutMap.enabled === false 이면 미리보기(data-menu-id="layout-map") 숨김 (헤더 + 각 snb 공통)
  HeaderFooterMapper.prototype.mapPreviewMenu = function () {
    var pages = this.getPages();
    var lm = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0];
    var hide = !!(lm && lm.enabled === false);
    document.querySelectorAll('[data-menu-id="layout-map"]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: nearbyAttractions.enabled === false 이면 TRAVEL/주변여행지 메뉴 숨김 (헤더 PC·모바일 + 푸터)
  HeaderFooterMapper.prototype.mapTravelMenu = function () {
    var pages = this.getPages();
    var na = pages.nearbyAttractions && pages.nearbyAttractions.sections &&
      pages.nearbyAttractions.sections[0];
    var hide = !!(na && na.enabled === false);
    document.querySelectorAll('[data-travel-menu]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: footer 대메뉴 → 헤더 각 대메뉴의 첫 서브메뉴로 이동
  HeaderFooterMapper.prototype.mapFooterMenu = function () {
    // ROOMS: layoutMap(미리보기)이 enabled면 layout-map.html, 아니면 첫 활성 객실
    var roomsLink = document.querySelector('[data-footer-rooms-link]');
    if (roomsLink) {
      var pages = this.getPages();
      var layoutEnabled = pages.layoutMap && pages.layoutMap.sections &&
        pages.layoutMap.sections[0] && pages.layoutMap.sections[0].enabled !== false;
      if (layoutEnabled) {
        roomsLink.href = 'layout-map.html';
      } else {
        var self = this;
        var firstActive = this.getRoomtypes().filter(function (rt) {
          return rt.name && rt.name.trim();
        }).find(function (rt) {
          var m = self.getMatchedRoom(rt);
          return m && m.status === 'active';
        });
        var firstItem = this.getRoomMenuItems(firstActive ? [firstActive] : [], function (rt) { return (rt && rt.name) || ''; })[0];
        roomsLink.href = firstItem ? this.getRoomMenuLink(firstItem) : 'room.html';
      }
    }

    // SPECIAL: 첫 facility
    var specialLink = document.querySelector('[data-footer-special-link]');
    if (specialLink) {
      var facilities = this.getProperty().facilities || [];
      if (facilities.length) {
        specialLink.href = 'facility.html?id=' + facilities[0].id;
      }
    }
  };

  // MAPPER: homepage.images[0].logo[isSelected].url
  HeaderFooterMapper.prototype.mapLogo = function () {
    var logoUrl = this.getLogo();
    var els = document.querySelectorAll('[data-logo]');
    if (!els || !els.length) return;

    els.forEach(function (el) {
      // 폭/높이 모두 CSS 변수 상한으로 → 로고 비율을 유지한 채 헤더 배경 안에 맞춰 축소.
      // width를 고정하면 세로가 긴 로고가 헤더 배경 밖으로 넘치므로 max-* 로 제한한다.
      el.style.width = 'auto';
      el.style.height = 'auto';
      el.style.maxWidth = 'var(--logo-w, 140px)';
      el.style.maxHeight = 'var(--logo-h, 60px)';

      if (logoUrl) {
        el.src = logoUrl;
        el.setAttribute('data-logo-mapped', '');
      } else if (!el.hasAttribute('data-logo-mapped')) {
        // 이전 실행에서 실제 로고가 이미 들어갔다면 placeholder로 덮어쓰지 않음
        ImageHelpers.applyPlaceholder(el);
      }
    });
  };

  // MAPPER: favicon ← homepage.images[0].logo[isSelected].url (로고 데이터 재사용)
  HeaderFooterMapper.prototype.mapFavicon = function () {
    var logoUrl = this.getLogo();
    if (!logoUrl) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  };

  // MAPPER: property.realtimeBookingId
  HeaderFooterMapper.prototype.mapBookingLinks = function () {
    var bookingUrl = this.getBookingUrl();
    document.querySelectorAll('[data-booking-link]').forEach(function (el) {
      if (bookingUrl && bookingUrl !== '#!') {
        el.href = bookingUrl;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: property.ybsId
  HeaderFooterMapper.prototype.mapYbsButton = function () {
    var prop = this.getProperty();
    var ybsId = prop.ybsId;
    var ybs_url = 'https://rev.yapen.co.kr/external?ypIdx=';
    var ybsButtons = document.querySelectorAll('[data-ybs-button]');

    if (!ybsId) {
      ybsButtons.forEach(function (button) {
        button.style.display = 'none';
      });
      return;
    }

    ybsButtons.forEach(function (button) {
      button.style.display = '';
      button.setAttribute('data-ybs-id', ybsId);
      // data-ybs-button이 <a> 자체(E)이거나 컨테이너 안의 <a>(C) 둘 다 지원
      var link = (button.tagName === 'A') ? button : button.querySelector('a');
      if (link) {
        link.href = 'javascript:void(0)';
        link.addEventListener('click', function () {
          window.open(ybs_url + ybsId, '_blank');
        });
      }
    });
  };

  // 상담 URL 에 쓸 tripPropertyId. 없거나 형식이 아니면 빈 문자열.
  HeaderFooterMapper.prototype.getConsultId = function () {
    var raw = consultText(this.getProperty().tripPropertyId);
    // ⚠️ URL 쿼리에 그대로 붙는 값이라 토큰 형태만 통과시킨다. 플레이스홀더
    //    문자열(`숙소 ID` 같은 한글·공백)이 들어와도 링크가 깨지지 않는다.
    return /^[A-Za-z0-9_-]+$/.test(raw) ? raw : '';
  };

  // 상담하기 노출 대상인가 — 파트너 타입 + tripPropertyId 둘 다 있어야 한다.
  HeaderFooterMapper.prototype.isConsultVisible = function () {
    var partnerType = consultText(this.getProperty().partnerType);
    return Boolean(this.getConsultId()) && CONSULT_PARTNER_TYPES.indexOf(partnerType) !== -1;
  };

  // MAPPER: property.tripPropertyId + partnerType → [data-consult-button] (우측 하단 상담하기)
  //
  // 총판A 만 노출하고, `tripPropertyId` 가 비면 타입과 무관하게 숨긴다.
  // 값이 없으면 `[data-consult-wrap]` 째 숨긴다 — 버튼만 숨기면 빈 박스가 남는다.
  HeaderFooterMapper.prototype.mapConsult = function () {
    var tripPropertyId = this.getConsultId();
    var visible = this.isConsultVisible();

    // 상담하기가 빠지면 예약하기 아래가 비어 버린다.
    // CSS 가 위치를 되돌릴 수 있도록 상태를 루트에 찍는다.
    document.documentElement.setAttribute('data-consult', visible ? 'on' : 'off');

    document.querySelectorAll('[data-consult-button]').forEach(function (el) {
      var host = el.closest('[data-consult-wrap]') || el;
      if (!visible) {
        host.style.display = 'none';
        return;
      }
      host.style.display = '';
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = CONSULT_BASE_URL + tripPropertyId;
        target.setAttribute('target', '_blank');
      }
    });
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 정적(비-mapped) 자식만 보존 + mapped 항목을 항상 새로 생성해 한 번에 innerHTML 설정.
  // 현재 DOM의 [data-mapped]는 항상 제외하므로 재실행/동시실행(이벤트 + loadFallbackData)에도 멱등.
  function fillSubmenu(container, liHtmlList) {
    if (!container) return;
    var statics = [];
    Array.prototype.forEach.call(container.children, function (ch) {
      if (!ch.hasAttribute('data-mapped')) statics.push(ch.outerHTML);
    });
    container.innerHTML = statics.join('') + liHtmlList.join('');
  }

  // MAPPER: roomtypes[].name → ROOMS 메뉴 동적 생성 (미리보기 다음에, PC + 모바일)
  HeaderFooterMapper.prototype.mapRoomMenu = function () {
    var roomtypes = this.getRoomtypes();
    var containers = document.querySelectorAll('[data-rooms-submenu], [data-rooms-submenu-mobile]');
    if (!containers.length) return;

    var roomItems = this.getRoomMenuItems(roomtypes.filter(function (rt) { return rt.name && rt.name.trim(); }), function (rt) { return (rt && rt.name) || ''; });
    var self = this;
    var lis = roomItems.map(function (item) {
        var rt = self.getRoomMenuRoomtype(item);
        var name = self.getRoomMenuLabel(item);
        return '<li data-mapped><a href="' + escapeHtml(self.getRoomMenuLink(item)) + '" title="' + escapeHtml(name) + '">' +
          escapeHtml(name) + '</a></li>';
      });

    containers.forEach(function (container) { fillSubmenu(container, lis); });
  };

  // MAPPER: property.facilities[].name → SPECIAL 메뉴 동적 생성 (PC + 모바일)
  HeaderFooterMapper.prototype.mapFacilityMenu = function () {
    var facilities = this.getProperty().facilities || [];
    var containers = document.querySelectorAll('[data-facility-submenu], [data-facility-submenu-mobile]');
    if (!containers.length) return;

    var lis = facilities
      .filter(function (f) { return f.name && String(f.name).trim(); })
      .map(function (f) {
        return '<li data-mapped><a href="facility.html?id=' + escapeHtml(f.id) + '" title="' + escapeHtml(f.name) + '">' +
          escapeHtml(f.name) + '</a></li>';
      });

    containers.forEach(function (container) { fillSubmenu(container, lis); });
  };

  // 헤더 호버 스타일 처리
  HeaderFooterMapper.prototype.mapHeaderNavHover = function () {
    var gnb = document.getElementById('shGnb');
    var navItems = document.querySelectorAll('.sh_nav .depth1');
    var lnbBg = document.querySelector('.sh_lnb_bg');

    navItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (gnb) {
          gnb.classList.add('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'block';
        }
        item.classList.add('on');
      });

      item.addEventListener('mouseleave', function () {
        if (gnb) {
          gnb.classList.remove('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'none';
        }
        item.classList.remove('on');
      });
    });
  };

  // 한글 받침 판별하여 "과/와" 선택
  HeaderFooterMapper.prototype.getKoreanParticle = function (word) {
    if (!word || word.length === 0) return '과';
    var lastChar = word.charCodeAt(word.length - 1);
    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
      var code = lastChar - 0xAC00;
      return (code % 28 !== 0) ? '과' : '와';
    }
    return '과';
  };

  // 전화번호 링크(<a data-footer-phone-link>)를 번호 개수만큼 복제.
  // PC 는 구분자(·)로 한 줄에, 모바일은 줄바꿈해 노출 (배치는 CSS 담당)
  HeaderFooterMapper.prototype.renderFooterPhones = function (phones) {
    var links = document.querySelectorAll('[data-footer-phone-link]');
    if (!links.length) return;
    var base = links[0];
    var parent = base.parentNode;
    // 재매핑 대비: 앞서 복제한 링크와 구분자를 제거하고 원본만 템플릿으로 사용
    for (var i = links.length - 1; i >= 1; i--) {
      links[i].parentNode.removeChild(links[i]);
    }
    parent.querySelectorAll('.ft_tel_sep').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    // 번호가 2개 이상일 때만 붙는 클래스 (모바일 폰트/여백 조정용)
    if (phones.length > 1) {
      parent.classList.add('multi');
    } else {
      parent.classList.remove('multi');
    }
    phones.forEach(function (phone, idx) {
      var el = idx === 0 ? base : base.cloneNode(true);
      var span = el.querySelector('[data-footer-phone]');
      if (span) span.textContent = phone;
      el.setAttribute('href', 'tel:' + String(phone).replace(/[^0-9+]/g, ''));
      if (idx > 0) {
        // 링크 밖에 두어 구분자가 클릭 영역에 포함되지 않도록 함
        var sep = document.createElement('span');
        sep.className = 'ft_tel_sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '\u00b7';
        parent.appendChild(sep);
        parent.appendChild(el);
      }
    });
  };

  // MAPPER: businessInfo.businessName / businessAddress / businessNumber / representativeName + property.contactPhone(전화)
  // MAPPER: property.tripProviderName → [data-copyright]
  // 공급사명이 있으면 data-copyright 의 템플릿 문자열에서 {provider} 를 치환한다.
  // 값이 없으면(백오피스 미입력 → "") HTML 의 기존 트립일레븐 문구를 그대로 둔다.
  HeaderFooterMapper.prototype.mapCopyright = function () {
    var provider = String(this.getProperty().tripProviderName || '').trim();
    if (!provider) return;
    document.querySelectorAll('[data-copyright]').forEach(function (el) {
      var tpl = el.getAttribute('data-copyright') || '';
      el.textContent = tpl.replace(/\{provider\}/g, provider);
    });
  };

  HeaderFooterMapper.prototype.mapFooter = function () {
    this.mapCopyright();
    var prop = this.getProperty();
    var b = (prop && prop.businessInfo) || {};

    function setText(sel, val) {
      if (val == null) return;
      document.querySelectorAll(sel).forEach(function (el) { el.textContent = val; });
    }

    // 상호명
    setText('[data-footer-business-name]', b.businessName || this.getPropertyName());
    // 전화번호 + tel: 링크 ← property.contactPhone (배열이면 전부 한 줄씩 노출)
    this.renderFooterPhones(this.toPhoneList(prop && prop.contactPhone));
    // 사업자 정보
    setText('[data-footer-address]', b.businessAddress);
    setText('[data-footer-business-number]', b.businessNumber);
    setText('[data-footer-representative]', b.representativeName);

    // 저작권 / 개인정보처리방침 : 트립일레븐 하드코딩 (footer.html 정적, 매핑 안 함)
  };

  document.addEventListener('headerFooterLoaded', function () {
    var mapper = new HeaderFooterMapper();
    mapper.initialize();
    global.headerFooterMapperInstance = mapper;
  });

  global.HeaderFooterMapper = HeaderFooterMapper;
})(window);
