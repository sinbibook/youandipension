# Data Mapping 정의서 (trip-template-F 기반)

`standard-template-data.json` 기준 각 HTML 페이지의 `data-*` 속성 매핑 정의.
이 프로젝트는 trip-template-F 디자인을 가져와 표준 데이터 구조에 맞춰 매핑한다.

---

## 구현 주의사항

- 각 페이지 mapper(`js/data-mapper/pages/*.js`)는 아래 정의를 기준으로 `data-*` 속성을 탐색해 데이터를 주입한다.
- **페이지 스켈레톤**(전 페이지 공통): `<body>` → `#wrap` → `#header-wrap`(헤더 마운트, scroll-wrap 밖) + `.scroll-wrap#doc[data-scroll-container]`(locomotive) → `#container`(본문) + `#footer-wrap`(푸터 마운트, scroll-wrap 안).
- 헤더/푸터는 `common/header.html`·`common/footer.html`로 분리되어 `js/header-footer-loader.js`가 `#header-wrap`/`#footer-wrap`에 주입한다. 로더는 `window.loaderReady`(Promise) 설정 후 `headerFooterLoaded` 이벤트를 디스패치하고, `header-footer-mapper.js`가 이 이벤트에서 매핑한다.
- 헤더가 async 주입되므로 메뉴 인터랙션(`.hd_lnb` hover, `.btn_menu`/`.aside` 토글)은 `custom.js`/`custom-oreuda.js`에서 `$(document)` **이벤트 위임**으로 바인딩한다. locomotive 초기화는 `window load` 시점(헤더/푸터 주입 이후)에 수행(template-D 방식).
- 메뉴 동적 생성(ROOMS/SPECIAL)은 **정적(비-mapped) 자식 보존 + mapped 항목 재생성**으로 한 번에 `innerHTML` 설정 → 이벤트·`loadFallbackData` 동시 실행에도 멱등.
- 색상/폰트(테마)는 `styles/theme.css`의 CSS 변수로 정의: `--color-primary`/`--color-secondary`, `--font-ko-main`/`--font-ko-sub`/`--font-en-main`. `style.css`의 하드코딩 색/폰트를 이 변수로 치환했고, 브라운/베이지 톤은 상대색 `rgb(from var(--color-...) r g b / a)`로 투명도 파생. (백오피스 theme color.primary/secondary, font.koMain/koSub/enMain 매핑 대상)
- 이미지가 없으면 `ImageHelpers.applyPlaceholder()`(`<img>`) 또는 배경이미지 기본값 유지로 처리.

### 진행 현황 (F = dawonhill 디자인 기준 재작업)

