(function (global) {
  'use strict';

  function ReservationMapper() {
    BaseDataMapper.call(this);
  }
  ReservationMapper.prototype = Object.create(BaseDataMapper.prototype);
  ReservationMapper.prototype.constructor = ReservationMapper;

  function nl2br(s) { return String(s == null ? '' : s).replace(/\n/g, '<br>'); }

  ReservationMapper.prototype.getReservationSection = function () {
    var pages = this.getPages();
    return (pages.reservation && pages.reservation.sections && pages.reservation.sections[0]) || {};
  };

  ReservationMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapUsageGuide();
    this.mapRefundPolicies();
    this.refreshLoco();
  };

  ReservationMapper.prototype.refreshLoco = function () {
    window.setTimeout(function () {
      if (window.locoScroll && window.locoScroll.update) window.locoScroll.update();
    }, 400);
  };

  // sub_visual ← pages.reservation.sections[0].hero.images[isSelected]
  ReservationMapper.prototype.mapHero = function () {
    var wrapper = document.querySelector('[data-reservation-hero-slides]');
    if (!wrapper) return;
    var hero = this.getReservationSection().hero || {};
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
        return '<div class="swiper-slide" style="background:url(' + img.url + ') no-repeat 50% 46%;background-size:cover;"></div>';
      }).join('');
    }
    if (typeof window.initVisualSwiper === 'function') window.initVisualSwiper();
  };

  // 이용안내 ← property.usageGuide
  ReservationMapper.prototype.mapUsageGuide = function () {
    var guide = this.getProperty().usageGuide || '';
    document.querySelectorAll('[data-reservation-usage-guide]').forEach(function (el) {
      el.innerHTML = nl2br(guide);
    });
  };

  // 환불안내 ← property.refundPolicies[] (* 이용일 N일 이전 취소시 R% 환불, 당일=0)
  ReservationMapper.prototype.mapRefundPolicies = function () {
    var el = document.querySelector('[data-reservation-refund-policies]');
    if (!el) return;
    var policies = (this.getProperty().refundPolicies || []).slice().sort(function (a, b) {
      return (b.refundProcessingDays || 0) - (a.refundProcessingDays || 0);
    });
    if (!policies.length) { el.innerHTML = ''; return; }
    el.innerHTML = policies.map(function (p) {
      var days = p.refundProcessingDays || 0;
      var rate = (p.refundRate != null ? p.refundRate : 0);
      var label = days === 0 ? '* 당일 취소시 ' : ('* 이용일 ' + days + '일 이전 취소시 ');
      return label + rate + '% 환불';
    }).join('<br>');
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new ReservationMapper();
    mapper.initialize();
    global.reservationMapperInstance = mapper;
  });

  global.ReservationMapper = ReservationMapper;
})(window);
