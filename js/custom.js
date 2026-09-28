$(function() {
    var ww = $(window).width();
    tl = TweenMax;

    gsap.registerPlugin(ScrollTrigger);
    $(window).load(function () {
        const locoScroll= new LocomotiveScroll({
            el: document.querySelector('.scroll-wrap'),
            smooth: true,
            smoothMobile: false,
            //getDirection: true,

            paused: true,
            onUpdate: () => {
                window.dispatchEvent(new Event('resize'));
            },
            multiplier:1.3,
            smartphone: {
                smooth: true,
            },
            tablet: {
                smooth: true,
            },
            //getSpeed: true,
            useKeyboard: true,
            //reloadOnContextChange: true
        });

        // 동적 콘텐츠(헤더/푸터/매핑/이미지) 주입으로 높이 변동 → locomotive 재계산(footer 도달) + 앵커 위치 갱신
        window.locoScroll = locoScroll;
        function _locoRefresh(){ locoScroll.update(); if (window.refreshTravelSpy) window.refreshTravelSpy(); }
        document.addEventListener('headerFooterLoaded', function () { setTimeout(_locoRefresh, 400); });
        [400, 900, 1600].forEach(function (t) { setTimeout(_locoRefresh, t); });
        window.addEventListener('load', _locoRefresh);

        // 앵커 클릭(동적 생성 대응: 이벤트 위임)
        $(document).on('click', '.anchor-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) locoScroll.scrollTo(target);
        });



        var lastScrollTop = 0;
        var delta = 0;

        var travelAnchors = [];
        // 동적 about 개수에 맞춰 앵커(.sch) 위치 계산 (스크롤 최상단 기준)
        window.refreshTravelSpy = function () {
            travelAnchors = $('.travel-list li .sch').map(function () { return $(this).offset().top; }).get();
        };
        setTimeout(window.refreshTravelSpy, 1000);

        locoScroll.on('scroll', (position) => {
            //스크롤 내릴 시
            // #header / .top-btn 은 async 주입(header.html)이라 주입 전 스크롤 콜백에서 null일 수 있음 → 가드
            var _hdr = document.querySelector('#header');
            var _topBtn = document.querySelector('.top-btn');
            if ((position.scroll.y) > delta + 80) {
                if (_hdr) _hdr.classList.add('on');
                if (_topBtn) _topBtn.classList.add('over');
            } else {
                if (_hdr) _hdr.classList.remove('on');
                if (_topBtn) _topBtn.classList.remove('over');
            }


            var scrollT=position.scroll.y;
            if(Math.abs(lastScrollTop - scrollT) <= delta)
                return; 

            //스크롤 
            if ((scrollT > lastScrollTop) && (lastScrollTop>0)) {
                //$('#header-wrap').addClass('fix');
            } else {
                //$('#header-wrap').removeClass('fix');
            }
            lastScrollTop = scrollT;
            /*$(".travel-list").find("li").each(function(){
				if((position.scroll.y) > $(this).find('.sch').offset().top ){
					var src = $(this).attr('data-index');
					$('.travel-slide').find('li').removeClass('active');
					$('.travel-slide').find('li').eq(src).addClass('active');	
				}
			})*/

            if (travelAnchors.length) {
                var active = 0;
                for (var ai = 0; ai < travelAnchors.length; ai++) {
                    if (lastScrollTop > travelAnchors[ai] - 250) active = ai;
                }
                $('.travel-slide li').removeClass('active');
                $('.travel-slide li').eq(active).addClass('active');
            }
            //console.log('스크롤'+ position.scroll.y)
            //console.log('앵커'+ $('#anchor01').offset().top)

        });

        var headerH = $('#header').outerHeight()
        const anchorLinks = document.querySelectorAll('.scroll_down');
        anchorLinks.forEach((anchorLink) => {
            let hashval = anchorLink.getAttribute('href');
            let target = document.querySelector(hashval);

            anchorLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                locoScroll.scrollTo(target);
            });
        });

        const anchorTop = document.querySelectorAll('.top-btn');
        anchorTop.forEach((anchorTop) => {
            let hashval = anchorTop.getAttribute('href');
            let target = document.querySelector(hashval);

            anchorTop.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                locoScroll.scrollTo(target);
            });
        });


        locoScroll.on("scroll", ScrollTrigger.update);


        ScrollTrigger.scrollerProxy(".scroll-wrap", {
            scrollTop(value) {
                return arguments.length
                    ? locoScroll.scrollTo(value, 0, 0)
                : locoScroll.scroll.instance.scroll.y;
            },
            getBoundingClientRect() {
                return {
                    top: 0,
                    left: 0,
                    width: window.innerWidth,
                    height: window.innerHeight
                };
            },
            pinType: document.querySelector('.scroll-wrap').style.transform ? "transform" : "fixed"
        });

        ScrollTrigger.addEventListener("refresh", () => locoScroll.update());
        ScrollTrigger.refresh();

        // index 전용 패럴럭스 애니메이션 (해당 섹션이 있는 페이지에서만 실행)
        if (document.querySelector('.main_about') || document.querySelector('.main_stay') || document.querySelector('.main_memory')) {
        gsap.to(".about-img01", {
            scrollTrigger: {
                trigger: ".main_about",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=10%",
                end: "+=60%",
                ease: Power1.linear
            },
            y:'10%'
        });
        gsap.to(".about-img02", {
            scrollTrigger: {
                trigger: ".main_about",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=10%",
                end: "+=60%",
                ease: Power1.linear
            },
            y:'-10%'
        });

        gsap.to(".stay-img01", {
            scrollTrigger: {
                trigger: ".main_stay",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=0%",
                end: "+=15%",
                ease: Power1.linear
            },
            y:'15%'
        });
        gsap.to(".stay-img02", {
            scrollTrigger: {
                trigger: ".main_stay",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=0%",
                end: "+=20%",
                ease: Power1.linear
            },
            y:'-15%'
        });
        gsap.to(".memory-txt", {
            scrollTrigger: {
                trigger: ".main_memory",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=0%",
                end: "+=60%",
                ease: Power1.linear
            },
            x:'5%'
        });


        gsap.to(".stay-img02", {
            scrollTrigger: {
                trigger: ".main_stay",
                scroller: ".scroll-wrap",
                scrub: true,
                start: "+=0%",
                end: "+=20%",
                ease: Power1.linear
            },
            y:'-15%'
        });
        }
    });


    // 드롭다운 배경/서브메뉴 높이를 실제 내용에 맞춰 계산
    // (roomtypes 개수가 데이터마다 달라 고정 높이로는 배경 밖으로 메뉴가 넘침)
    // 모든 depth_box는 top이 동일하므로 가장 높은 내용 기준 1회만 계산해 .header에 CSS 변수로 주입
    function updateLnbBgHeight() {
        var header = document.querySelector('.header');
        var bg = header && header.querySelector('.hd_lnb_bg');
        var boxes = header ? header.querySelectorAll('.hd_lnb .depth_box') : [];
        if (!bg || !boxes.length) return;

        var GAP = 40;                                   // 서브메뉴 아래 여백
        var boxTop = boxes[0].getBoundingClientRect().top;
        var limit = Math.max(160, window.innerHeight - boxTop - GAP);   // 화면 밖으로 나가지 않는 최대 높이

        var content = 0;
        Array.prototype.forEach.call(boxes, function (box) {
            if (box.scrollHeight > content) content = box.scrollHeight;
        });

        var boxH = Math.min(content, limit);
        header.style.setProperty('--lnb-box-h', Math.ceil(boxH) + 'px');
        header.style.setProperty('--lnb-bg-h', Math.ceil(boxTop - bg.getBoundingClientRect().top + boxH + GAP) + 'px');
        header.classList.toggle('is-lnb-scroll', content > limit);
    }

    // header on (헤더가 common/header.html로 async 주입되므로 이벤트 위임 사용)
    $(document).on('mouseenter', '.hd_lnb, .hd_lnb_bg', function() {
        updateLnbBgHeight();
        $('.depth_box, .hd_lnb_bg').addClass('on');
    });
    $(document).on('mouseleave', '.hd_lnb, .hd_lnb_bg', function() {
        $('.depth_box, .hd_lnb_bg').removeClass('on');
    });
    $(window).on('resize', function() {
        if ($('.hd_lnb_bg').hasClass('on')) updateLnbBgHeight();
    });


    // aside on off (이벤트 위임)
    $(document).on('click', '.btn_menu, .btn_close', function() {
        if ($('.aside').hasClass('on')) {
            $('.aside, .aside_bg').removeClass('on');
            $('#wrap').css({'z-index':'1000'});
            $('.aside_bg').stop().fadeOut();
        } else {
            $('.aside, .aside_bg').addClass('on');
            $('#wrap').css({'z-index':'9000'});
            $('.aside_bg').stop().fadeIn();
        }
    });
    $(document).on('click', '.aside_bg', function() {
        $('.aside, .aside_bg').removeClass('on');
        $('#wrap').css({'z-index':'1000'});
        $('.aside_bg').stop().fadeOut();
    });
    $(document).on('click', '.aside .depth1', function() {
        $('.depth_list').not($(this).next()).slideUp();
        $(this).next().slideToggle();
    });

    var visual_h = $('.visual').height();
    hd_h = $('.header').height();
    /*$('.scroll_down').on('click', function(e) {
        e.preventDefault();
        $('html, body').animate({'scrollTop':visual_h - hd_h + 1},600);
    });*/

    // 메인 비주얼 sld
    // 데이터 주입 후 재초기화 가능하도록 함수로 노출 (index-mapper가 hero 슬라이드 rebuild 후 호출)
    window.initVisualSwiper = function () {
      var _vEl = document.querySelector('.visual .swiper-container');
      if (!_vEl) return;
      if (window.visualSwiper) { window.visualSwiper.destroy(true, true); }
      window.visualSwiper = new Swiper('.visual .swiper-container', {
        loop: _vEl.querySelectorAll('.swiper-slide').length > 1,
        effect: 'fade',
        roundLengths: true,
        speed: 500,
        autoplay: {
            delay: 3000,      
            disableOnInteraction: false          
        },  
        pagination: {
            el: ".visual .swiper-pagination",
            type: "fraction",
            formatFractionCurrent: function (number) {
                return ('0' + number).slice(-2);
            },
            formatFractionTotal: function (number) {
                return ('0' + number).slice(-2);
            },
        },
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.visual .swiper-button-next', 
            prevEl: '.visual .swiper-button-prev', 
        },
      });
    };
    window.initVisualSwiper();
    $('.swiper-pause').on('click',function(){
        window.visualSwiper.autoplay.stop();
        $(this).hide();
        $('.swiper-start').css({'display':'inline-block'});
        return false;
    });
    $('.swiper-start').on('click',function(){
        window.visualSwiper.autoplay.start();
        $(this).hide();
        $('.swiper-pause').css({'display':'inline-block'});
        return false;
    });

    // 메인 about sld
    var mySwiper = undefined;
    function initSwiper() {
        if (ww > 641 && mySwiper == undefined) {
            mySwiper = new Swiper(".main_about .swiper-container", {
                speed : 2000,
                loop: false,
                slidesPerView: 4,
                spaceBetween: 20,
                roundLengths: true,
                breakpoints: {
                    320: {
                        slidesPerView:3,
                        spaceBetween: 10,
                    },
                    1024: {
                        slidesPerView: 4,
                        spaceBetween: 20,
                    },
                },
            });
        } else if (ww <= 641 && mySwiper != undefined) {
            mySwiper.destroy();
            mySwiper = undefined;
        }
    }
    initSwiper();

    // main_special / facility 하단 슬라이더 (데이터 주입 후 재초기화 가능하도록 함수로 노출)
    window.initSpecSwiper = function () {
      var _spTxt = document.querySelector('.spec-txt');
      var _spImg = document.querySelector('.spec-img');
      if (!_spTxt || !_spImg) return;
      var _spLoop = _spTxt.querySelectorAll('.swiper-slide').length > 1;
      if (window.specTxtSwiper) { window.specTxtSwiper.destroy(true, true); }
      if (window.specImgSwiper) { window.specImgSwiper.destroy(true, true); }
      window.specTxtSwiper = new Swiper('.spec-txt', {
        loop: _spLoop,
        spaceBetween: 10,
        speed: 500,
        effect: "fade",
        roundLengths: true,
        autoplay: {
            delay: 3000,      
            disableOnInteraction: false          
        },  
        navigation : {
            nextEl : '.spec-next',
            prevEl : '.spec-prev',
        },
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        on:{
            slideChangeTransitionStart: function(){
                const txt_slide_wrap = $(".spec-tit")
                const txt_wrap = txt_slide_wrap.find(".txt-con")
                txt_wrap.removeClass("on")
                txt_wrap.eq(this.realIndex).addClass("on")
            }
        }         
    });
      window.specImgSwiper = new Swiper('.spec-img', {
        loop: _spLoop,
        effect: "fade",
        spaceBetween: 10,
        speed: 500,
        roundLengths: true,
        autoplay: {
            delay: 3000,      
            disableOnInteraction: false          
        },  
        navigation : {
            nextEl : '.spec-next',
            prevEl : '.spec-prev',
        },
        thumbs: {
            swiper: window.specTxtSwiper
        },
        on:{
            slideChangeTransitionStart: function(){
                const txt_slide_wrap = $(".spec-tit")
                const txt_wrap = txt_slide_wrap.find(".txt-con")
                txt_wrap.removeClass("on")
                txt_wrap.eq(this.realIndex).addClass("on")
            }
        }
      });
    };
    window.initSpecSwiper();


    // main_room (데이터 주입 후 재초기화 가능하도록 함수로 노출 → index-mapper가 호출)
    window.initRoomSwiper = function () {
      var _rEl = document.querySelector('.room-slide');
      if (!_rEl) return;
      var _slideCount = _rEl.querySelectorAll('.swiper-slide').length;
      var _roomBox = _rEl.closest('.room');
      var _contBox = _rEl.closest('.cont');
      // 객실 2개 이하: 슬라이드 대신 정적 정사각형 배치 (참고: oreuda.co.kr)
      if (_slideCount <= 2) {
        if (window.roomSwiper) { window.roomSwiper.destroy(true, true); window.roomSwiper = null; }
        if (_roomBox) _roomBox.classList.add('is-static');
        if (_contBox) _contBox.classList.add('room-static');
        return;
      }
      if (_roomBox) _roomBox.classList.remove('is-static');
      if (_contBox) _contBox.classList.remove('room-static');
      if (window.roomSwiper) { window.roomSwiper.destroy(true, true); }
      window.roomSwiper = new Swiper('.room-slide', {
        speed: 500,
        roundLengths: true,
        autoplay: {
            delay: 3000,      
            disableOnInteraction: false          
        }, 
        pagination: {
            el: ".room-paging",
            type: "fraction",
            formatFractionCurrent: function (number) {
                return ('0' + number).slice(-2);
            },
            formatFractionTotal: function (number) {
                return ('0' + number).slice(-2);
            },
        },
        slidesPerView: 3,
        spaceBetween: 34,
        loop: _rEl.querySelectorAll('.swiper-slide').length > 3,
        navigation : {
            nextEl : '.room-next',
            prevEl : '.room-prev',
        },
        breakpoints: {
            1: {
                slidesPerView: 1,
                spaceBetween: 34,
            },
            580: {
                slidesPerView: 2,
                spaceBetween: 34,
            },
            860: {
                slidesPerView: 3,
                spaceBetween: 34,
            },
            1000: {
                slidesPerView: 3,
                spaceBetween: 34,
            },
            1280: {
                slidesPerView: 3,
                spaceBetween: 34,
            }
        },
      });
    };
    window.initRoomSwiper();

    // 서브 룸, 스페셜 카테고리 sld
    var swiper5 = document.querySelector('.sld_list_lnb') ? new Swiper(".sld_list_lnb", {
        slidesPerView: "auto",
        roundLengths: true,
        spaceBetween: 0,
        speed: 500,
        autoplay: {
            delay: 3000,      
            disableOnInteraction: false          
        },  
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
    }) : null;


    /*$(window).scroll(function() {
        // 스크롤 예약 버튼 on
        var cont_h = $('#container').outerHeight() - $(window).height() + $('.ft_btn_reserve').outerHeight();
        if ($(window).scrollTop() > cont_h) {
            $('.ft_btn_reserve, .ft_kakao').removeClass('on');
        } else {
            $('.ft_btn_reserve, .ft_kakao').addClass('on');
        }

    });*/

    $(window).on('resize', function() {
        ww = ww;
        initSwiper();
    });

    /*$('.travel-slide').find('li > a').click(function(){
        $(this).parent('li').addClass('active');
        $(this).parent('li').siblings('li').removeClass('active');
	});*/	

    // 커서 마크업은 header.html에 있어 비동기 주입됨 → loaderReady 이후 실행
    (window.loaderReady || Promise.resolve()).then(function () { customCursor(); });

    // FAQ_toggle
        $(document).ready(function() {
            $('.detail_btn, .arrow_link').click(function(event) {
                event.preventDefault();
                var parentLi = $(this).closest('li');
                var answerTxt = parentLi.find('.answer_txt');
                var downBtn = parentLi.find('.down_btn');
                var upBtn = parentLi.find('.up_btn');

                if (parentLi.hasClass('on')) {
                    answerTxt.slideUp(800, function() {
                        parentLi.removeClass('on');
                        downBtn.show();
                        upBtn.hide();
                    });
                } else {
                    $('.qna_item.on .answer_txt').slideUp(800);
                    $('.qna_item.on').removeClass('on').find('.down_btn').show().end().find('.up_btn').hide();

                    parentLi.addClass('on');
                    answerTxt.slideDown(800);
                    downBtn.hide();
                    upBtn.show();
                }
            });
        });
});


