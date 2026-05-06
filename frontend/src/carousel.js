const API_BASE = 'http://localhost:8000'

export function buildCarousel(images, emptyEmoji = '🌙') {
  const wrap = document.createElement('div')
  wrap.className = 'carousel-wrap'

  if (!images || images.length === 0) {
    wrap.innerHTML = `<div class="post-modal__img--empty">${emptyEmoji}</div>`
    return wrap
  }

  if (images.length === 1) {
    wrap.innerHTML = `<img class="post-modal__img" src="${API_BASE}${images[0]}" />`
    return wrap
  }

  wrap.innerHTML = `
    <div class="carousel">
      <div class="carousel-track">
        ${images.map(url => `<img class="carousel-img" src="${API_BASE}${url}" loading="lazy" />`).join('')}
      </div>
      <button type="button" class="carousel-btn carousel-btn--prev">&#8249;</button>
      <button type="button" class="carousel-btn carousel-btn--next">&#8250;</button>
      <div class="carousel-dots">
        ${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'carousel-dot--active' : ''}"></span>`).join('')}
      </div>
      <span class="carousel-counter">1 / ${images.length}</span>
    </div>
  `

  let current = 0
  const track   = wrap.querySelector('.carousel-track')
  const dots    = [...wrap.querySelectorAll('.carousel-dot')]
  const counter = wrap.querySelector('.carousel-counter')

  function goTo(idx) {
    current = ((idx % images.length) + images.length) % images.length
    track.style.transform = `translateX(-${current * 100}%)`
    dots.forEach((d, i) => d.classList.toggle('carousel-dot--active', i === current))
    counter.textContent = `${current + 1} / ${images.length}`
  }

  wrap.querySelector('.carousel-btn--prev').addEventListener('click', e => { e.stopPropagation(); goTo(current - 1) })
  wrap.querySelector('.carousel-btn--next').addEventListener('click', e => { e.stopPropagation(); goTo(current + 1) })

  return wrap
}
