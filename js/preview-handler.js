if (typeof window.PreviewHandler === 'undefined') {

class PreviewHandler {
    constructor() {
        this.currentData = null;
        this.isInitialized = false;
        this.adminDataReceived = false;
        this.fallbackTimeout = null;
        this.parentOrigin = null;
        // 마지막 POPUP_UPDATE 페이로드. popup.js 가 이 파일보다 늦게 로드돼
        // 메시지를 놓쳤을 때 popup.js 쪽에서 꺼내 쓴다.
        this.lastPopupData = null;
        this.init();
    }

    init() {
        window.addEventListener('message', (event) => {
            this.handleMessage(event);
        });

        this.notifyReady();

        this.fallbackTimeout = setTimeout(() => {
            if (!this.adminDataReceived) {
                this.loadFallbackData();
            }
        }, 2000);
    }

    notifyReady() {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'TEMPLATE_READY',
                data: {
                    url: window.location.pathname,
                    timestamp: Date.now()
                }
            }, this.parentOrigin || '*');
        }
    }

    async handleMessage(event) {
        const allowedOrigins = [
            'localhost',
            'admin.sinbibook.com',
            'admin.sinbibook.xyz',
            'backoffice.sinbibook.com',
            'backoffice.sinbibook.xyz',
            'backoffice.sinbibook.dev',
            'sinbibook.github.io',
            'file://',
            'null'
        ];

        const isAllowedOrigin = allowedOrigins.some(allowed => {
            // 같은 origin은 항상 허용
            if (event.origin === window.location.origin) {
                return true;
            }

            // localhost는 포트 번호 포함하여 체크
            if (allowed === 'localhost') {
                return event.origin.startsWith('http://localhost:') ||
                       event.origin.startsWith('https://localhost:') ||
                       event.origin === 'http://localhost' ||
                       event.origin === 'https://localhost';
            }

            // file:// 와 null은 정확히 매칭
            if (allowed === 'file://' || allowed === 'null') {
                return event.origin === allowed;
            }

            // 도메인은 https 프로토콜과 정확히 매칭
            return event.origin === `https://${allowed}` ||
                   event.origin === `http://${allowed}`;
        });

        if (!isAllowedOrigin) {
            return;
        }

        if (!this.parentOrigin) {
            this.parentOrigin = event.origin;
        }

        if (!event.data || typeof event.data !== 'object') {
            return;
        }

        const { type, data } = event.data;

        switch (type) {
            case 'INITIAL_DATA':
                await this.handleInitialData(data);
                break;
            case 'TEMPLATE_UPDATE':
                await this.handleTemplateUpdate(data);
                break;
            case 'PROPERTY_CHANGE':
                await this.handlePropertyChange(data);
                break;
            case 'PAGE_NAVIGATION':
                this.handlePageNavigation(event.data);
                break;
            case 'section_update':
                await this.handleSectionUpdate(data);
                break;
            case 'THEME_UPDATE':
                this.handleThemeUpdate(data);
                break;
            case 'POPUP_UPDATE':
                this.handlePopupUpdate(data);
                break;
        }
    }

    async handleInitialData(data) {
        this.currentData = data;
        this.isInitialized = true;
        this.adminDataReceived = true;

        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }

        const theme = this._getThemeFromData(data);
        if (theme) {
            this.applyThemeVariables(theme);
        }

        this.applySeo(data);

        await this.renderTemplate(data);
        this.refreshPopupFromTemplate(data);
        this.notifyRenderComplete('INITIAL_RENDER_COMPLETE');
    }

    // MAPPER: homepage.seo → <title data-page-title> + meta (description/keywords/og)
    applySeo(data) {
        const seo = (data && data.homepage && data.homepage.seo) || {};
        if (seo.title) {
            document.title = seo.title;
            document.querySelectorAll('[data-page-title]').forEach((el) => {
                el.textContent = seo.title;
            });
        }
        this._setMeta('name', 'description', seo.description);
        this._setMeta('name', 'keywords', seo.keywords);
        this._setMeta('property', 'og:title', seo.title);
        this._setMeta('property', 'og:description', seo.description);
    }

    // 메타 태그 동적 생성/갱신 (없으면 head에 추가)
    _setMeta(attr, key, content) {
        if (!content) return;
        let meta = document.head.querySelector('meta[' + attr + '="' + key + '"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, key);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    async handleTemplateUpdate(data) {
        this.adminDataReceived = true;

        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }

        const theme = this._getThemeFromData(data);
        if (theme) {
            this.applyThemeVariables(theme);
        }

        if (!this.isInitialized) {
            await this.handleInitialData(data);
            return;
        }

        if (data.rooms && Array.isArray(data.rooms)) {
            this.currentData = {
                ...this.currentData,
                rooms: [...data.rooms]
            };

            const dataWithoutRooms = { ...data };
            delete dataWithoutRooms.rooms;
            this.currentData = this.mergeData(this.currentData, dataWithoutRooms);
        } else {
            this.currentData = this.mergeData(this.currentData, data);
        }

        await this.renderTemplate(this.currentData);
        this.refreshPopupFromTemplate(this.currentData);
        this.notifyRenderComplete('UPDATE_COMPLETE');
    }

    async handleSectionUpdate(data) {
        this.adminDataReceived = true;

        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }

        if (!this.isInitialized) {
            return;
        }

        this.currentData = this.mergeData(this.currentData, data);
        await this.renderTemplate(this.currentData);
        this.refreshPopupFromTemplate(this.currentData);
        this.notifyRenderComplete('SECTION_UPDATE_COMPLETE');
    }

    async handlePropertyChange(data) {
        this.currentData = data;
        this.isInitialized = true;

        const theme = this._getThemeFromData(data);
        if (theme) {
            this.applyThemeVariables(theme);
        }

        await this.renderTemplate(data);
        this.refreshPopupFromTemplate(data);
        this.notifyRenderComplete('PROPERTY_CHANGE_COMPLETE');
    }

    _getThemeFromData(data) {
        return data?.homepage?.customFields?.theme || data?.theme;
    }

    getDefaultFonts() {
        if (this._cachedDefaultFonts) {
            return this._cachedDefaultFonts;
        }

        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        this._cachedDefaultFonts = {
            koMain: computedStyle.getPropertyValue('--font-ko-main').trim() || "'Noto Sans KR', sans-serif",
            koSub: computedStyle.getPropertyValue('--font-ko-sub').trim() || "'Pretendard', sans-serif",
            enMain: computedStyle.getPropertyValue('--font-en-main').trim() || "'Poppins', sans-serif"
        };

        return this._cachedDefaultFonts;
    }

    getDefaultColors() {
        if (this._cachedDefaultColors) {
            return this._cachedDefaultColors;
        }

        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        this._cachedDefaultColors = {
            primary: computedStyle.getPropertyValue('--color-primary').trim() || '#786659',
            secondary: computedStyle.getPropertyValue('--color-secondary').trim() || '#3f3025'
        };

        return this._cachedDefaultColors;
    }

    loadFontFromCdn(key, cdnUrl) {
        if (!cdnUrl || !key) return;

        const linkId = `font-cdn-${key}`;
        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = cdnUrl;
        document.head.appendChild(link);
    }

    loadFontFromWoff2(key, family, woff2Url) {
        if (!woff2Url || !family) return;

        const styleId = `font-woff2-${key}`;
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
@font-face {
    font-family: '${family}';
    src: url('${woff2Url}') format('woff2');
    font-weight: 400;
    font-display: swap;
}`;
        document.head.appendChild(style);
    }

    applyFont(fontValue, cssVar, defaultValue) {
        const root = document.documentElement;

        if (fontValue && typeof fontValue === 'object' && fontValue.family) {
            if (fontValue.cdn) {
                this.loadFontFromCdn(fontValue.key, fontValue.cdn);
            } else if (fontValue.woff2) {
                this.loadFontFromWoff2(fontValue.key, fontValue.family, fontValue.woff2);
            }

            const genericFamily = defaultValue.split(',').pop().trim() || 'sans-serif';
            root.style.setProperty(cssVar, `'${fontValue.family}', ${genericFamily}`);
            return;
        }

        root.style.setProperty(cssVar, defaultValue);
    }

    applyColor(colorValue, cssVar, defaultValue) {
        const root = document.documentElement;

        if (colorValue && typeof colorValue === 'string' && colorValue.trim()) {
            root.style.setProperty(cssVar, colorValue);
        } else {
            root.style.setProperty(cssVar, defaultValue);
        }
    }

    applyThemeVariables(theme) {
        const defaultFonts = this.getDefaultFonts();
        const defaultColors = this.getDefaultColors();
        const fontData = theme.font || theme;

        if (fontData) {
            if ('koMain' in fontData) this.applyFont(fontData.koMain, '--font-ko-main', defaultFonts.koMain);
            if ('koSub' in fontData) this.applyFont(fontData.koSub, '--font-ko-sub', defaultFonts.koSub);
            if ('enMain' in fontData) this.applyFont(fontData.enMain, '--font-en-main', defaultFonts.enMain);
        }

        if ('color' in theme) {
            if (!theme.color) {
                this.applyColor(null, '--color-primary', defaultColors.primary);
                this.applyColor(null, '--color-secondary', defaultColors.secondary);
            } else {
                if ('primary' in theme.color) this.applyColor(theme.color.primary, '--color-primary', defaultColors.primary);
                if ('secondary' in theme.color) this.applyColor(theme.color.secondary, '--color-secondary', defaultColors.secondary);
            }
        }
    }

    handleThemeUpdate(data) {
        if (!data) return;
        this.applyThemeVariables(data);
        this.notifyRenderComplete('THEME_UPDATE_COMPLETE');
    }

    handlePopupUpdate(data) {
        this.lastPopupData = data;
        if (window.popupManager) {
            window.popupManager.updateFromPreview(data);
        } else if (window.PopupManager) {
            window.popupManager = new window.PopupManager();
            window.popupManager.init().then(() => {
                window.popupManager.updateFromPreview(data);
            });
        }

        this.notifyRenderComplete('POPUP_UPDATE_COMPLETE');
    }

    // 템플릿 데이터에 팝업 정보가 실려온 경우에만 미리보기 팝업을 갱신한다.
    // popup 노드가 없는 갱신(다른 영역 수정)으로는 떠 있는 팝업을 건드리지 않는다.
    // (template-center-slider / template-full-banner-accordion 과 동일한 가드)
    refreshPopupFromTemplate(data) {
        var popupNode =
            (data && data.homepage && data.homepage.customFields && data.homepage.customFields.popup) ||
            (data && data.customFields && data.customFields.popup) ||
            null;
        if (!popupNode) return;

        var popups = Array.isArray(popupNode.popups) ? popupNode.popups : [];
        if (window.popupManager) {
            window.popupManager.updateFromPreview(popups);
        } else if (window.PopupManager) {
            window.popupManager = new window.PopupManager();
            window.popupManager.init().then(function () {
                window.popupManager.updateFromPreview(popups);
            });
        }
    }

    handlePageNavigation(messageData) {
        if (!messageData || !messageData.page) {
            return;
        }

        const pageMap = {
            'index': 'index.html',
            'main': 'main.html',
            'room': 'room.html',
            'facility': 'facility.html',
            'reservation': 'reservation.html',
            'directions': 'directions.html',
            'nearbyAttractions': 'nearby-attractions.html',
            'layoutMap': 'layout-map.html'
        };

        const targetPage = pageMap[messageData.page];

        if (!targetPage) {
            return;
        }

        // 현재 페이지와 동일하고 동일한 ID이면 리로드하지 않음
        const currentPage = this.getCurrentPageType();
        const urlParams = new URLSearchParams(window.location.search);
        const currentId = urlParams.get('id');

        const isSamePage = currentPage === messageData.page;
        const newId = messageData.roomId || messageData.facilityId || null;
        const isSameId = currentId === newId;

        if (isSamePage && isSameId) {
            return;
        }

        // 페이지 이동 전에 부모 창에 네비게이션 시작 알림
        this.notifyNavigationStart(messageData.page);

        // 페이지 이동 (현재 디렉토리 기준)
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        let newPath = `${basePath}${targetPage}`;

        // room 또는 facility 페이지인 경우 id 쿼리 파라미터 추가
        if (messageData.page === 'room' && messageData.roomId) {
            newPath += `?id=${encodeURIComponent(messageData.roomId)}`;
        } else if (messageData.page === 'facility' && messageData.facilityId) {
            newPath += `?id=${encodeURIComponent(messageData.facilityId)}`;
        }

        window.location.href = newPath;
    }

    notifyNavigationStart(page) {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'NAVIGATION_START',
                data: {
                    page: page,
                    timestamp: Date.now()
                }
            }, this.parentOrigin || '*');
        }
    }

    async renderTemplate(data) {
        const currentPage = this.getCurrentPageType();
        let mapper = null;

        switch (currentPage) {
            case 'index':
                if (window.IndexMapper) mapper = new IndexMapper();
                break;
            case 'main':
                if (window.MainMapper) mapper = new MainMapper();
                break;
            case 'room':
                if (window.RoomMapper) mapper = new RoomMapper();
                break;
            case 'facility':
                if (window.FacilityMapper) mapper = new FacilityMapper();
                break;
            case 'reservation':
                if (window.ReservationMapper) mapper = new ReservationMapper();
                break;
            case 'directions':
                if (window.DirectionsMapper) mapper = new DirectionsMapper();
                break;
            case 'nearbyAttractions':
                if (window.NearbyAttractionsMapper) mapper = new NearbyAttractionsMapper();
                break;
            case 'layoutMap':
                if (window.LayoutMapMapper) mapper = new LayoutMapMapper();
                break;
            default:
                return;
        }

        if (mapper) {
            mapper.data = data;
            mapper.isDataLoaded = true;
            await mapper.mapPage();
            if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
        }

        await this.waitForHeaderDOM();

        if (window.HeaderFooterMapper) {
            const headerFooterMapper = new window.HeaderFooterMapper();
            headerFooterMapper.data = data;
            headerFooterMapper.isDataLoaded = true;
            await headerFooterMapper.mapPage();
        }

        if (window._checkPageEnabled) {
            window._checkPageEnabled();
        }
    }

    async waitForHeaderDOM() {
        const maxWaitTime = 5000;
        const checkInterval = 50;
        let waitedTime = 0;

        return new Promise((resolve) => {
            const checkHeader = () => {
                const header = document.querySelector('header, .header');

                if (header) {
                    resolve();
                } else if (waitedTime >= maxWaitTime) {
                    resolve();
                } else {
                    waitedTime += checkInterval;
                    setTimeout(checkHeader, checkInterval);
                }
            };

            checkHeader();
        });
    }

    getCurrentPageType() {
        const path = window.location.pathname;

        if (path.includes('index.html') || path.endsWith('/') || path === '') return 'index';
        if (path.includes('main.html')) return 'main';
        if (path.includes('room.html')) return 'room';
        if (path.includes('facility.html')) return 'facility';
        if (path.includes('reservation.html')) return 'reservation';
        if (path.includes('directions.html')) return 'directions';
        if (path.includes('nearby-attractions.html')) return 'nearbyAttractions';
        if (path.includes('layout-map.html')) return 'layoutMap';

        return 'index';
    }

    mergeData(existing, updates) {
        return this.deepMerge(existing || {}, updates || {});
    }

    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] === null || source[key] === undefined) {
                result[key] = source[key];
            } else if (Array.isArray(source[key])) {
                result[key] = source[key].map((item, idx) => {
                    if (typeof item === 'object' && item !== null && result[key]?.[idx]) {
                        return this.deepMerge(result[key][idx], item);
                    }
                    return item;
                });
            } else if (typeof source[key] === 'object') {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    notifyRenderComplete(type) {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: type,
                data: {
                    timestamp: Date.now(),
                    page: this.getCurrentPageType()
                }
            }, this.parentOrigin || '*');
        }
    }

    async loadFallbackData() {
        const currentPage = this.getCurrentPageType();

        const mapperConfig = {
            'index': 'IndexMapper',
            'main': 'MainMapper',
            'room': 'RoomMapper',
            'facility': 'FacilityMapper',
            'reservation': 'ReservationMapper',
            'directions': 'DirectionsMapper',
            'nearbyAttractions': 'NearbyAttractionsMapper',
            'layoutMap': 'LayoutMapMapper'
        };

        const mapperClass = mapperConfig[currentPage];
        if (mapperClass && window[mapperClass]) {
            const mapper = new window[mapperClass]();
            await mapper.initialize();
        }

        if (window.HeaderFooterMapper) {
            const headerFooterMapper = new window.HeaderFooterMapper();
            await headerFooterMapper.initialize();
        }
    }
}

if (!window.previewHandler) {
    window.previewHandler = new PreviewHandler();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewHandler;
}

}