$(window).scroll(function() {
    // 스크롤 상단 on
    if ($(window).scrollTop() > 0) {
        $('#header').addClass('on');
    } else {
        $('#header').removeClass('on');
    }
});



function customCursor(){

    var $cursor_primary = $('#custom_cursor');
    var $cursor_secondary = $('#custom_cursor_text');
    if (!$cursor_primary.length || !$cursor_secondary.length) return; // 커서 마크업 없으면 no-op
    var $circle = $cursor_primary.find('.custom_cursor_circle');
    var $cursor_txt = $cursor_secondary.find('.custom_cursor_txt');


    $('body').mousemove(function(e) {
        TweenMax.to($cursor_primary, 0.3, {x: e.clientX,y: e.clientY,ease: Power3.easeOut});
        TweenMax.to($cursor_secondary, 0.5, {x: e.clientX,y: e.clientY,ease: Power3.easeOut});
    });


    $(document).on('mouseenter', '.custom_mousemove', function(){
        var $this = $(this);
        var words = ( $this.data('hover') != undefined ) ? $this.data('hover') : '';
        var size = ( $this.data('size') != undefined ) ? $this.data('size') : '100%';

        if( $this.hasClass('drag') ){
            $cursor_primary.addClass('drag');
            $cursor_secondary.addClass('drag');
        }

        $cursor_txt.find('> span').text( words );
        TweenMax.killTweensOf($circle);
        TweenMax.killTweensOf($cursor_txt);
        TweenMax.to($circle, .3, {width: size,height: size,autoAlpha: 1,ease: Power0.easeNone});
        TweenMax.to($cursor_txt, .3, {width: size,height: size,autoAlpha: 1,ease: Power0.easeNone});
    });

    $(document).on('mouseleave', '.custom_mousemove', function(){
        var $this = $(this);

        if( $this.hasClass('drag') ){
            $cursor_primary.removeClass('drag');
            $cursor_secondary.removeClass('drag');
        }

        TweenMax.killTweensOf($circle);
        TweenMax.killTweensOf($cursor_txt);
        TweenMax.to($circle, .2, {width: '0%',height: '0%',autoAlpha: 0,ease: Power0.easeNone});
        TweenMax.to($cursor_txt, .2, {width: '0%',height: '0%',autoAlpha: 0,ease: Power0.easeNone});
    });
}

