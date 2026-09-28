(function (global) {
  'use strict';

  function nl2br(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function DirectionsMapper() {
    BaseDataMapper.call(this);
  }
  DirectionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  DirectionsMapper.prototype.constructor = DirectionsMapper;

  DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL = 5;
  DirectionsMapper.SDK_WAIT_INTERVAL = 100;

  DirectionsMapper.prototype.mapPage = function () {
    this.mapHeroSlides();
    this.mapKakaoMap();
    this.mapNotice();
    this.mapAddress();
  };

  DirectionsMapper.prototype.getDirectionsSection = function () {
    var pages = this.getPages();
    return (pages.directions && pages.directions.sections && pages.directions.sections[0]) || {};
  };

  // sub_visual ← directions.sections[0].hero.images[isSelected]
  DirectionsMapper.prototype.mapHeroSlides = function () {
    var wrapper = document.querySelector('[data-directions-hero-slides]');
    if (!wrapper) return;
    var hero = this.getDirectionsSection().hero || {};
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
        return '<div class="swiper-slide" style="background:url(' + img.url + ') no-repeat 50%;background-size:cover;"></div>';
      }).join('');
    }
    if (typeof window.initVisualSwiper === 'function') window.initVisualSwiper();
  };

  // property.latitude / property.longitude → #kakao-map (kakao-maps-sdk)
  DirectionsMapper.prototype.mapKakaoMap = function () {
    var property = this.getProperty();
    if (!property.latitude || !property.longitude) return;
    var container = document.getElementById('kakao-map');
    if (!container) return;

    var createMap = function () {
      try {
        var map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(property.latitude, property.longitude),
          level: DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL,
          scrollwheel: false,
          draggable: false
        });
        var marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(property.latitude, property.longitude)
        });
        marker.setMap(map);
      } catch (error) {
        console.error('Failed to create Kakao Map:', error);
      }
    };

    var checkSdkAndLoad = function (retryCount) {
      retryCount = retryCount || 0;
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(createMap);
      } else if (retryCount < 20) {
        setTimeout(function () { checkSdkAndLoad(retryCount + 1); }, DirectionsMapper.SDK_WAIT_INTERVAL);
      } else {
        console.error('Failed to load Kakao Map SDK after multiple retries.');
      }
    };
    checkSdkAndLoad();
  };

  // 값 없으면 해당 행(요소 + 바로 앞 <dt>) 숨김
  function toggleRow(el, hasValue) {
    if (!el) return;
    el.style.display = hasValue ? '' : 'none';
    var prev = el.previousElementSibling;
    if (prev && prev.tagName === 'DT') prev.style.display = hasValue ? '' : 'none';
  }

  // notice.title / description → [data-directions-notice-*]
  DirectionsMapper.prototype.mapNotice = function () {
    var notice = this.getDirectionsSection().notice || {};
    var titleEl = document.querySelector('[data-directions-notice-title]');
    var descEl = document.querySelector('[data-directions-notice-description]');
    if (titleEl && notice.title) titleEl.textContent = notice.title;
    if (descEl) {
      descEl.innerHTML = notice.description ? nl2br(notice.description) : '';
      toggleRow(descEl, !!notice.description);
    }
  };

  // property.address → [data-property-address]
  DirectionsMapper.prototype.mapAddress = function () {
    var address = this.getProperty().address || '';
    document.querySelectorAll('[data-property-address]').forEach(function (el) {
      el.textContent = address;
      var dd = el.closest('dd');
      toggleRow(dd, !!address);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new DirectionsMapper();
    mapper.initialize();
    global.directionsMapperInstance = mapper;
  });

  global.DirectionsMapper = DirectionsMapper;
})(window);