- [x] 원본 import (dawonhill 7p + oreuda→nearby, html/css/js)
- [x] common/header.html, common/footer.html (dawonhill 마크업 + 동적 분리/마운트 + 매핑)
- [x] 헤더/메뉴 (ABOUT·ROOMS·SPECIAL·RESERVE, PC+모바일 aside, 동적 객실/시설)
- [x] SEO / 메타 (전 페이지 공통, title/desc/keywords/og 동적 주입 + 하드코딩 제거)
- [x] 8개 페이지 스켈레톤 변환(#wrap/#header-wrap/#footer-wrap + 인프라 스크립트)
- [x] index.html (본문 data-* 매핑: hero/about(essence)/room(roomtypes)/memory(closing)/stay(gallery))
- [x] main.html (본문 data-* 매핑: hero / about[0](info) / about[1](vimg), snb 정적)
- [x] directions.html (hero / kakao-map / notice / 주소, snb 정적)
- [x] layout-map.html (hero / snb nav / 객실 슬라이더 / 배치도, enabled=false→404)
- [x] room.html (hero / snb nav / 객실명·구조·인원·평형·집기 / 이미지·갤러리, ?room_id 현재객실)
- [x] facility.html (hero/snb/현재시설 tits·dimg/하단 전체시설 슬라이더)
- [x] reservation.html (hero / 이용안내=usageGuide / 환불안내=refundPolicies)
- [x] nearby-attractions.html (주변여행지: hero/subtitle/nav/list 동적, 앵커 스파이 동적화, oreuda 본문)
- [x] 팝업 (homepage.customFields.popup.popups, 박스 단위 '오늘 하루 보지 않기')
- [x] 404.html (enabled=false 리다이렉트 대상, 헤더/푸터 동적, 테마 변수 적용)
- [x] theme.css 변수화 (color primary/secondary + font ko-main/ko-sub/en-main, style.css 하드코딩 치환)
- [x] 모바일 우측하단 플로팅 예약 버튼(`.btn_reserve_fixed`, `data-booking-link`)

---

## 공통 상수

### totalRoomCount 한글 변환 테이블

```js
const ROOM_COUNT_LABELS = {
  bedroom: "침대룸",
  bathroom: "화장실",
  livingRoom: "거실",
  ondol: "온돌룸",
  kitchen: "주방",
};
```

값이 1 이상인 항목만 나열. `roomStructures`와 조합:

```
roomStructures[0] + "/ " + 값≥1인 항목들 나열
예) "원룸형/ 침대룸 화장실 주방"
```

### 이미지 선택 규칙

- `isSelected === true` 인 이미지를 `sortOrder` 순으로 사용.
- `customFields.roomtypes[].images` 는 `category`(`roomtype_thumbnail`/`roomtype_interior`/`roomtype_exterior`)로 구분.

---

## common/header.html

> F(dawonhill) 메뉴 구조: ABOUT(외부풍경/오시는길) · ROOMS(미리보기 + 객실) · SPECIAL(시설) · RESERVE(예약하기/이용안내) · **TRAVEL(주변여행지)** 5개. **PC `.hd_lnb` / 모바일 `.aside` 2곳에 동일 메뉴**가 존재하며 동적 매핑은 양쪽 모두 적용. 헤더 끝에 `top-btn`·`custom_cursor`(scroll-wrap 밖 fixed 요소)도 포함.

| data-\* 속성                   | 요소                                                                                              | JSON 경로                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `data-logo`                    | 로고 `<img>` (`.logo a > img`)                                                                    | `homepage.images[0].logo[isSelected].url` (없으면 placeholder, width 140px)                          |
| `data-booking-link`            | 예약하기 `<a>` (RESERVE 대메뉴/소메뉴, btn_reserve PC, aside, 모바일 플로팅 `.btn_reserve_fixed`) | `property.realtimeBookingId` (값 있으면 `href`에 직접 주입 + `target=_blank`, 빈값이면 미적용)       |
| `data-ybs-button`              | YBS `<a>` (`.btn_ybs`)                                                                            | `property.ybsId` (없으면 숨김, `https://rev.yapen.co.kr/external?ypIdx={ybsId}`)                     |
| `data-rooms-submenu`           | PC ROOMS 서브 `<ul.depth_box>`                                                                    | `customFields.roomtypes[]` (미리보기 다음 동적 생성)                                                 |
| `data-rooms-submenu-mobile`    | 모바일 ROOMS 서브 `<ul.depth_list>`                                                               | `customFields.roomtypes[]` (동일)                                                                    |
| `data-facility-submenu`        | PC SPECIAL 서브 `<ul.depth_box>`                                                                  | `property.facilities[]` (동적 생성)                                                                  |
| `data-facility-submenu-mobile` | 모바일 SPECIAL 서브 `<ul.depth_list>`                                                             | `property.facilities[]` (동일)                                                                       |
| `data-menu-id="layout-map"`    | 미리보기 `<li>` (헤더 ROOMS PC·모바일 + layout-map·room snb 공통)                                 | `customFields.pages.layoutMap.sections[0].enabled` (false면 숨김, `mapPreviewMenu`가 문서 전체 토글) |
| `data-travel-menu`             | **TRAVEL 대메뉴** (PC `<li.depth1>` / 모바일 `.depth1`+`.depth_list`)                             | `customFields.pages.nearbyAttractions.sections[0].enabled` (false면 대/소메뉴 모두 숨김)             |

- ROOMS 서브메뉴: `customFields.roomtypes[].name`(빈 이름 skip) 기준 `<li data-mapped><a href="room.html?id={id}">` 생성.
- SPECIAL 서브메뉴: `property.facilities[].name` 기준 `<li data-mapped><a href="facility.html?id={id}">` 생성.
- 미리보기 `<li data-menu-id="layout-map">`는 정적 baseline로 보존, 동적 객실은 그 뒤에 추가.

---

## common/footer.html

> F(dawonhill) 푸터: `.ft_logo`(상호) · `.ft_tel`(전화) · `.ft_info`(주소/사업자번호/대표자/YBS) · `.ft_copy`(개인정보/저작권). `footer_wrap` 배경 `#867165`, **매핑 내용은 흰색**(`styles/style.css` 오버라이드).

| data-\* 속성                  | 요소                           | JSON 경로                                                   |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `data-footer-business-name`   | `.ft_logo .stxt`               | `property.businessInfo.businessName` (없으면 property.name) |
| `data-footer-phone`           | `.ft_tel` 전화번호 `<span>`    | `property.contactPhone[0]`                                  |
| `data-footer-phone-link`      | `.ft_tel` `<a>` (tel: 링크)    | `tel:{contactPhone[0] 숫자만}`                              |
| `data-footer-address`         | `.ft_info` 주소 `<span>`       | `property.businessInfo.businessAddress`                     |
| `data-footer-business-number` | `.ft_info` 사업자번호 `<span>` | `property.businessInfo.businessNumber`                      |
| `data-footer-representative`  | `.ft_info` 대표자 `<span>`     | `property.businessInfo.representativeName`                  |
| `data-ybs-button`             | `.ft_info` YBS `<a>`           | `property.ybsId` (없으면 숨김)                              |

- `.ft_logo .btxt`(영문 장식), 개인정보처리방침은 **정적 유지**(트립일레븐 공통). copyright 는 `property.tripProviderName` 으로 치환한다(아래 「카피라이트」).

---

## SEO / 메타 (전 페이지 공통)

`homepage.seo`를 head에 동적 주입한다. 각 HTML은 `<title data-page-title>` + `<meta property="og:type" content="website">`만 두고, **하드코딩 SEO 메타(keywords, og:title/description/image/url, al:web:url, google/naver-site-verification, 기존 title)는 제거**했다.

- **standalone(배포)**: `header-footer-mapper.js`가 `headerFooterLoaded`에서 `updateMetaTags()`(title/description/keywords) + `mapOgTags()`(og:title/og:description)를 주입.
- **백오피스 preview**: `preview-handler.js`의 `applySeo()`가 admin 데이터로 동일 항목을 실시간 주입(`_setMeta`).

| 대상                                         | JSON 경로                  |
| -------------------------------------------- | -------------------------- |
| `<title data-page-title>` + `document.title` | `homepage.seo.title`       |
| `<meta name="description">`                  | `homepage.seo.description` |
| `<meta name="keywords">`                     | `homepage.seo.keywords`    |
| `<meta property="og:title">`                 | `homepage.seo.title`       |
| `<meta property="og:description">`           | `homepage.seo.description` |

---

## 테마 색상/폰트

`styles/theme.css`의 `:root` 변수로 정의 → 이 파일만 교체하면 테마 변경.

| 변수                | 기본값                                   | 백오피스 매핑           |
| ------------------- | ---------------------------------------- | ----------------------- |
| `--color-primary`   | `#eae0d7` (라이트/베이지)                | `theme.color.primary`   |
| `--color-secondary` | `#867165` (메인 브라운)                  | `theme.color.secondary` |
| `--font-ko-main`    | `'Noto Serif KR'` (명조, 웹폰트)         | `theme.font.koMain`     |
| `--font-ko-sub`     | `'Pretendard'` (본문, 로컬 @font-face)   | `theme.font.koSub`      |
| `--font-en-main`    | `'Roustel'` (영문 장식, 로컬 @font-face) | `theme.font.enMain`     |

- `style.css`의 브랜드 색/폰트 하드코딩을 위 변수로 치환. 브라운/베이지 명도 변형은 `rgb(from var(--color-...) r g b / a)`(상대색)로 투명도 파생.
- 무채색(#fff/#333/그레이 등)·보조 디자인 폰트(`Montserrat`)·일부 장식 폰트(`Roustel` 일부 자리)·강조 노랑(`#ffa81a`)은 의도적으로 하드코딩 유지.
- 폰트 로드: ko-main(Noto Serif KR)은 theme.css `@import`, ko-sub/en-main은 `reset.css` 로컬 `@font-face`, Montserrat는 reset.css `@import`. 미사용 폰트(JejuMyeongjo·Abigail·Travel November·Qwigley)·손상 `roustel.woff2` 제거.

---

## index.html

> F(dawonhill) index 구성: **vimeoWrap**(signature, 영상 있는 숙소만) → **main_visual**(hero) → **main_about**(Greeting=essence) → **main_room**(roomtypes) → **main_memory**(closing) → **main_stay**(gallery + 예약). 매퍼 `js/data-mapper/pages/index-mapper.js`. 데이터 소스는 `customFields.pages.index.sections[0]`의 hero/essence/closing/gallery 블록 + `customFields.roomtypes` + `property`.

| data-\* 속성                    | 요소                                             | JSON 경로                                                                 |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `data-index-signature`          | `.vimeoWrap` (main_visual 위 영상 밴드)          | `pages.index.sections[0].signature` — `mediaType==='video'` 이면 `videos[isSelected][0].url` 을 `<video autoplay muted loop playsinline>` 으로 삽입, 아니면 영역째 `display:none` |
| `data-index-hero-slides`        | `.main_visual .swiper-container .swiper-wrapper` | `pages.index.sections[0].hero.images[isSelected]` (배경 슬라이드 rebuild) |
| `data-index-about-eyebrow`      | main_about `.fl h3 > span`                       | `hero.title` (빈 값도 반영)                                               |
| `data-index-about-title`        | main_about `.fl h3 > i`                          | `essence.title`                                                           |
| `data-index-about-description`  | main_about `.fl .stxt p`                         | `essence.description` (\n→`<br>`)                                         |
| `data-index-about-image`        | main_about `.about-img01` (배경)                 | `essence.images[isSelected][0].url`                                       |
| `data-index-room-slides`        | `.main_room .room-slide .swiper-wrapper`         | `customFields.roomtypes[]` (rebuild, 링크 `room.html?room_id={id}`)       |
| `data-index-memory-description` | main_memory `.txt p`                             | `closing.description` (\n→`<br>`)                                         |
| `data-index-memory-image`       | main_memory `.img` (배경)                        | `closing.images[isSelected][0].url`                                       |
| `data-index-stay-name-en`       | main_stay `.tits h3`                             | `property.nameEn` (숙소 영문명)                                           |
| `data-index-stay-tagline`       | main_stay `.tits p`                              | `gallery.title`                                                           |
| `data-index-stay-name`          | main_stay `.fl h4`                               | `property.name`                                                           |
| `data-index-stay-description`   | main_stay `.fl p`                                | `gallery.description` (\n→`<br>`)                                         |
| `data-index-stay-images`        | main_stay `.fr ul`                               | `gallery.images[isSelected]` (li 3칸 `.img p` 배경만 교체, 레이아웃 유지) |
| `data-booking-link`             | main_stay 예약하기 `<a>`                         | `property.realtimeBookingId` (header-footer-mapper 공통)                  |

> `.vimeoWrap`(signature)은 원본 사이트에서 히어로 슬라이더 위에 얹히는 영상 밴드로, 숙소에 따라 있고 없다. 크롤러(`trip-template-crawlers/template-f`)가 `.vimeoWrap video` 를 찾아 `signature.videos` 로 넣고 `mediaType` 을 `video` 로 세팅한다. 영상이 없으면 `videos: []` / `mediaType: 'image'` 로 나가고 템플릿이 영역을 숨긴다.

> 영문/장식 글귀(`.main_about` Private/Greeting/오직당신만을위한, `.main_memory` Memory)는 디자인 장식이라 **정적 유지**. `.main_stay h3`(Dawonhill)은 `property.nameEn`(숙소 영문명)으로 매핑. 값이 비면 디자인 기본 텍스트 유지(빈값 미주입).

### data-index-hero-slides 슬라이드 구조

```
hero.images[isSelected] 기준 (rebuild 후 window.initVisualSwiper() 재초기화):
<div class="swiper-slide" style="background:url({url}) center;background-size:cover;"></div>
이미지 없으면 회색 placeholder 1개
```

### data-index-room-slides 슬라이드 구조 (customFields.roomtypes[] 순회, rooms[] 미사용)

```
- 이미지: getRoomtypeThumbnailUrl (roomtype_thumbnail → roomtype_interior → 첫 이미지)
- btxt:   roomtypes[i].name
- stxt:   roomtypes[i].nameEn
- 링크:   room.html?room_id={roomtypes[i].id}
이름 없는 roomtype은 skip. rebuild 후 window.initRoomSwiper() 재초기화.
```

---

## main.html

> F(dawonhill) main(=ABOUT/외부풍경) 구성: **sub_visual**(hero 슬라이더) → **snb_wrap**(서브탭) → **about-wrap** `.info`(hero: 이미지2 + 설명) + `.vimg`(about[] 개수만큼 동적 생성). 매퍼 `js/data-mapper/pages/main-mapper.js`. 데이터 소스 `customFields.pages.main.sections[0]`(hero / about[]).

| data-\* 속성                  | 요소                                            | JSON 경로                                         |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `data-main-hero-slides`       | `.sub_visual .swiper-container .swiper-wrapper` | `hero.images[isSelected]` (배경 슬라이드 rebuild) |
| `data-main-about-images`      | about-wrap `.info .fr ul`                       | `hero.images[isSelected]` (li 2칸 `.img` 배경)    |
| `data-main-about-description` | about-wrap `.info .fl p`                        | `hero.description` (\n→`<br>`)                    |
| `data-main-about-blocks`      | `.about-wrap` (컨테이너)                        | `about[]` — 항목마다 `.vimg` 블록 동적 생성       |

- `#snb_wrap`: ABOUT 서브탭(외부풍경→`/main.html`, 오시는길→`/directions.html`). 정적. 현재 페이지 `li.on`. (주변여행지는 헤더 TRAVEL 대메뉴로 분리)
- 영문 장식(`.info .fl h4` EXTERIOR Prologue)은 정적. hero 화살표(`visual_prev/next.png`)는 디자인 컨트롤.

### data-main-about-blocks 동적 `.vimg` 구조 (about[] 순회)

```
- class:  .vimg (+ 짝수번째 i%2==1 은 .vimg-alt → 이미지 좌상단 둥금, 기본은 우상단)
- h4:     about[i].title (없으면 'I support your beautiful trip.' fallback)
- .stit:  about[i].description (\n→<br>)
- .img:   about[i].images[isSelected][0] (background, 없으면 No-Image placeholder)
- 생성 요소는 fadeUp is-inview 부여(동적 주입이라 locomotive 미추적 → 즉시 표시)
```

### data-main-hero-slides 슬라이드 구조

```
hero.images[isSelected] 기준 (rebuild 후 window.initVisualSwiper() 재초기화):
<div class="swiper-slide" style="background:url({url}) center;background-size:cover;"></div>
이미지 없으면 회색 placeholder 1개
```

---

## directions.html

> F(dawonhill) directions(=오시는길) 구성: **sub_visual**(hero 슬라이더) → **snb_wrap**(서브탭, 정적) → **traffic-wrap**: tits(장식) + map_wrap(kakao 지도) + info_box(이용안내/주소). 매퍼 `js/data-mapper/pages/directions-mapper.js`.

| data-\* 속성                         | 요소                                            | JSON 경로                                                                               |
| ------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `data-directions-hero-slides`        | `.sub_visual .swiper-container .swiper-wrapper` | `pages.directions.sections[0].hero.images[isSelected]` (배경 슬라이드 rebuild)          |
| `#kakao-map`                         | `.map_wrap > #kakao-map`                        | `property.latitude` / `property.longitude` (kakao-maps-sdk 지도+마커, 좌표 없으면 skip) |
| `data-directions-notice-title`       | `.info_box dt h3`(이용안내)                     | `pages.directions.sections[0].notice.title`                                             |
| `data-directions-notice-description` | `.info_box dd`(이용안내)                        | `pages.directions.sections[0].notice.description` (\n→`<br>`, 없으면 행 숨김)           |
| `data-property-address`              | `.info_box dd`(주소) `<span>`                   | `property.address` (없으면 행 숨김)                                                     |

- `#snb_wrap`(외부풍경/오시는길)은 **정적 유지**(외부풍경→`/main.html`, 오시는길→`/directions.html`, 현재 오시는길 `li.on`).
- 지도: 원본 Daum roughmap(키 기반, 숙소 고정) 제거 → `<div id="kakao-map">` + `js/kakao-maps-sdk.js`(body 끝)로 교체. `roughmapLoader.js`는 미사용.
- `.tits h3`(Map DIRECTION) 영문 장식은 정적 유지. notice/주소 값 없으면 dt+dd 행 숨김.

---

## layout-map.html (= ROOMS 미리보기)

> F(dawonhill) 객실 미리보기/목록 페이지. 구성: **sub_visual**(hero) → **snb_wrap**(미리보기+객실) → **main_room**(객실 슬라이더) → **pre-wrap**(배치도). 매퍼 `js/data-mapper/pages/layout-map-mapper.js`. ROOMS "미리보기" 대상이며 `layoutMap.enabled=false`면 **404 리다이렉트**(헤더 ROOMS>미리보기 노출과 일관).

| data-\* 속성                  | 요소                                            | JSON 경로                                                                                  |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `data-layout-map-hero-slides` | `.sub_visual .swiper-container .swiper-wrapper` | `pages.layoutMap.sections[0].hero.images[isSelected]` (배경 슬라이드 rebuild)              |
| `data-room-list-nav`          | `#snb_wrap ul`                                  | `customFields.roomtypes[]` (미리보기 li 보존 + 뒤에 동적, `room.html?room_id={id}`)        |
| `data-room-list-slides`       | `.main_room .room-slide .swiper-wrapper.item`   | `customFields.roomtypes[]` (객실 카드 동적, initRoomSwiper 재초기화)                       |
| `data-layout-map-image`       | `.pre-wrap .vimg .img` (배경)                   | `pages.layoutMap.sections[0].about.images[isSelected][0].url` (배치도, 없으면 placeholder) |

### data-room-list-slides 슬라이드 구조 (customFields.roomtypes[] 순회, index 동일)

```
- 이미지: getRoomtypeThumbnailUrl (roomtype_thumbnail → roomtype_interior → 첫 이미지), 없으면 placeholder
- btxt:   roomtypes[i].name
- stxt:   roomtypes[i].nameEn
- 링크:   room.html?room_id={roomtypes[i].id}
이름 없는 roomtype은 skip. rebuild 후 window.initRoomSwiper() 재초기화.
```

- `enabled=false`/`sections[0]` 없으면 매퍼가 `404.html`로 리다이렉트(preview 포함). hero/배치도 영상·이미지 없으면 No-Image placeholder.

---

## room.html (객실 상세)

> URL `?room_id={roomtype.id}`로 현재 객실타입(current) 결정. 이미지/이름은 `customFields.roomtypes[current]`, 인원·평형·구조·집기는 `rooms[]`(roomtypes[current].id === rooms[j].id 매칭)에서 가져온다. current 없으면 첫 roomtype.

> 매퍼 `js/data-mapper/pages/room-mapper.js`. 구성: sub_visual(hero) → snb_wrap(미리보기+객실) → room-wrap(info: 객실명/유형/이미지/표/집기 + memory + vimg 갤러리). 이미지는 `roomtypes[current]` **interior**(isSelected, sortOrder; 없으면 전체 선택) 순서대로 분배.

| data-\* 속성               | 요소                                       | JSON 경로                                                                                          |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `data-room-hero-slides`    | `.sub_visual .swiper-wrapper`              | `roomtypes[current]` interior 이미지 (배경 슬라이드 rebuild + initVisualSwiper)                    |
| `data-room-list-nav`       | `#snb_wrap ul`                             | `roomtypes[]` (미리보기 li 보존 + 동적, 현재 `li.on`, `room.html?room_id={id}`)                    |
| `data-room-name`           | info h3 `<span>` + 표 객실명(PC/모바일)    | `roomtypes[current].name`                                                                          |
| `data-room-structure`      | info `p` + 표 유형(PC/모바일)              | `rooms[j].roomStructures.join('/') + "/ " + totalRoomCount 값≥1 한글` (id 매칭)                    |
| `data-room-base-occupancy` | 표 기준(PC/모바일)                         | `rooms[j].baseOccupancy`                                                                           |
| `data-room-max-occupancy`  | 표 최대(PC/모바일)                         | `rooms[j].maxOccupancy`                                                                            |
| `data-room-size`           | 표 평형(PC)                                | `rooms[j].size + "평"`                                                                             |
| `data-room-amenities`      | `.table_text` 집기품목(PC/모바일) `<span>` | `rooms[j].amenities.join(', ')`                                                                    |
| `data-room-image-thumb`    | info `.fl .img img` (src)                  | `roomtypes[current]` interior[0] (없으면 placeholder)                                              |
| `data-room-image-main`     | info `.fr .img` (배경)                     | `roomtypes[current]` interior[1]‖[0]                                                               |
| `data-room-memory-image`   | `.memory .img` (배경)                      | `roomtypes[current]` interior[2]‖[0]                                                               |
| `data-room-vimg-title`     | `.vimg h4`                                 | `customFields.pages.room[id].sections[0].hero.title` (없으면 'Make your romantic memory' fallback) |
| `data-room-vimg-desc`      | `.vimg p.stit`                             | `customFields.pages.room[id].sections[0].gallery.title` (\n→`<br>`, 없으면 하드코딩 fallback)      |
| `data-room-gallery`        | `.vimg ul`                                 | `roomtypes[current]` interior (li 배경+img 동적, 없으면 placeholder)                               |
| `data-room-floorplan-section` | `.room_floorplan` (제목 없음, 이미지 한 장) | 평면도 이미지가 없으면 **섹션 전체 미노출** |
| `data-room-floorplan-image` | `.room_floorplan img` | 원본 객실 상세의 평면도 영역에서 크롤링된 이미지 |

- `?room_id` 없으면 첫 명명 roomtype. 인원·평형·구조·집기는 `rooms[]`(id 매칭), vimg 텍스트는 `pages.room[]`(id 매칭)에서. 값 없으면 하드코딩 fallback 유지.
- `.memory .rtxt`는 정적. 객실명 `<span data-room-name>`은 reset(span 16px/#333)을 무시하도록 `h3 span[data-room-name]{...:inherit}` 로 h3 스타일 상속(데코 `span:first-child`=Rooms와 분리).

---


### 객실 평면도

평면도는 일반 객실 이미지로 대체하지 않는다. 크롤러가 원본 객실 상세의 **평면도 HTML 영역**을 따로 탐지해 아래 중 하나로 저장했을 때만 노출한다.

| 지원 데이터 형태                                                                           | 비고            |
| ------------------------------------------------------------------------------------------ | --------------- |
| `roomtypes[current].floorplanImages[]`                                                     | 권장            |
| `roomtypes[current].floorplans[]`                                                          | 호환            |
| `roomtypes[current].floorplan.images[]`                                                    | 호환            |
| `roomtypes[current].images[].category = "roomtype_floorplan"`                              | 카테고리형 호환 |
| `roomtypes[current].images[].category = "floorplan"` / `"room_floorplan"` / `"floor_plan"` | 카테고리형 호환 |

⚠️ **제목·설명 자리가 없다.** 도면 이미지 한 장이 전부다.
⚠️ **데이터가 없으면 `[data-room-floorplan-section]` 을 `display:none` 한다.** 마크업의 기본값도 `style="display:none"` 이라 매핑 전에도 빈 구간이 보이지 않는다. URL 이 있는데 로드가 실패해도 구간째 숨긴다.
⚠️ `roomtype_interior` / `roomtype_thumbnail` / `roomtype_exterior` 는 평면도 폴백으로 쓰지 않는다.
⚠️ `layout-map` 의 **배치도**는 반대로 이미지가 없어도 placeholder 를 세운다 — 숙소에 하나뿐인 자리라 업주가 넣을 곳을 알아야 하기 때문이다. 규칙이 정반대이니 헷갈리지 말 것.

⚠️ **백오피스가 아직 안 내려준다.** `groupName` 과 마찬가지로 앞으로 내려줄 예정이라 미리 대응해 둔 것이다. 시드에도 넣지 않는다.

## facility.html (SPECIAL 시설)

> URL `?id={facility.id}`로 현재 시설(current) 결정(없으면 첫 시설). 매퍼 `js/data-mapper/pages/facility-mapper.js`. 구성: sub_visual(hero) → snb_wrap(시설) → special-wrap(tits 현재시설 + dimg 현재시설 이미지 + 하단 vimg 전체시설 슬라이더).

| data-\* 속성                | 요소                              | JSON 경로                                                                                          |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `data-facility-hero-slides` | `.sub_visual .swiper-wrapper`     | `facilities[current].images[isSelected]` (배경 슬라이드 rebuild)                                   |
| `data-facility-nav`         | `#snb_wrap ul`                    | `facilities[]` (동적, 현재 `li.on`, `facility.html?id={id}`)                                       |
| `data-facility-name`        | `.tits h3 <span>`                 | `facilities[current].name` ("Special" 데코는 `span:first-child`)                                   |
| `data-facility-description` | `.tits p`                         | `facilities[current].description` (\n→`<br>`)                                                      |
| `data-facility-image`       | `.dimg .img` (배경)               | `facilities[current].images[isSelected][0]` (없으면 placeholder)                                   |
| `data-facility-name-en`     | `.dimg h4`                        | `property.nameEn` (숙소 영문명)                                                                    |
| `data-facility-gallery`     | `.dimg ul`                        | `facilities[current].images[isSelected]` (대표 다음 **고정 2칸**, 없는 칸 placeholder, 2열 그리드) |
| `data-facility-slides`      | `.vimg .spec-img .swiper-wrapper` | `facilities[]` (이미지 슬라이드, initSpecSwiper 재초기화)                                          |
| `data-facility-titles`      | `.vimg .spec-tit`                 | `facilities[]` (txt-con: `btxt`=name, `stxt`='Special,')                                           |
| `data-facility-texts`       | `.vimg .spec-txt .swiper-wrapper` | `facilities[]` (`0N. {name}` + description, `facility.html?id={id}`)                               |

- 하단 슬라이더 3영역(spec-img/tit/txt)은 동일 facilities[] 순서로 생성 후 `window.initSpecSwiper()` 재초기화(spec-txt↔spec-img thumbs 동기).
- 이미지 없으면 `ImageHelpers` placeholder. `.dimg h4`(Healing Pension 등 영문)는 정적 유지(데이터 영문명 없음). 예약 버튼은 헤더 공통 `data-booking-link`(`property.realtimeBookingId`).

## reservation.html (이용안내)

> F(dawonhill): sub_visual(hero) → reser-wrap(tits 장식 + info_box: 이용안내 dd + 환불안내 dd). 매퍼 `js/data-mapper/pages/reservation-mapper.js`.

| data-\* 속성                       | 요소                          | JSON 경로                                                                                           |
| ---------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `data-reservation-hero-slides`     | `.sub_visual .swiper-wrapper` | `pages.reservation.sections[0].hero.images[isSelected]` (배경 슬라이드 rebuild)                     |
| `data-reservation-usage-guide`     | 이용안내 `dd`                 | `property.usageGuide` (\n→`<br>`)                                                                   |
| `data-reservation-refund-policies` | 환불안내 `dd`                 | `property.refundPolicies[]` (동적: `* 이용일 N일 이전 취소시 R% 환불`, 0일=`* 당일 취소시 R% 환불`) |

- `.tits h3`(Info RESERVATION) 영문/dt(이용안내·환불안내) 라벨은 정적. 예약 버튼은 헤더 공통 `data-booking-link`.

## nearby-attractions.html (주변여행지)

> F: oreuda 본문 + dawonhill 공통 헤더/푸터. 구성: **sub_visual**(hero) → **travel-wrap**: tits(장식 h3 + subtitle) + `.travel-slide`(좌측 sticky 앵커 네비) + `.travel-list`(우측 카드). 매퍼 `js/data-mapper/pages/nearby-attractions-mapper.js`, 인터랙션 `js/custom-oreuda.js`. 데이터 `customFields.pages.nearbyAttractions.sections[0]`(hero / about[] / enabled).

| data-\* 속성             | 요소                                           | JSON 경로                                                                              |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `data-nearby-hero-image` | `.sub_visual .visual_box .swiper-slide` (배경) | `hero.images[isSelected][0]` (**단일 고정 배경, 슬라이드 미사용**, 없으면 placeholder) |
| `data-nearby-subtitle`   | `.travel-wrap .tits p`                         | `hero.description`                                                                     |
| `data-nearby-nav`        | `.travel-slide ul`                             | `about[]` (앵커 네비 `<li><a href="#anchorNN">title</a>`, 첫 항목 active)              |
| `data-nearby-list`       | `.travel-list ul`                              | `about[]` (카드 동적 생성)                                                             |

- `data-nearby-list` 카드 구조 (about[] 순회, `i` 0-base):
  - `.sch#anchor{i+1 zero-pad}` — 네비 앵커 타깃 (네비 href와 매칭)
  - `.img` (배경 + `<img>`) ← `about[i].images[isSelected][0].url` (없으면 No-Image placeholder)
  - `.btxt` ← `about[i].title`
  - `.stxt` ← `about[i].description` (\n→`<br>`)
- 영문 장식(`.tits h3` Travel TOUR GUIDE)은 정적. 생성 요소는 `fadeUp is-inview`(즉시 표시).
- **앵커 스크롤스파이**: `custom-oreuda.js`가 하드코딩(`#anchor01~08`) 대신 `.travel-list .sch` 위치를 동적 계산(`window.refreshTravelSpy`). 앵커 클릭은 위임 처리. **locomotive 높이 보정**(`window.locoScroll.update`)으로 footer 도달.
- **메뉴/404**: 헤더 TRAVEL 대메뉴(`data-travel-menu`)는 `nearbyAttractions.enabled=false`면 대/소메뉴 모두 숨김(header-footer-mapper 공통). 매퍼는 `sections[0]` 없음/`enabled=false`면 `404.html`로 리다이렉트(preview 포함).

## 팝업 (popup)

> c/l/e 공통 컴포넌트 이식. `styles/popup.css` + `js/popup.js`(PopupManager). **index.html에만** 적용(`<div id="popup-container">` + `<script src="js/popup.js">` + popup.css link).

- 데이터: `homepage.customFields.popup.popups[]` (각 항목 `enabled`/`startDate`/`endDate`/`sortOrder`/`images[isSelected]`/`link`/`title`/`description`).
- 노출 조건: `enabled=true` + 표시기간 내 + (standalone) 오늘 숨김 아님 + 선택 이미지 1장 이상. 선택 이미지마다 박스 1개를 동시에 표시.
- standalone: `popup.js`가 `./standard-template-data.json` fetch. 백오피스 preview: `window.parent !== window`로 감지 + `preview-handler`가 `POPUP_UPDATE` 메시지(`updateFromPreview()`) 및 전체 데이터 갱신 시 `refreshPopupFromTemplate()`로 실시간 반영.
- 박스별 닫기 / "오늘 하루 보지 않기" / 배경·ESC 닫기. **"오늘 하루 보지 않기"는 박스(boxId=popupId+이미지index) 단위** → 같은 팝업의 다른 이미지 박스는 영향 없음(localStorage `popup_hidden_<boxId>`). 스타일은 c/l/e 동일.

## 404.html

> layout-map / nearby-attractions가 `enabled=false`일 때 리다이렉트 대상. D 스타일로 재구현(reset+theme+style, 헤더/푸터 동적, `var(--color-secondary)`/`var(--font-*)`). 기존 D 잔재(common.css/sub.css/jQuery) 의존 제거.

## 정리(미사용 제거)

- CSS: `vendor/aos.css`, `common.css`, `sub.css` 삭제
- JS: `aos.js`, `site-common.js`, `common.js`, `roughmapLoader.js`, `custom-oreuda.js`, `js/pages/*`, `room-list-mapper.js` 삭제. (jQuery·sly·cookie·swiper·gsap·ScrollTrigger·locomotive·polyfill·kakao-maps-sdk는 사용 중 → 유지)
- HTML: `room-list.html` 삭제(+ preview-handler 매핑 정리)
- 이미지: 콘텐츠 사진(`1~3*.webp`), `b_logo.png`, `real_clocko.png`, `price.png`, `mbt_reserve01/o01.png`, `talk.png`, `icon_down.png`(미사용) 삭제
- 폰트: 미사용 `JejuMyeongjo.*`·`abigail.*` (@font-face 정의 포함), 미사용 `@import`(Travel November·Qwigley), 손상된 `roustel.woff2` 삭제. Noto Serif KR `@import` 중복 제거(theme.css로 일원화)

---

## 객실 그룹 규칙 (`groupName`)

`roomtypes[].groupName`이 **하나라도 있으면** 그룹 모드로
동작한다. 없으면 객실 하나가 항목 하나다. 규칙은 `base-mapper.js` 한 곳에 있다.

**그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이다.**
Room Preview(미리보기) 카드는 그룹과 무관하게 **항상 전체 객실**을 깔고,
카드마다 자기 객실 상세로 연결한다 — 원본이 그렇다.

| 함수                     | 역할                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `hasRoomGroups()`        | `groupName` 이 하나라도 있는지                                            |
| `getRoomMenuItems()`     | 그룹 단위 항목 배열 — `{ label, groupName, roomtype(대표), roomtypes[] }` |
| `getRoomMenuLabel()`     | 메뉴에 쓸 이름 — **그룹명** (없으면 객실명)                               |
| `getRoomMenuLink()`      | **그룹의 첫 객실** 상세로 연결                                            |
| `isRoomMenuItemActive()` | 그룹 안 **어느 객실 id 로 들어와도** 그 항목을 활성으로 본다              |
| `renderRoomSlides()`     | 미리보기 카드 — **그룹을 쓰지 않고 `roomtypes[]` 전체**를 깐다            |

### 화면 흐름

```
헤더 ROOMS 메뉴        →  그룹명        (스파동 | 프리미엄동)
        ↓ 그룹명 클릭
그룹의 첫 번째 객실 상세 →  탭에 그 그룹의 모든 객실
                          (미리보기 | 에버골드 | 퍼블하제 | 유메)

Room Preview(미리보기)  →  전체 객실 (그룹과 무관), 카드마다 자기 객실 상세로 연결
```

### ⚠️ 객실 상세 탭은 그룹을 펼친다

헤더 ROOMS 메뉴는 그룹명 하나로 접히므로, **상세 페이지 탭까지 접으면 그룹의 첫 객실
외에는 헤더로 도달할 방법이 없다.** 그래서 탭은 현재 객실이 속한 그룹을 찾아
**그 그룹의 객실만** 렌더한다.

| 상황                             | 탭                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 그룹 밖 (미리보기 / 미그룹 객실) | `미리보기 \| 스파동 \| 프리미엄동 \| …`                                            |
| 그룹 안 (멤버 2실 이상)          | `미리보기 \| 에버골드 \| 퍼블하제 \| 유메`                                         |
| 멤버 1실 그룹                    | 펼치지 않음 — 항목이 하나뿐이라 탭이 비다시피 하고 그룹명 = 객실명이라 의미가 없다 |
| `groupName` 없음                 | 기존과 동일 (객실 하나가 항목 하나)                                                |

**다른 그룹은 이 줄에 섞지 않는다.** 그룹명과 객실명이 나란히 놓이면 부모/자식이
형제처럼 보인다. 다른 그룹으로는 헤더 ROOMS 메뉴나 미리보기를 거쳐 이동한다.
(미리보기에서는 어느 객실이든 바로 갈 수 있다.)

탭을 다시 그릴 때 **첫 li(`미리보기`)는 남기고** `data-generated="room"` 이 붙은
이전 생성분만 지운다. 통째로 비우면 미리보기로 돌아갈 길이 없어진다.

---

## 카피라이트 (`data-copyright`)

푸터 카피라이트는 `property.tripProviderName`(Trip11 공급자명)으로 렌더한다.

`common/footer.html` 의 카피라이트 요소에 템플릿 문자열을 두고,
`header-footer-mapper.js` 의 `mapCopyright()` 가 `{provider}` 를 치환한다.

```html
<a href="http://trip11.kr/" data-copyright="COPYRIGHT©{provider}. ALL RIGHTS RESERVED.">
  COPYRIGHT©(주)트립일레븐. ALL RIGHTS RESERVED.
</a>
```

| `property.tripProviderName` | 결과                                  |
| --------------------------- | ------------------------------------- |
| `"신비서"`                  | `COPYRIGHT©신비서. ALL RIGHTS RESERVED.` |
| `""` / 미입력               | HTML 에 적힌 기존 문구 그대로          |

- 문구 형식(대소문자, `ⓒ` 접두, `(주)` 표기)은 템플릿마다 달라서 **형식은 `data-copyright` 속성값이 갖고
  매퍼는 이름만 바꾼다**.
- 값이 없을 때(백오피스 미입력 → `""`) 는 건드리지 않으므로 기존 트립일레븐 문구가 그대로 남는다.
- `trip11.kr` 링크는 변경하지 않는다.