function sizeControlMain(width) {
    width = parseInt(width);
    var bodyHeight = document.documentElement.clientHeight; 
    var bodyWidth = document.documentElement.clientWidth; 
    var docW = window.innerWidth;

    // .aside 높이는 CSS(height:100%)로 처리 — JS로 잡으면 async 헤더 주입과 레이스 발생

    var spectxtH = $('.spec-tit').find('.txt-con').outerHeight();
    $('.spec-tit').css({'height': spectxtH})

    if( docW > 780){
        var trActive = $('.travel-slide').find('li.active').index();
        $('.travel-slide').sly(false);
        $('.travel-slide').find('li').eq(trActive).addClass('active');
    }else{
        // travel-slide
        $('.travel-slide').sly({
            horizontal: 1,
            itemNav: 'basic',
            smart: 1,
            activateOn: 'click',
            mouseDragging: 1,
            touchDragging: 1,
            releaseSwing: 1,
            //startAt: 0,
            scrollBy: 1,
            //activatePageOn: 'click',
            speed: 600,
            elasticBounds: 1,
            easing: 'easeOutExpo',
            dragHandle: 1,
            dynamicHandle: 1,
            clickBar: 1,
        });
        $('.travel-slide').sly('reload');
    }

}
jQuery(function($){
    sizeControlMain($(this).width());
    $(window).resize(function() {
        if(this.resizeTO) {
            clearTimeout(this.resizeTO);
        }
        this.resizeTO = setTimeout(function() {
            $(this).trigger('resizeEnd');

        }, 10);
    });
});	
$(window).on('resizeEnd', function() {
    sizeControlMain($(this).width());
});
$(window).load( function() { 
    sizeControlMain($(this).width());
});

// 메인 special sld
var swiper3 = document.querySelector('.main_special .swiper-container') ? new Swiper('.main_special .swiper-container', {
    autoplay : {  
        delay : 1500, 
        disableOnInteraction: false,
    },
    roundLengths: true,
    slidesPerView: 1,
    spaceBetween: 0,
    speed : 1500,
    //effect: "fade",
    loop: true,
    navigation: {
        nextEl: '.main_special .swiper-button-next', 
        prevEl: '.main_special .swiper-button-prev', 
    },
    followFinger:true,
    initialSlide:1,
    on: {
        slideChange: function () {
            var this_name = $('.main_special .swiper-slide').eq(this.realIndex + 1).data('name');
            $('.main_special .title_box h4').text(this_name);
        }
    }
}) : null;


















