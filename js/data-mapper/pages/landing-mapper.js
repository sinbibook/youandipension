(function (global) {
  'use strict';

  function LandingMapper() {
    BaseDataMapper.call(this);
  }
  LandingMapper.prototype = Object.create(BaseDataMapper.prototype);
  LandingMapper.prototype.constructor = LandingMapper;

  // 이 템플릿의 BaseDataMapper 에는 아래 헬퍼가 없다 (A 와 같은 구현).
  // 다른 페이지에 영향을 주지 않도록 base 가 아니라 랜딩 매퍼에만 둔다.
  LandingMapper.prototype.cleanText = function (value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  };

  LandingMapper.prototype.setBackground = function (el, url, label) {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = 'url(' + url + ')';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.backgroundSize = 'cover';
      el.classList.remove('empty-image-placeholder');
    } else {
      ImageHelpers.applyBackgroundPlaceholder(el, label);
    }
  };

  LandingMapper.prototype.mapPage = function () {
    var section = this.getSection();

    // enabled !== true (false·누락·섹션 없음) → 404 리다이렉트. index 루트 가드와 같은 기준이다.
    // (nearbyAttractions/layoutMap과 동일 규약. 헤더가 없는 게이트 페이지라 메뉴 숨김은 해당 없음)
    if (!section || section.enabled !== true) {
      window.location.href = '404.html';
      return;
    }

    this.mapCards(section);
  };

  // landing 페이지 섹션 (customFields.pages.landing.sections[0])
  LandingMapper.prototype.getSection = function () {
    var page = this.getPages().landing;
    return (page && page.sections && page.sections[0]) || null;
  };

  // 카드 클릭 시 이동할 주소를 만든다.
  //   - 자기 자신(카드의 propertyId === 이 사이트의 property.id) → 같은 도메인의 index.html.
  //     랜딩 카드는 항상 새 탭으로 열려야 하므로(랜딩 자체는 원래 탭에 남겨둠) 자기 자신도 새 탭.
  //   - 연결 숙소 → about[i].domain(어드민이 숙소 선택 시 저장해 둔 그 숙소의 실제 도메인)
  //     으로 새 탭 이동.
  //   도착한 index 가 랜딩으로 되돌리지 않는 건 index-mapper 의 shouldEnterLanding 이 referrer 로
  //   판단한다 (같은 사이트 / 랜딩 카드에 등록된 연결 숙소 도메인에서 왔으면 건너뜀). 쿼리 파라미터는 붙이지 않는다.
  //   - domain 이 아직 없는 카드(도메인 조회 실패/구버전 데이터)는 이동할 곳이 없으므로
  //     비활성 링크(href="#")로 둔다.
  LandingMapper.prototype.getCardLink = function (card) {
    if (!card) return { href: '#', external: false };

    var currentPropertyId = this.getProperty().id;
    if (currentPropertyId && card.propertyId === currentPropertyId) {
      return { href: './index.html', external: true };
    }

    var domain = this.cleanText(card.domain);
    if (!domain) return { href: '#', external: false };

    var origin = /^https?:\/\//i.test(domain) ? domain.replace(/\/+$/, '') : 'https://' + domain;
    return { href: origin + '/', external: true };
  };

  // MAPPER: landing.about[] (1~3장의 숙소 카드) → [data-landing-cards]
  //   배경 = about[i].images[] (카드별 전용 필드)
  //   로고 = hero.images[] 중 blockId === about[i].blockId (카드 간 공유 배열을 blockId로 스코프)
  //   로고가 없으면 그 자리에 about[i].propertyName(선택한 숙소명)을 대신 보여준다.
  //   소개 문구(about[i].title)는 그것과 별개로, 사용자가 입력했을 때만 추가로 보여준다
  //   (자동 채움 없음 — 안 쓰면 항상 빈 값).
  //   li 개수가 곧 그리드 컬럼 수(data-count)를 결정한다.
  LandingMapper.prototype.mapCards = function (section) {
    var self = this;
    // 노출 순서는 about[i].order 다. 어드민 "노출 순서" 는 배열을 재정렬하지 않고 order 값만 맞바꾼다.
    // order 가 없거나 같으면 원래 배열 순서를 유지한다 (안정 정렬).
    var cards = ((section && Array.isArray(section.about) && section.about) || [])
      .map(function (card, index) {
        return { card: card, index: index };
      })
      .sort(function (a, b) {
        var oa = Number(a.card && a.card.order);
        var ob = Number(b.card && b.card.order);
        oa = isFinite(oa) ? oa : Infinity;
        ob = isFinite(ob) ? ob : Infinity;
        return oa - ob || a.index - b.index;
      })
      .map(function (entry) {
        return entry.card;
      });
    var hero = (section && section.hero) || {};
    var heroImages = hero.images || [];

    document.querySelectorAll('[data-landing-cards]').forEach(function (ul) {
      ul.innerHTML = '';
      ul.setAttribute('data-count', String(Math.min(cards.length, 3) || 1));

      cards.forEach(function (card) {
        var li = document.createElement('li');
        li.className = 'landing_card';

        var link = self.getCardLink(card);
        var a = document.createElement('a');
        a.href = link.href;
        if (link.external) a.setAttribute('target', '_blank');

        var bg = document.createElement('div');
        bg.className = 'landing_card_bg';
        var bgUrl = self.getFirstSelectedImage((card && card.images) || []);
        self.setBackground(bg, bgUrl, '카드 배경 이미지');
        a.appendChild(bg);

        var overlay = document.createElement('div');
        overlay.className = 'landing_card_overlay';
        a.appendChild(overlay);

        var content = document.createElement('div');
        content.className = 'landing_card_content';

        var cardLogoImages = self.getSelectedImages(
          heroImages.filter(function (image) {
            return image.blockId === (card && card.blockId);
          })
        );
        var logoUrl = cardLogoImages.length ? cardLogoImages[0].url : '';
        var propertyName = self.cleanText(card && card.propertyName);
        var titleText = self.cleanText(card && card.title);

        if (logoUrl) {
          var img = document.createElement('img');
          img.className = 'landing_card_logo_img';
          img.src = logoUrl;
          img.alt = propertyName || titleText;
          content.appendChild(img);
        } else if (propertyName) {
          var nameEl = document.createElement('p');
          nameEl.className = 'landing_card_name';
          nameEl.textContent = propertyName;
          content.appendChild(nameEl);
        }

        // 소개 문구는 사용자가 직접 입력했을 때만 보여준다 — 자동 채움 없음.
        if (titleText) {
          var p = document.createElement('p');
          p.className = 'landing_card_title';
          p.textContent = titleText;
          content.appendChild(p);
        }

        a.appendChild(content);
        li.appendChild(a);
        ul.appendChild(li);
      });
    });
  };

  // 초기화는 원래 preview-handler 담당이지만, standalone 에서는 그쪽이 어드민 데이터를 2초 기다린 뒤에야
  // 매핑해 랜딩이 2초 넘게 빈 화면이었다. 랜딩은 첫 화면이라 iframe(어드민 프리뷰)이 아니면 바로 매핑한다.
  // (2초 뒤 preview-handler 폴백이 한 번 더 매핑하지만 같은 카드를 다시 그릴 뿐이다)
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.top !== window.self) return;
    var mapper = new LandingMapper();
    mapper.initialize();
    global.landingMapperInstance = mapper;
  });

  global.LandingMapper = LandingMapper;
})(window);
