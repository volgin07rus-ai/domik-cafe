/* «Домик» — взаимодействие и анимация.
   GSAP 3.13 (CDN, defer) + ScrollTrigger + ScrollToPlugin.
   Без GSAP страница полностью читабельна: класс .anim снимается. */
(function () {
  'use strict';

  window.__domikReady = true; /* предохранитель в <head> проверяет этот флаг */

  var doc = document.documentElement;
  var staticMode = doc.classList.contains('static');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || staticMode;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  if (!hasGsap || reduceMotion) doc.classList.remove('anim');

  /* ---------- шапка: фон при скролле ---------- */
  var header = document.getElementById('header');
  var hTick = false;
  function headerState() {
    header.classList.toggle('is-scrolled', (window.scrollY || 0) > 8);
    hTick = false;
  }
  window.addEventListener('scroll', function () {
    if (!hTick) { requestAnimationFrame(headerState); hTick = true; }
  }, { passive: true });
  headerState();

  /* ---------- мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      burger.focus();
    }
  });

  /* ---------- зёрна: дрейф вниз через весь сайт, закольцованы ---------- */
  var beans = Array.prototype.slice.call(document.querySelectorAll('.bean'));
  if (beans.length && !reduceMotion) {
    var bTick = false;
    function beansDrift() {
      var vh = window.innerHeight;
      var sy = window.scrollY || 0;
      // общий цикл для всех — зёрна одной скорости держат фиксированный интервал
      var cycle = vh + 320;
      beans.forEach(function (b) {
        var h = b.offsetHeight || 90;
        var t0 = parseFloat(b.dataset.top) || 0;
        var s = parseFloat(b.dataset.speed) || 0.2;
        var y = (((t0 * cycle + sy * s) % cycle) + cycle) % cycle - h - 40;
        b.style.setProperty('--y', y.toFixed(1) + 'px');
      });
      bTick = false;
    }
    window.addEventListener('scroll', function () {
      if (!bTick) { requestAnimationFrame(beansDrift); bTick = true; }
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (!bTick) { requestAnimationFrame(beansDrift); bTick = true; }
    });
    beansDrift();
  }

  /* ---------- гирлянда в тёмном блоке ---------- */
  var lights = document.querySelector('.lights');
  function buildLights() {
    if (!lights) return;
    var n = Math.max(10, Math.round(lights.clientWidth / 52));
    var html = '';
    for (var i = 0; i < n; i++) html += '<i class="bulb" style="--i:' + i + '"></i>';
    lights.innerHTML = html;
  }
  buildLights();
  var lrT;
  window.addEventListener('resize', function () {
    clearTimeout(lrT); lrT = setTimeout(buildLights, 200);
  });

  /* ---------- карусель ---------- */
  var track = document.getElementById('carTrack');
  var prev = document.getElementById('carPrev');
  var next = document.getElementById('carNext');
  if (track && prev && next) {
    function step() {
      var card = track.querySelector('.ccard');
      return card ? card.getBoundingClientRect().width + 22 : 300;
    }
    function slide(dir, btn) {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      track.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { slide(-1, prev); });
    next.addEventListener('click', function () { slide(1, next); });
    var cTick = false;
    function carState() {
      var max = track.scrollWidth - track.clientWidth;
      prev.setAttribute('aria-disabled', String(track.scrollLeft <= 4));
      next.setAttribute('aria-disabled', String(track.scrollLeft >= max - 4));
      cTick = false;
    }
    track.addEventListener('scroll', function () {
      if (!cTick) { requestAnimationFrame(carState); cTick = true; }
    }, { passive: true });
    carState();

    /* перетаскивание мышью (тач — нативный скролл) */
    var dragging = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false;
      startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('is-grabbing');
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-grabbing');
      try { track.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('pointerleave', endDrag);
    /* не давать перетаскивать картинки и кликать после драга */
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ---------- полароиды: 3D-наклон за курсором ---------- */
  var pols = Array.prototype.slice.call(document.querySelectorAll('.pol'));
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (pols.length && finePointer && !reduceMotion) {
    pols.forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
          raf = null;
        });
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------- форма подписки (бэкенд подключим позже) ---------- */
  var form = document.getElementById('subForm');
  var ok = document.getElementById('subOk');
  var err = document.getElementById('subErr');
  if (form && ok) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('.sub__input');
      var val = (input.value || '').trim();
      var good = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
      if (!good) {
        input.classList.add('is-err');
        input.setAttribute('aria-invalid', 'true');
        if (err) { err.hidden = false; input.setAttribute('aria-describedby', 'subErr'); }
        input.focus();
        if (hasGsap && !reduceMotion) {
          gsap.fromTo(input, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1, .35)' });
        }
        return;
      }
      input.classList.remove('is-err');
      input.removeAttribute('aria-invalid');
      if (err) err.hidden = true;
      form.hidden = true;
      var note = document.querySelector('.sub__note');
      if (note) note.hidden = true;
      ok.hidden = false;
      ok.setAttribute('tabindex', '-1');
      ok.focus();
      if (hasGsap && !reduceMotion) {
        gsap.from(ok, { y: 14, autoAlpha: 0, duration: .6, ease: 'power3.out' });
      }
    });
    form.querySelector('.sub__input').addEventListener('input', function () {
      this.classList.remove('is-err');
      this.removeAttribute('aria-invalid');
      if (err) err.hidden = true;
    });
  }

  /* ---------- якоря: нативный плавный скролл (CSS scroll-behavior + scroll-padding),
     фокус и hash работают из коробки; наша задача — только закрыть мобильное меню ---------- */
  Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (link) {
    link.addEventListener('click', function () { closeMenu(); });
  });

  /* ---------- GSAP: появления, параллакс, дорисовка линий ---------- */
  if (!hasGsap || reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 0.7 });

  /* каскадные появления (галерея отдельно — у неё своя анимация) */
  ScrollTrigger.batch('.sr:not(.g__tile)', {
    start: 'top 85%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: .8, stagger: .1, overwrite: true });
    }
  });

  /* галерея: плитки выпрыгивают от центра сетки */
  gsap.set('.g__tile', { opacity: 0, y: 0, scale: .86 });
  ScrollTrigger.create({
    trigger: '.g__grid',
    start: 'top 82%',
    once: true,
    onEnter: function () {
      gsap.to('.g__tile', {
        opacity: 1, scale: 1, duration: .6, ease: 'back.out(1.4)',
        stagger: { each: .07, grid: 'auto', from: 'center' }
      });
    }
  });

  /* дорисовка волнистых линий под заголовками и в CTA */
  gsap.utils.toArray('.uline polyline, .cta__zz polyline').forEach(function (line) {
    var len = line.getTotalLength();
    gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(line, {
      strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut',
      scrollTrigger: { trigger: line.closest('svg'), start: 'top 88%', once: true }
    });
  });

  /* мягкий параллакс (тарелка на столе) — только десктоп */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 800px)', function () {
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.dataset.parallax) || 0.2;
      gsap.fromTo(el,
        { y: function () { return speed * 70; } },
        {
          y: function () { return speed * -70; },
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') || el,
            start: 'top bottom', end: 'bottom top',
            scrub: true, invalidateOnRefresh: true
          }
        });
    });
  });

  /* высоты меняются после загрузки картинок */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
