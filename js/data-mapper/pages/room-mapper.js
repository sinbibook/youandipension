(function (global) {
  'use strict';

  var ROOM_COUNT_LABELS = {
    bedroom: '침대룸',
    bathroom: '화장실',
    livingRoom: '거실',
    ondol: '온돌룸',
    kitchen: '주방'
  };
  var ROOM_COUNT_ORDER = ['bedroom', 'bathroom', 'livingRoom', 'ondol', 'kitchen'];

  function RoomMapper() {
    BaseDataMapper.call(this);
  }
  RoomMapper.prototype = Object.create(BaseDataMapper.prototype);
  RoomMapper.prototype.constructor = RoomMapper;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function setText(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = (val == null ? '' : val); });
  }
  function setBg(el, url) {
    if (!el) return;
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  }

  // roomStructures + totalRoomCount(값≥1) 한글 조합 → "복층/로프트/ 침대룸 화장실 거실"
  RoomMapper.prototype.buildStructure = function (room) {
    if (!room) return '';
    var rs = (room.roomStructures || []).join('/');
    var trc = room.totalRoomCount || {};
    var counts = ROOM_COUNT_ORDER
      .filter(function (k) { return (trc[k] || 0) >= 1; })
      .map(function (k) { return ROOM_COUNT_LABELS[k]; })
      .join(' ');
    if (rs && counts) return rs + '/ ' + counts;
    return rs || counts;
  };

  // roomtypes[current] interior 이미지(isSelected, sortOrder). 없으면 전체 선택 이미지 fallback
  RoomMapper.prototype.getInteriorImages = function (rt) {
    var imgs = (rt && rt.images) || [];
    var interior = this.getSelectedImages(imgs.filter(function (im) { return im.category === 'roomtype_interior'; }));
    return interior.length ? interior : this.getSelectedImages(imgs);
  };

  // ?room_id={roomtype.id} 로 현재 객실타입 결정 (없으면 첫 명명 roomtype)
  RoomMapper.prototype.getCurrent = function (roomtypes) {
    var id = new URLSearchParams(window.location.search).get('room_id');
    if (id) {
      var found = roomtypes.filter(function (rt) { return String(rt.id) === String(id); })[0];
      if (found) return found;
    }
    return roomtypes[0] || null;
  };

  RoomMapper.prototype.mapPage = function () {
    var roomtypes = this.getRoomtypes().filter(function (rt) { return rt.name && rt.name.trim(); });
    var current = this.getCurrent(roomtypes);
    if (!current) return;
    var room = this.getMatchedRoom(current);

    this.mapNav(roomtypes, current);
    this.mapHero(current);
    this.mapInfo(current, room);
    this.mapVimgText(current);
    this.mapGallery(current);
    this.mapFloorplan(current);
    this.refreshLoco();
  };

  // customFields.pages.room[] 에서 현재 객실 id 매칭 항목
  RoomMapper.prototype.getRoomPageSection = function (id) {
    var list = this.getPages().room || [];
    var entry = list.filter(function (r) { return String(r.id) === String(id); })[0];
    return (entry && entry.sections && entry.sections[0]) || null;
  };

  // vimg: h4 ← hero.title / .stit ← gallery.title (값 없으면 하드코딩 fallback 유지)
  RoomMapper.prototype.mapVimgText = function (current) {
    var sec = this.getRoomPageSection(current.id);
    if (!sec) return;
    var title = sec.hero && sec.hero.title;
    var desc = sec.gallery && sec.gallery.title;
    if (title && title.trim()) setText('[data-room-vimg-title]', title);
    if (desc && desc.trim()) {
      document.querySelectorAll('[data-room-vimg-desc]').forEach(function (el) {
        el.innerHTML = String(desc).replace(/\n/g, '<br>');
      });
    }
  };

  RoomMapper.prototype.refreshLoco = function () {
    window.setTimeout(function () {
      if (window.locoScroll && window.locoScroll.update) window.locoScroll.update();
    }, 400);
  };

  // #snb_wrap ← roomtypes[] (미리보기 보존 + 동적, 현재 객실 li.on)
  RoomMapper.prototype.mapNav = function (roomtypes, current) {
    var nav = document.querySelector('[data-room-list-nav]');
    if (!nav) return;
    var statics = [];
    Array.prototype.forEach.call(nav.children, function (ch) {
      if (!ch.hasAttribute('data-mapped')) statics.push(ch.outerHTML);
    });
    var self = this;
    var roomItems = this.getRoomMenuItems(roomtypes, function (rt) { return (rt && rt.name) || ''; });
    // 그룹 안이면 그 그룹의 객실만 펼친다.
    // 헤더/미리보기 메뉴는 그룹명 하나로 접히고 클릭 시 그룹의 첫 객실로 들어가는데,
    // 이 탭까지 접혀 있으면 2번째 객실부터는 UI 로 도달할 방법이 없다.
    // 멤버가 1실인 그룹은 펼치지 않는다(항목이 하나뿐이라 의미가 없다).
    var activeGroup = null;
    roomItems.forEach(function (it) {
      var members = (it && it.roomtypes) || [];
      if (members.length > 1 && self.isRoomMenuItemActive(it, current && current.id)) activeGroup = it;
    });
    if (activeGroup) {
      roomItems = activeGroup.roomtypes.map(function (rt) {
        return { label: (rt && rt.name) || '', roomtype: rt, roomtypes: [rt] };
      });
    }
    var lis = roomItems.map(function (item) {
      var name = self.getRoomMenuLabel(item);
      var on = self.isRoomMenuItemActive(item, current && current.id) ? ' class="on"' : '';
      return '<li data-mapped' + on + '><a href="' + escapeHtml(self.getRoomMenuLink(item)) + '">' +
        escapeHtml(name) + '</a></li>';
    });
    nav.innerHTML = statics.join('') + lis.join('');
  };

  // sub_visual ← roomtypes[current] interior 이미지
  RoomMapper.prototype.mapHero = function (current) {
    var wrapper = document.querySelector('[data-room-hero-slides]');
    if (!wrapper) return;
    var images = this.getInteriorImages(current);

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

  // info: 객실명/구조/인원/평형/집기 + 대표/배경/추억 이미지
  RoomMapper.prototype.mapInfo = function (current, room) {
    var imgs = this.getInteriorImages(current);
    var url = function (i) { return imgs[i] && imgs[i].url; };

    setText('[data-room-name]', current.name);
    setText('[data-room-structure]', this.buildStructure(room));
    setText('[data-room-base-occupancy]', room && room.baseOccupancy);
    setText('[data-room-max-occupancy]', room && room.maxOccupancy);
    // 평형: rooms[j].size(㎡)를 평으로 환산 (1평=3.305785㎡, 소수 1자리) — sizePyeong 미전송 대비
    var sqm = room && room.size != null ? Number(room.size) : null;
    setText('[data-room-size]', (sqm != null && !isNaN(sqm)) ? Math.round(sqm / 3.305785 * 10) / 10 + '평' : '');
    setText('[data-room-amenities]', room && room.amenities ? room.amenities.join(', ') : '');

    // 대표 이미지(<img>)
    document.querySelectorAll('[data-room-image-thumb]').forEach(function (el) {
      if (url(0)) { el.src = url(0); } else { ImageHelpers.applyPlaceholder(el); }
    });
    // 배경 이미지 (fr / memory)
    setBg(document.querySelector('[data-room-image-main]'), url(1) || url(0));
    setBg(document.querySelector('[data-room-memory-image]'), url(2) || url(0));
  };

  // vimg .list ← exterior 이미지 우선, 없으면 interior fallback
  RoomMapper.prototype.mapGallery = function (current) {
    var ul = document.querySelector('[data-room-gallery]');
    if (!ul) return;
    var imgs = (current && current.images) || [];
    var exterior = this.getSelectedImages(imgs.filter(function (im) { return im.category === 'roomtype_exterior'; }));
    var images = exterior.length ? exterior : this.getInteriorImages(current);
    var EMPTY = ImageHelpers.EMPTY_IMAGE_SVG;

    if (!images.length) {
      ul.innerHTML = '<li class="fadeUp is-inview" style="background:url(' + EMPTY + ') no-repeat center center;background-size:cover;"><img src="' + EMPTY + '" alt=""></li>';
      return;
    }
    ul.innerHTML = images.map(function (img) {
      return '<li class="fadeUp is-inview" style="background:url(' + img.url + ') no-repeat center center;background-size:cover;"><img src="' + img.url + '" alt=""></li>';
    }).join('');
  };

  /* MAPPER: roomtypes[current] 평면도 이미지 → [data-room-floorplan-image]
     ⚠️ 제목·설명 자리가 없다. 도면 이미지 한 장이 전부다.
     ⚠️ 이미지가 없으면 [data-room-floorplan-section] 을 통째로 숨긴다 —
        원본에 없던 빈 구간을 남기지 않는다.
        (layout-map 의 배치도는 반대로 없어도 placeholder 를 세운다 — 규칙이 정반대다.)
     ⚠️ URL 이 있는데 로드가 죽어도 구간째 숨긴다 — 깨진 아이콘만 남는 것보다 낫다. */
  RoomMapper.prototype.mapFloorplan = function (current) {
    var sections = document.querySelectorAll('[data-room-floorplan-section]');
    if (!sections.length) return;

    var image = this.getRoomFloorplanImage(current);
    var url = (image && image.url) || '';

    sections.forEach(function (el) {
      el.style.display = url ? '' : 'none';
    });
    if (!url) return;

    document.querySelectorAll('[data-room-floorplan-image]').forEach(function (img) {
      img.alt = '객실 평면도';
      img.onerror = function () {
        sections.forEach(function (el) {
          el.style.display = 'none';
        });
      };
      img.src = url;
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new RoomMapper();
    mapper.initialize();
    global.roomMapperInstance = mapper;
  });

  global.RoomMapper = RoomMapper;
})(window);
