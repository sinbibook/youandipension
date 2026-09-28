(function () {
  'use strict';

  function loadHTML(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load: ' + url);
      return res.text();
    });
  }

  function loadHeader() {
    return loadHTML('common/header.html').then(function (html) {
      var hw = document.getElementById('header-wrap');
      if (hw) {
        hw.innerHTML = html;
      } else {
        // 마운트가 없으면 body 시작에 header 요소만 주입 (하위호환)
        var temp = document.createElement('div');
        temp.innerHTML = html;
        var header = temp.querySelector('header, .header');
        if (header) document.body.insertBefore(header, document.body.firstChild);
      }
    });
  }

  function loadFooter() {
    return loadHTML('common/footer.html').then(function (html) {
      var fw = document.getElementById('footer-wrap');
      if (fw) {
        fw.innerHTML = html;
      } else {
        var temp = document.createElement('div');
        temp.innerHTML = html;
        var footer = temp.querySelector('footer, .footer_wrap');
        if (footer) document.body.appendChild(footer);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.loaderReady = Promise.all([loadHeader(), loadFooter()])
      .then(function () {
        document.dispatchEvent(new Event('headerFooterLoaded'));
      })
      .catch(function (err) {
        console.error('[header-footer-loader]', err);
        document.dispatchEvent(new Event('headerFooterLoaded'));
      });
  });
})();
