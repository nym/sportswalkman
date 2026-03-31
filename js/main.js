/**
 * W Series Sports Walkman - Static Site Interactivity
 */
(function () {
  'use strict';

  // --- Carousel ---
  var carousel = document.querySelector('.carousel');
  if (carousel) {
    var slides = carousel.querySelectorAll('.slide');
    var pagination = carousel.querySelector('.pagination');
    var leftArrow = carousel.querySelector('.leftArrow');
    var rightArrow = carousel.querySelector('.rightArrow');
    var currentSlide = 0;
    var totalSlides = slides.length;
    var scrollContainer = carousel.querySelector('.scroll-container');

    // Build pagination dots
    for (var i = 0; i < totalSlides; i++) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = i + 1;
      a.dataset.position = i;
      if (i === 0) a.classList.add('selected');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        goToSlide(parseInt(this.dataset.position));
      });
      li.appendChild(a);
      pagination.appendChild(li);
    }

    function goToSlide(index) {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentSlide = index;

      // Size slides to container
      var width = carousel.offsetWidth;
      slides.forEach(function (s) { s.style.width = width + 'px'; });
      scrollContainer.style.width = (width * totalSlides) + 'px';
      scrollContainer.style.transform = 'translateX(' + (-width * currentSlide) + 'px)';
      scrollContainer.style.transition = 'transform 0.6s ease';

      // Update dots
      var dots = pagination.querySelectorAll('a');
      dots.forEach(function (d) { d.classList.remove('selected'); });
      dots[currentSlide].classList.add('selected');
    }

    leftArrow.addEventListener('click', function (e) {
      e.preventDefault();
      goToSlide(currentSlide - 1);
    });
    rightArrow.addEventListener('click', function (e) {
      e.preventDefault();
      goToSlide(currentSlide + 1);
    });

    // Initialize sizing
    window.addEventListener('resize', function () { goToSlide(currentSlide); });
    goToSlide(0);

    // Auto-advance every 6 seconds
    setInterval(function () { goToSlide(currentSlide + 1); }, 6000);
  }

  // --- Parts & Controls Feature Selector ---
  var partsScene = document.getElementById('partsScene');
  if (partsScene) {
    var featureItems = partsScene.querySelectorAll('#features li');
    featureItems.forEach(function (item, index) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        featureItems.forEach(function (fi) { fi.classList.remove('selected'); });
        item.classList.add('selected');
        // Update feature class on partsScene
        partsScene.className = partsScene.className.replace(/feature-\d/g, '');
        partsScene.classList.add('feature-' + index);
      });
    });
  }

  // --- Toggle between Parts & Controls / Easy to Use ---
  var toggleLinks = document.querySelectorAll('.content-area a.toggle');
  toggleLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var partsDiv = document.getElementById('partsScene');
      var pcDiv = document.getElementById('pcScene');
      if (partsDiv && pcDiv) {
        partsDiv.classList.toggle('hidden');
        pcDiv.classList.toggle('hidden');
      }
    });
  });

  // --- Color Selector ---
  var colorButtons = document.querySelectorAll('#waterScene .colors button');
  colorButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      colorButtons.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      if (typeof window.setHeadphoneColor === 'function') {
        window.setHeadphoneColor(btn.dataset.color);
      }
    });
  });

  // --- Video Lightbox ---
  var videoLinks = document.querySelectorAll('a.video');
  var lightbox = document.getElementById('pm-video');
  if (lightbox) {
    var closeBtn = lightbox.querySelector('.close');
    var videoContainer = document.getElementById('video-container');

    videoLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var videoId = link.dataset.video;
        if (videoId && videoContainer) {
          videoContainer.innerHTML = '<iframe width="840" height="460" src="https://www.youtube.com/embed/' + videoId + '?autoplay=1" frameborder="0" allowfullscreen></iframe>';
        }
        lightbox.classList.remove('hidden');
        lightbox.style.display = 'block';
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        lightbox.classList.add('hidden');
        lightbox.style.display = 'none';
        if (videoContainer) videoContainer.innerHTML = '';
      });
    }
  }

  // --- Social Media Tooltip Hover ---
  var socialItems = document.querySelectorAll('#social-media ul > li');
  socialItems.forEach(function (item) {
    item.addEventListener('mouseenter', function () {
      var tooltip = item.querySelector('.tooltip');
      if (tooltip) tooltip.classList.add('ShowButton');
    });
    item.addEventListener('mouseleave', function () {
      var tooltip = item.querySelector('.tooltip');
      if (tooltip) tooltip.classList.remove('ShowButton');
    });
  });

  // --- Smooth scroll-reveal for sections ---
  var sections = document.querySelectorAll('section');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  sections.forEach(function (s) { observer.observe(s); });

})();
