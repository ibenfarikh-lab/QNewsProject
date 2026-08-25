let headlineSlides = [];
let currentSlideIndex = 1;
let slideInterval;
let allSisaPosts = [];
let displayedLoadCount = 0;
let batchSize = 4;
let searchTimeout;
let adAutoCloseTimer;

let isDragging = false;
let startPos = 0;
let currentTranslate = 0;
let prevTranslate = 0;

// Inisialisasi Tema Manual (Dark/Light) dari LocalStorage
(function() {
    const savedTheme = localStorage.getItem('lintas_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

function toggleManualTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('lintas_theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('lintas_theme', 'dark');
    }
}

// Script Reading Progress Bar
window.addEventListener('scroll', function() {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) {
        progressBar.style.width = scrolled + '%';
    }
});

// --- INTERACTIVE DRAGGABLE SCROLLBAR LOGIC (FIXED TOUCH TRACKING) ---
let scrollIndicator, scrollThumb, hideScrollTimeout;
let isThumbDragging = false;
let thumbStartY = 0;
let startThumbTop = 0;
let startPageScrollY = 0;
let lastScrollTop = 0;

function initCustomScrollbar() {
    scrollIndicator = document.getElementById('custom-scroll-indicator');
    scrollThumb = document.getElementById('custom-scroll-thumb');
    if (!scrollIndicator || !scrollThumb) return;

    window.addEventListener('scroll', handlePageScroll, {passive: true});
    
    // Fitur Tap-to-Scroll pada track scrollbar
    scrollIndicator.addEventListener('click', function(e) {
        if (e.target === scrollThumb || scrollThumb.contains(e.target)) return;
        const rect = scrollIndicator.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = scrollIndicator.clientHeight;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (trackHeight > 0 && docHeight > 0) {
            const scrollRatio = clickY / trackHeight;
            window.scrollTo({
                top: scrollRatio * docHeight,
                behavior: 'smooth'
            });
        }
    });

    scrollThumb.addEventListener('touchstart', onThumbDragStart, {passive: false});
    document.addEventListener('touchmove', onThumbDragMove, {passive: false});
    document.addEventListener('touchend', onThumbDragEnd);

    scrollThumb.addEventListener('mousedown', onThumbDragStart);
    document.addEventListener('mousemove', onThumbDragMove);
    document.addEventListener('mouseup', onThumbDragEnd);
}

function handlePageScroll() {
    if (!scrollIndicator || !scrollThumb || isThumbDragging) return;
    
    scrollIndicator.style.opacity = '0.9';
    clearTimeout(hideScrollTimeout);
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Deteksi arah panah otomatis (naik / turun)
    const arrowIcon = document.getElementById('scroll-arrow-icon');
    if (arrowIcon) {
        if (scrollTop > lastScrollTop) {
            arrowIcon.className = 'fa-solid fa-chevron-down text-[10px] text-white pointer-events-none';
        } else if (scrollTop < lastScrollTop) {
            arrowIcon.className = 'fa-solid fa-chevron-up text-[10px] text-white pointer-events-none';
        }
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const trackHeight = scrollIndicator.clientHeight - scrollThumb.clientHeight;
    
    if (docHeight > 0) {
        const thumbTop = (scrollTop / docHeight) * trackHeight;
        scrollThumb.style.top = thumbTop + 'px';
    }

    hideScrollTimeout = setTimeout(() => {
        if (!isThumbDragging) {
            scrollIndicator.style.opacity = '0.4';
        }
    }, 4000);
}

function onThumbDragStart(e) {
    isThumbDragging = true;
    thumbStartY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startThumbTop = scrollThumb.offsetTop; // Simpan posisi awal thumb
    startPageScrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollIndicator) scrollIndicator.style.opacity = '1';
    clearTimeout(hideScrollTimeout);
    
    e.preventDefault();
}

function onThumbDragMove(e) {
    if (!isThumbDragging || !scrollIndicator || !scrollThumb) return;
    
    const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const deltaY = currentY - thumbStartY;
    
    const trackHeight = scrollIndicator.clientHeight - scrollThumb.clientHeight;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (trackHeight > 0 && docHeight > 0) {
        // Geser posisi thumb secara langsung mengikuti pergerakan jari
        let newThumbTop = startThumbTop + deltaY;
        newThumbTop = Math.max(0, Math.min(trackHeight, newThumbTop)); // Batasi agar tidak keluar jalur
        scrollThumb.style.top = newThumbTop + 'px';
        
        // Geser halaman sesuai posisi thumb
        const scrollRatio = newThumbTop / trackHeight;
        window.scrollTo(0, scrollRatio * docHeight);
    }
    
    e.preventDefault();
}

function onThumbDragEnd() {
    if (!isThumbDragging) return;
    isThumbDragging = false;
    
    hideScrollTimeout = setTimeout(() => {
        if (scrollIndicator) scrollIndicator.style.opacity = '0.4';
    }, 2500);
}

document.addEventListener("DOMContentLoaded", function() {
    const postBody = document.getElementById('post-content-body');
    const timeBadge = document.getElementById('reading-time-badge');
    if (postBody && timeBadge) {
        const text = postBody.innerText || postBody.textContent;
        const wCount = text.trim().split(/\s+/).length;
        const rTime = Math.ceil(wCount / 200);
        timeBadge.innerHTML = `<i class='fa-regular fa-clock mr-1'></i> ${rTime} menit baca`;
    }

    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('#main-navbar-links a');
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (currentPath === linkHref || (currentPath.includes('/search/label/') && currentPath.toLowerCase() === linkHref.toLowerCase())) {
            link.classList.add('text-red-500', 'font-bold', 'border-b-2', 'border-red-500');
            link.classList.remove('text-gray-300');
        }
    });

    initCustomScrollbar();
});

function initAutoCloseAdOnHomepage() {
    const path = window.location.pathname;
    const isHome = path === '/' || path === '/index.html' || (!path.includes('/search/') && !path.includes('/p/'));
    if (!isHome) return;

    const adBox = document.getElementById('kompas-ad-box');
    if (!adBox) return;

    let isHidden = false;

    function hideAdAutomatically() {
        if (isHidden) return;
        isHidden = true;
        adBox.style.maxHeight = adBox.offsetHeight + 'px';
        setTimeout(() => {
            adBox.style.maxHeight = '0px';
            adBox.style.opacity = '0';
            adBox.style.paddingTop = '0px';
            adBox.style.paddingBottom = '0px';
            adBox.style.borderWidth = '0px';
        }, 10);
    }

    window.addEventListener('load', function() {
        adAutoCloseTimer = setTimeout(hideAdAutomatically, 10000);
    });

    const resetIdleTimer = () => {
        if (isHidden) return;
        clearTimeout(adAutoCloseTimer);
        adAutoCloseTimer = setTimeout(hideAdAutomatically, 10000);
    };

    window.addEventListener('touchstart', resetIdleTimer, {passive: true});
    window.addEventListener('scroll', resetIdleTimer, {passive: true});
    window.addEventListener('mousemove', resetIdleTimer, {passive: true});
}

let currentFontSizeLevel = 0;
function changeArticleFontSize(direction) {
    const bodyContent = document.getElementById('post-content-body');
    if (!bodyContent) return;
    currentFontSizeLevel += direction;
    if (currentFontSizeLevel < -1) currentFontSizeLevel = -1;
    if (currentFontSizeLevel > 2) currentFontSizeLevel = 2;

    let sizeClass = 'text-sm md:text-base';
    if (currentFontSizeLevel === -1) sizeClass = 'text-xs md:text-sm';
    else if (currentFontSizeLevel === 1) sizeClass = 'text-base md:text-lg';
    else if (currentFontSizeLevel === 2) sizeClass = 'text-lg md:text-xl';

    bodyContent.className = `post-body text-gray-700 dark:text-gray-200 leading-relaxed space-y-4 ${sizeClass}`;
}

let isSpeaking = false;
function toggleSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
        alert('Maaf, browser Anda tidak mendukung fitur pembaca audio.');
        return;
    }
    const ttsLabel = document.getElementById('tts-label');
    const postBody = document.getElementById('post-content-body');
    if (!postBody) return;

    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (ttsLabel) ttsLabel.innerText = 'Dengarkan';
        return;
    }

    const textToRead = postBody.innerText || postBody.textContent;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;

    utterance.onend = function() {
        isSpeaking = false;
        if (ttsLabel) ttsLabel.innerText = 'Dengarkan';
    };

    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
    if (ttsLabel) ttsLabel.innerText = 'Berhenti';
}

function toggleBookmarkFromBtn(btn) {
    const title = btn.getAttribute('data-title');
    const url = btn.getAttribute('data-url');
    let bookmarks = JSON.parse(localStorage.getItem('lintas_bookmarks') || '[]');
    const existingIndex = bookmarks.findIndex(b => b.url === url);
    
    if (existingIndex > -1) {
        bookmarks.splice(existingIndex, 1);
        alert('Berita dihapus dari daftar simpanan.');
    } else {
        bookmarks.push({ title, url });
        alert('Berita berhasil disimpan untuk dibaca nanti!');
    }
    localStorage.setItem('lintas_bookmarks', JSON.stringify(bookmarks));
}

function toggleSearchBox() {
    const searchDropdown = document.getElementById('search-dropdown');
    if(searchDropdown) {
        searchDropdown.classList.toggle('hidden');
        if(!searchDropdown.classList.contains('hidden')) {
            const input = document.getElementById('search-input-box');
            if(input) input.focus();
        }
    }
}

async function handleLiveSearch(event) {
    const query = event.target.value.trim();
    const resultsContainer = document.getElementById('search-live-results');
    if (!resultsContainer) return;

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        resultsContainer.innerHTML = '<div class="p-3 text-xs text-gray-400 text-center">Mencari berita...</div>';
        resultsContainer.classList.remove('hidden');

        try {
            const res = await fetch(`https://${window.location.hostname}/feeds/posts/default?alt=json&q=${encodeURIComponent(query)}&max-results=6`);
            const data = await res.json();
            const entries = data.feed.entry || [];

            if (entries.length === 0) {
                resultsContainer.innerHTML = '<div class="p-3 text-xs text-gray-400 text-center">Tidak ditemukan berita yang cocok.</div>';
                return;
            }

            let html = '<div class="divide-y divide-gray-800">';
            entries.forEach(entry => {
                const title = entry.title.$t;
                const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
                const img = ambilGambar(entry);
                const date = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                
                html += `
                    <a href="${link}" class="flex items-center gap-2.5 p-2.5 hover:bg-gray-900 transition text-left block">
                        <img src="${img}" class="w-12 h-12 object-cover rounded shrink-0"/>
                        <div class="flex-grow min-w-0">
                            <h4 class="text-xs font-bold text-gray-200 line-clamp-2 leading-tight">${title}</h4>
                            <span class="text-[10px] text-gray-500 mt-0.5 block">${date}</span>
                        </div>
                    </a>
                `;
            });
            html += '</div>';
            resultsContainer.innerHTML = html;
        } catch (err) {
            resultsContainer.innerHTML = '<div class="p-3 text-xs text-red-400 text-center">Gagal memuat hasil pencarian.</div>';
        }
    }, 300);
}

function executeSearchRedirect() {
    const input = document.getElementById('search-input-box');
    if (input && input.value.trim() !== '') {
        window.location.href = `/search?q=${encodeURIComponent(input.value.trim())}`;
    }
}

function toggleMenuDrawer() {
    const drawer = document.getElementById('menu-drawer');
    const overlay = document.getElementById('menu-overlay');
    if (!drawer || !overlay) return;

    const isOpen = drawer.classList.contains('translate-x-0');
    if (isOpen) {
        drawer.classList.remove('translate-x-0');
        drawer.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    } else {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
    }
}

async function updateWeatherByIP() {
    const weatherEl = document.getElementById('weather-info-box');
    if (!weatherEl) return;

    try {
        const ipRes = await fetch('https://ip-api.com/json/?fields=status,city,lat,lon');
        const ipData = await ipRes.json();
        
        let city = "Cirebon";
        let lat = -6.732;
        let lon = 108.552;
        
        if (ipData && ipData.status === 'success') {
            city = ipData.city;
            lat = ipData.lat;
            lon = ipData.lon;
        }
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
        const weatherData = await weatherRes.json();
        
        if (weatherData && weatherData.current) {
            const temp = Math.round(weatherData.current.temperature_2m);
            const code = weatherData.current.weather_code;
            let condition = "Berawan";
            
            if (code === 0) condition = "Cerah";
            else if (code >= 1 && code <= 3) condition = "Berawan";
            else if (code >= 51 && code <= 67) condition = "Hujan";
            else if (code >= 95) condition = "Badai Petir";
            
            weatherEl.innerHTML = `
                <i class='fa-solid fa-cloud-sun text-amber-500 text-base'></i>
                <div>
                    <span class='font-bold text-gray-800 dark:text-gray-200 block leading-tight'>${city}</span>
                    <span class='text-gray-500 dark:text-gray-400 text-[11px]'>${temp}&#176;C, ${condition}</span>
                </div>
            `;
        }
    } catch (e) {
        weatherEl.innerHTML = `
            <i class='fa-solid fa-cloud-sun text-amber-500 text-base'></i>
            <div>
                <span class='font-bold text-gray-800 dark:text-gray-200 block leading-tight'>Cirebon</span>
                <span class='text-gray-500 dark:text-gray-400 text-[11px]'>28&#176;C, Berawan</span>
            </div>
        `;
    }
}

function deteksiKategoriOtomatis(entry) {
    if (entry.category && entry.category.length > 0) {
        const term = entry.category[0].term;
        const allowed = ['Nasional', 'Cirebon', 'Indramayu', 'Majalengka', 'Kuningan', 'Hukum', 'Politik', 'Bola', 'Lifestyle'];
        if (allowed.map(a => a.toLowerCase()).includes(term.toLowerCase())) return term.toUpperCase();
    }
    
    const title = (entry.title && entry.title.$t) ? entry.title.$t.toLowerCase() : '';
    const content = (entry.content && entry.content.$t) ? entry.content.$t.toLowerCase() : '';
    const combined = title + ' ' + content;

    if (combined.includes('cirebon')) return 'CIREBON';
    if (combined.includes('indramayu')) return 'INDRAMAYU';
    if (combined.includes('majalengka')) return 'MAJALENGKA';
    if (combined.includes('kuningan')) return 'KUNINGAN';
    if (combined.includes('hukum') || combined.includes('polisi') || combined.includes('sidang') || combined.includes('kriminal')) return 'HUKUM';
    if (combined.includes('politik') || combined.includes('pemilu') || combined.includes('dpr') || combined.includes('partai')) return 'POLITIK';
    if (combined.includes('bola') || combined.includes('timnas') || combined.includes('pssi') || combined.includes('liga')) return 'BOLA';
    if (combined.includes('lifestyle') || combined.includes('kuliner') || combined.includes('wisata') || combined.includes('gaya hidup')) return 'LIFESTYLE';
    
    return 'NASIONAL';
}

function initSlider(slides) {
    const headlineContainer = document.getElementById('headline-container');
    if (!headlineContainer || slides.length === 0) return;

    const lastSlide = slides[slides.length - 1];
    const firstSlide = slides[0];
    const extendedSlides = [lastSlide, ...slides, firstSlide];

    let slidesHTML = '';
    extendedSlides.forEach((post) => {
        slidesHTML += `
            <div class='min-w-full h-72 md:h-[400px] relative flex-shrink-0 select-none'>
                <a href='${post.link}' class='absolute inset-0 block z-10 group cursor-pointer'>
                    <img src='${post.img}' alt='Headline' class='w-full h-full object-cover group-hover:scale-105 transition duration-500 pointer-events-none'/>
                    <div class='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent'></div>
                    <div class='absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10'>
                        <span class='text-xs text-gray-300 block mb-1 font-medium'>${post.tanggal}</span>
                        <h1 class='text-base md:text-2xl font-bold text-white leading-snug drop-shadow-md line-clamp-2 group-hover:underline'>
                            ${post.title}
                        </h1>
                    </div>
                </a>
                <span class='absolute top-3 left-3 bg-red-600 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider z-25 shadow pointer-events-none'>${post.label}</span>
            </div>
        `;
    });

    headlineContainer.innerHTML = `
        <div class='relative h-72 md:h-[400px] w-full overflow-hidden'>
            <div id='slider-track' class='flex h-full w-full transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing'>
                ${slidesHTML}
            </div>
            <button onclick='prevSlide()' class='absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/75 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition cursor-pointer z-30 shadow backdrop-blur-sm' title='Sebelumnya'>
                <i class='fa-solid fa-chevron-left'></i>
            </button>
            <button onclick='nextSlide()' class='absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/75 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition cursor-pointer z-30 shadow backdrop-blur-sm' title='Selanjutnya'>
                <i class='fa-solid fa-chevron-right'></i>
            </button>
        </div>
    `;

    const track = document.getElementById('slider-track');
    setPositionByIndex();
    
    track.addEventListener('touchstart', touchStart(0), {passive: true});
    track.addEventListener('touchend', touchEnd);
    track.addEventListener('touchmove', touchMove, {passive: true});

    track.addEventListener('mousedown', touchStart(1));
    track.addEventListener('mouseup', touchEnd);
    track.addEventListener('mouseleave', touchEnd);
    track.addEventListener('mousemove', touchMove);

    resetTimer();
}

function getPositionX(event) {
    return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
}

function touchStart(type) {
    return function(event) {
        isDragging = true;
        startPos = getPositionX(event);
        clearInterval(slideInterval);
        const track = document.getElementById('slider-track');
        if(track) track.style.transition = 'none';
        if(type === 1) event.preventDefault();
    }
}

function touchMove(event) {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = currentPosition - startPos;
    currentTranslate = prevTranslate + diff;
    const track = document.getElementById('slider-track');
    if (track) {
        track.style.transform = `translateX(${currentTranslate}px)`;
    }
}

function touchEnd() {
    if (!isDragging) return;
    isDragging = false;
    const track = document.getElementById('slider-track');
    if (!track) return;

    track.style.transition = 'transform 0.3s ease-out';
    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -50) {
        nextSlide();
    } else if (movedBy > 50) {
        prevSlide();
    } else {
        setPositionByIndex();
    }
    resetTimer();
}

function setPositionByIndex() {
    const track = document.getElementById('slider-track');
    const headlineContainer = document.getElementById('headline-container');
    if (!track || !headlineContainer) return;
    const slideWidth = headlineContainer.clientWidth;
    currentTranslate = slideWidth * -currentSlideIndex;
    prevTranslate = currentTranslate;
    track.style.transform = `translateX(${currentTranslate}px)`;
}

function nextSlide() {
    if (headlineSlides.length === 0) return;
    const track = document.getElementById('slider-track');
    currentSlideIndex++;
    setPositionByIndex();

    if (currentSlideIndex === headlineSlides.length + 1) {
        setTimeout(() => {
            if (track) track.style.transition = 'none';
            currentSlideIndex = 1;
            setPositionByIndex();
            setTimeout(() => {
                if (track) track.style.transition = 'transform 0.3s ease-out';
            }, 50);
        }, 300);
    }
    resetTimer();
}

function prevSlide() {
    if (headlineSlides.length === 0) return;
    const track = document.getElementById('slider-track');
    currentSlideIndex--;
    setPositionByIndex();

    if (currentSlideIndex === 0) {
        setTimeout(() => {
            if (track) track.style.transition = 'none';
            currentSlideIndex = headlineSlides.length;
            setPositionByIndex();
            setTimeout(() => {
                if (track) track.style.transition = 'transform 0.3s ease-out';
            }, 50);
        }, 300);
    }
    resetTimer();
}

function resetTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 5000);
}

function ambilGambar(entry) {
    if (entry.media$thumbnail) {
        return entry.media$thumbnail.url.replace(/\/s72\-c/, '/s800');
    } else if (entry.content && entry.content.$t) {
        const matchImg = entry.content.$t.match(/<img[^>]+src="([^">]+)"/);
        if (matchImg) return matchImg[1];
    }
    return "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80";
}

function generateMonthlyArchive(entries) {
    const archiveContainer = document.getElementById('monthly-archive-list');
    if (!archiveContainer) return;

    let archiveMap = {};
    entries.forEach(entry => {
        const date = new Date(entry.published.$t);
        const yearMonth = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        archiveMap[yearMonth] = (archiveMap[yearMonth] || 0) + 1;
    });

    let html = '';
    for (const [monthYear, count] of Object.entries(archiveMap)) {
        html += `
            <a href='/search?q=${encodeURIComponent(monthYear)}' class='p-2 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition border border-gray-100 dark:border-gray-700 flex justify-between items-center'>
                <span class='font-semibold text-gray-700 dark:text-gray-300'>${monthYear}</span>
                <span class='bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded text-[10px] font-bold'>${count}</span>
            </a>
        `;
    }
    archiveContainer.innerHTML = html || '<span class="text-xs text-gray-500">Tidak ada arsip.</span>';
}

let catSisaPosts = [];
let catDisplayedCount = 0;
let catBatchSize = 4;

function muatLebihBanyakKategori() {
    const muatContainer = document.getElementById('cat-container-muat-lainnya');
    const loadMoreBtn = document.getElementById('cat-load-more-container');
    if (!muatContainer) return;

    const nextBatch = catSisaPosts.slice(catDisplayedCount, catDisplayedCount + catBatchSize);
    if (nextBatch.length === 0) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    let batchDiv = document.createElement('div');
    batchDiv.className = "bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800 transition-colors duration-200";
    
    let gridDiv = document.createElement('div');
    gridDiv.className = "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6";

    nextBatch.forEach(entry => {
        const judul = entry.title.$t;
        const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
        const img = ambilGambar(entry);
        const label = deteksiKategoriOtomatis(entry);
        const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 p-2.5 md:p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition-colors duration-200";
        card.innerHTML = `
            <div>
                <a href='${link}' class='block'>
                    <img src='${img}' alt='News' class='w-full h-28 md:h-36 object-cover rounded-lg mb-2 hover:opacity-95 transition'/>
                </a>
                <span class='text-[9px] md:text-xs text-red-600 dark:text-red-400 font-semibold uppercase block mb-1'>${label}</span>
                <h3 class='font-bold text-gray-900 dark:text-white text-xs md:text-base leading-snug line-clamp-2'>
                    <a href='${link}' class='hover:text-red-600 dark:hover:text-red-400 transition'>${judul}</a>
                </h3>
            </div>
            <div class='mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500'>
                <span>${tanggal}</span>
                <a href='${link}' class='text-red-600 dark:text-red-400 font-semibold hover:underline'>Baca</a>
            </div>
        `;
        gridDiv.appendChild(card);
    });

    batchDiv.appendChild(gridDiv);
    muatContainer.appendChild(batchDiv);

    catDisplayedCount += catBatchSize;
    if (catDisplayedCount >= catSisaPosts.length) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

function muatLebihBanyak() {
    const muatContainer = document.getElementById('container-muat-lainnya');
    const loadMoreBtn = document.getElementById('load-more-container');
    if (!muatContainer) return;

    const nextBatch = allSisaPosts.slice(displayedLoadCount, displayedLoadCount + batchSize);
    if (nextBatch.length === 0) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    let batchDiv = document.createElement('div');
    batchDiv.className = "bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800 transition-colors duration-200";
    
    let gridDiv = document.createElement('div');
    gridDiv.className = "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6";

    nextBatch.forEach(entry => {
        const judul = entry.title.$t;
        const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
        const img = ambilGambar(entry);
        const label = deteksiKategoriOtomatis(entry);
        const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 p-2.5 md:p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition-colors duration-200";
        card.innerHTML = `
            <div>
                <a href='${link}' class='block'>
                    <img src='${img}' alt='News' class='w-full h-28 md:h-36 object-cover rounded-lg mb-2 hover:opacity-95 transition'/>
                </a>
                <span class='text-[9px] md:text-xs text-red-600 dark:text-red-400 font-semibold uppercase block mb-1'>${label}</span>
                <h3 class='font-bold text-gray-900 dark:text-white text-xs md:text-base leading-snug line-clamp-2'>
                    <a href='${link}' class='hover:text-red-600 dark:hover:text-red-400 transition'>${judul}</a>
                </h3>
            </div>
            <div class='mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500'>
                <span>${tanggal}</span>
                <a href='${link}' class='text-red-600 dark:text-red-400 font-semibold hover:underline'>Baca</a>
            </div>
        `;
        gridDiv.appendChild(card);
    });

    batchDiv.appendChild(gridDiv);
    muatContainer.appendChild(batchDiv);

    displayedLoadCount += batchSize;
    if (displayedLoadCount >= allSisaPosts.length) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    updateWeatherByIP();
    initAutoCloseAdOnHomepage();

    const path = window.location.pathname;
    const mainArea = document.getElementById('dynamic-content-area');
    if (!mainArea) return;

    if (path.includes('/search/label/')) {
        const parts = path.split('/search/label/');
        let catName = decodeURIComponent(parts[1].replace(/\/$/, '').split('?')[0]);
        await renderCategoryPage(catName, mainArea);
    } else {
        await renderHomepage(mainArea);
    }
});

async function renderCategoryPage(categoryName, container) {
    container.innerHTML = `<div class='p-12 text-center text-gray-500'>Memuat berita kategori ${categoryName}...</div>`;
    const feedUrl = `https://${window.location.hostname}/feeds/posts/default?alt=json&max-results=200`;

    try {
        const res = await fetch(feedUrl);
        const data = await res.json();
        let entries = data.feed.entry || [];

        entries = entries.filter(entry => {
            const detected = deteksiKategoriOtomatis(entry).toLowerCase();
            return detected === categoryName.toLowerCase();
        });

        if (entries.length === 0) {
            container.innerHTML = `
                <div class='bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm text-center border border-gray-200 dark:border-gray-800'>
                    <h1 class='text-xl font-bold text-gray-900 dark:text-white mb-2'>Kategori: ${categoryName.toUpperCase()}</h1>
                    <p class='text-sm text-gray-500'>Belum ada berita yang tersedia untuk kategori ini.</p>
                    <a href='/' class='mt-4 inline-block bg-red-600 text-white text-xs px-4 py-2 rounded font-semibold'>Kembali ke Beranda</a>
                </div>
            `;
            return;
        }

        const sliderPosts = entries.slice(0, 5);
        const gridPosts = entries.slice(5, 9);
        const listPosts = entries.slice(9, 13);
        catSisaPosts = entries.slice(13);

        let html = `
            <div class='mb-6'>
                <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg overflow-hidden shadow-sm transition relative mb-6' id='headline-container'></div>
            </div>
        `;

        if (gridPosts.length > 0) {
            html += `
                <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800'>
                    <h2 class='font-bold text-lg text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-2'>Pilihan Utama ${categoryName}</h2>
                    <div class='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6'>
            `;
            gridPosts.forEach(entry => {
                const judul = entry.title.$t;
                const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
                const img = ambilGambar(entry);
                const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                html += `
                    <div class='bg-white dark:bg-gray-800 p-2.5 md:p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between'>
                        <div>
                            <a href='${link}' class='block'><img src='${img}' class='w-full h-28 md:h-36 object-cover rounded-lg mb-2 hover:opacity-95 transition'/></a>
                            <h3 class='font-bold text-gray-900 dark:text-white text-xs md:text-base leading-snug line-clamp-2'>
                                <a href='${link}' class='hover:text-red-600 transition'>${judul}</a>
                            </h3>
                        </div>
                        <div class='mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400'>
                            <span>${tanggal}</span>
                            <a href='${link}' class='text-red-600 font-semibold hover:underline'>Baca</a>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        if (listPosts.length > 0) {
            html += `
                <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800'>
                    <h2 class='font-bold text-lg text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-2'>Arsip Berita Lainnya</h2>
                    <div class='space-y-4'>
            `;
            listPosts.forEach(entry => {
                const judul = entry.title.$t;
                const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
                const img = ambilGambar(entry);
                const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                html += `
                    <div class='flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition'>
                        <a href='${link}' class='shrink-0'><img src='${img}' class='w-20 h-16 md:w-24 md:h-20 object-cover rounded-md'/></a>
                        <div class='flex-grow'>
                            <h4 class='text-xs md:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug'>
                                <a href='${link}' class='hover:text-red-600 transition'>${judul}</a>
                            </h4>
                            <span class='text-[10px] text-gray-400 mt-1 block'><i class='fa-regular fa-clock mr-1'/>${tanggal}</span>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        html += `<div id='cat-container-muat-lainnya' class='mb-6'></div>`;
        html += `
            <div class='mt-4 mb-8 text-center' id='cat-load-more-container' style='display: ${catSisaPosts.length > 0 ? 'block' : 'none'};'>
                <button onclick='muatLebihBanyakKategori()' class='bg-red-600 hover:bg-red-700 text-white font-semibold text-xs md:text-sm px-6 py-3 rounded-full shadow transition cursor-pointer'>
                    Muat Lainnya <i class='fa-solid fa-chevron-down ml-1 text-xs'/>
                </button>
            </div>
        `;

        container.innerHTML = html;

        headlineSlides = sliderPosts.map(entry => ({
            title: entry.title.$t,
            link: entry.link.find(l => l.rel === 'alternate')?.href || '#',
            img: ambilGambar(entry),
            label: categoryName.toUpperCase(),
            tanggal: new Date(entry.published.$t).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        }));
        initSlider(headlineSlides);

    } catch (err) {
        console.error("Gagal memuat kategori:", err);
        container.innerHTML = "<p class='p-6 text-center text-red-500'>Gagal memuat halaman kategori.</p>";
    }
}

async function renderHomepage(container) {
    container.innerHTML = `
        <div class='relative' id='sticky-scroll-container'>
            <div class='sticky top-[112px] z-30 bg-gray-100 dark:bg-gray-950 py-1 transition-colors duration-200 space-y-2 mb-3 shadow-sm'>
                <div class='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none md:rounded-lg p-3 shadow-sm flex items-center justify-around overflow-x-auto text-xs gap-4'>
                    <div class='flex items-center gap-2 shrink-0' id='weather-info-box'>
                        <i class='fa-solid fa-cloud-sun text-amber-500 text-base'></i>
                        <div><span class='font-bold text-gray-800 dark:text-gray-200 block leading-tight'>Memuat...</span><span class='text-gray-500 dark:text-gray-400 text-[11px]'>Mendeteksi lokasi...</span></div>
                    </div>
                    <div class='border-l border-gray-200 dark:border-gray-800 h-6 shrink-0'></div>
                    <div class='flex items-center gap-2 shrink-0'>
                        <i class='fa-solid fa-coins text-yellow-600 text-base'></i>
                        <div><span class='font-bold text-gray-800 dark:text-gray-200 block leading-tight'>Harga Emas</span><span class='text-green-600 dark:text-green-400 font-semibold text-[11px]'>Rp 1.320.000 /gram <i class='fa-solid fa-arrow-up text-[10px]'></i></span></div>
                    </div>
                    <div class='border-l border-gray-200 dark:border-gray-800 h-6 shrink-0'></div>
                    <div class='flex items-center gap-2 shrink-0'>
                        <i class='fa-solid fa-chart-line text-blue-600 text-base'></i>
                        <div><span class='font-bold text-gray-800 dark:text-gray-200 block leading-tight'>Kurs USD</span><span class='text-gray-600 dark:text-gray-400 text-[11px]'>Rp 15.650</span></div>
                    </div>
                </div>

                <div class='bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 py-2.5 px-3 md:px-4 flex items-center shadow-sm rounded-none md:rounded-r overflow-hidden relative'>
                    <span class='bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded uppercase tracking-wider shrink-0 z-20 mr-3 md:mr-4 shadow'>Fokus</span>
                    <div class='overflow-hidden w-full relative'>
                        <div id='running-text-content' class='animate-marquee flex items-center space-x-12 text-sm font-medium text-red-900 dark:text-red-200'>
                            <span>Memuat berita fokus...</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class='space-y-4 mb-6'>
                <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg overflow-hidden shadow-sm transition relative' id='headline-container'>
                    <div class='p-6 text-gray-500 dark:text-gray-400 text-sm h-80 flex items-center justify-center bg-white dark:bg-gray-900'>Memuat slider headline...</div>
                </div>

                <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm border border-gray-200/50 dark:border-gray-800 transition-colors duration-200'>
                    <h2 class='font-bold text-xl text-gray-900 dark:text-white mb-4 md:mb-6 border-b border-gray-200 dark:border-gray-800 pb-3 px-2 md:px-0 flex items-center gap-2'>
                        <i class='fa-solid fa-fire text-red-600'></i> Terpopuler
                    </h2>
                    <div id='container-terpopuler-3'><p class='text-sm text-gray-500 px-2'>Memuat terpopuler...</p></div>
                </div>

                <div class='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 py-2 px-3 rounded-none md:rounded-lg shadow-sm relative' id='kompas-ad-box-2'>
                    <div class='w-full flex flex-col items-center relative'>
                        <button class='absolute right-2 top-0 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10 cursor-pointer shadow' onclick='document.getElementById(&apos;kompas-ad-box-2&apos;).style.display=&apos;none&apos;;' title='Tutup Iklan'><i class='fa-solid fa-xmark'></i></button>
                        <div class='text-[10px] text-red-600 dark:text-red-400 tracking-wider mb-1 uppercase font-bold'>Pasang Iklan Anda Disini Free 50%</div>
                        <a class='block overflow-hidden rounded-none md:rounded shadow-sm w-full relative group bg-black' href='#' target='_blank'>
                            <img alt='Iklan' class='w-full h-auto object-cover group-hover:opacity-95 transition' src='https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjAQkeALJfgT4F00k92F8PGGC7K2MPXyVMavDZmv79A5EwICEwC0uVC7_avXm4smjcTy0X4KKJv5R9ZdQvh-OBLlbTyyO3VaVahLFdmVlm3eNGsOM89emqB2QIQm6bcgHKNvRgX5gsk8PFbuYrFoJxMxghjtPwc5VfDrbMICXMY9YBf48GBDvT10o9MaFtN/s1755/Screenshot_20260824-161022.jpg'/>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800'>
            <div class='border-b border-gray-200 dark:border-gray-800 pb-3 mb-4 flex items-center justify-between px-2 md:px-0'>
                <h2 class='font-bold text-xl text-gray-900 dark:text-white'>Berita Pilihan Lainnya</h2>
            </div>
            <div id='container-berita-pilihan'><p class='text-sm text-gray-500 px-2'>Memuat berita pilihan...</p></div>
        </div>

        <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-3 md:p-6 shadow-sm mb-6 border border-gray-200/50 dark:border-gray-800'>
            <h2 class='font-bold text-xl text-gray-900 dark:text-white mb-4 md:mb-6 border-b border-gray-200 dark:border-gray-800 pb-3 px-2 md:px-0 flex items-center gap-2'>
                <i class='fa-solid fa-users text-red-600'></i> Lintas Sosial
            </h2>
            <div id='container-lintas-sosial' class='space-y-4'><p class='text-sm text-gray-500 px-2'>Memuat Lintas Sosial...</p></div>
        </div>

        <div id='container-muat-lainnya' class='mb-6'></div>

        <div class='mt-4 mb-8 text-center' id='load-more-container' style='display: none;'>
            <button onclick='muatLebihBanyak()' class='bg-red-600 hover:bg-red-700 text-white font-semibold text-xs md:text-sm px-6 py-3 rounded-full shadow transition cursor-pointer'>
                Muat Lainnya <i class='fa-solid fa-chevron-down ml-1 text-xs'></i>
            </button>
        </div>

        <div class='bg-white dark:bg-gray-900 rounded-none md:rounded-lg p-4 md:p-6 shadow-sm mb-8 border border-gray-200/50 dark:border-gray-800'>
            <h2 class='font-bold text-lg text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2'>
                <i class='fa-solid fa-box-archive text-red-600'></i> Arsip Berita Bulanan
            </h2>
            <div id='monthly-archive-list' class='grid grid-cols-2 md:grid-cols-4 gap-2 text-xs'>
                <span class='text-gray-500'>Memuat arsip bulanan...</span>
            </div>
        </div>
    `;

    const headlineContainer = document.getElementById('headline-container');
    const terpopulerContainer = document.getElementById('container-terpopuler-3');
    const pilihanContainer = document.getElementById('container-berita-pilihan');
    const sosialContainer = document.getElementById('container-lintas-sosial');
    const runningTextContainer = document.getElementById('running-text-content');
    const loadMoreBtnContainer = document.getElementById('load-more-container');
    if (!headlineContainer || !terpopulerContainer || !sosialContainer) return;

    const feedUrl = `https://${window.location.hostname}/feeds/posts/default?alt=json&max-results=200`;

    try {
        const response = await fetch(feedUrl);
        const data = await response.json();
        const entries = data.feed.entry || [];

        if (entries.length === 0) return;

        generateMonthlyArchive(entries);

        if (runningTextContainer) {
            const top3Posts = entries.slice(0, 3);
            let runningHTML = "";
            top3Posts.forEach(entry => {
                const title = entry.title.$t;
                const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
                runningHTML += `<a href="${link}" class="hover:underline hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-2 shrink-0"><i class="fa-solid fa-circle text-[5px] text-red-600"></i><span>${title}</span></a>`;
            });
            runningTextContainer.innerHTML = runningHTML + runningHTML;
        }

        const sliderEntries = entries.slice(0, 5);
        headlineSlides = sliderEntries.map(entry => ({
            title: entry.title.$t,
            link: entry.link.find(l => l.rel === 'alternate')?.href || '#',
            img: ambilGambar(entry),
            label: deteksiKategoriOtomatis(entry),
            tanggal: new Date(entry.published.$t).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        }));
        initSlider(headlineSlides);

        const terpopulerEntries = entries.slice(5, 8);
        terpopulerContainer.innerHTML = "";
        const gridDiv = document.createElement('div');
        gridDiv.className = "grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6";

        terpopulerEntries.forEach(entry => {
            const judul = entry.title.$t;
            const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
            const img = ambilGambar(entry);
            const label = deteksiKategoriOtomatis(entry);
            const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            const card = document.createElement('div');
            card.className = "bg-white dark:bg-gray-800 p-2.5 md:p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition-colors duration-200";
            card.innerHTML = `
                <div>
                    <a href='${link}' class='block'><img src='${img}' alt='News' class='w-full h-36 md:h-48 object-cover rounded-lg mb-2 hover:opacity-95 transition'/></a>
                    <div class='flex items-center justify-between mb-1'>
                        <span class='text-[9px] md:text-xs text-red-600 dark:text-red-400 font-semibold uppercase'>${label}</span>
                        <span class='bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse'><i class='fa-solid fa-fire text-[8px] mr-0.5'></i> Trending</span>
                    </div>
                    <h3 class='font-bold text-gray-900 dark:text-white text-xs md:text-base leading-snug line-clamp-2'>
                        <a href='${link}' class='hover:text-red-600 transition'>${judul}</a>
                    </h3>
                </div>
                <div class='mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400'>
                    <span>${tanggal}</span>
                    <a href='${link}' class='text-red-600 font-semibold hover:underline'>Baca</a>
                </div>
            `;
            gridDiv.appendChild(card);
        });
        terpopulerContainer.appendChild(gridDiv);

        if (pilihanContainer) {
            const pilihanEntries = entries.slice(8, 12);
            pilihanContainer.innerHTML = "";
            let gridPilihanDiv = document.createElement('div');
            gridPilihanDiv.className = "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6";

            pilihanEntries.forEach(entry => {
                const judul = entry.title.$t;
                const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
                const img = ambilGambar(entry);
                const label = deteksiKategoriOtomatis(entry);
                const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                const card = document.createElement('div');
                card.className = "bg-white dark:bg-gray-800 p-2.5 md:p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition-colors duration-200";
                card.innerHTML = `
                    <div>
                        <a href='${link}' class='block'><img src='${img}' alt='News' class='w-full h-28 md:h-36 object-cover rounded-lg mb-2 hover:opacity-95 transition'/></a>
                        <span class='text-[9px] md:text-xs text-red-600 dark:text-red-400 font-semibold uppercase block mb-1'>${label}</span>
                        <h3 class='font-bold text-gray-900 dark:text-white text-xs md:text-base leading-snug line-clamp-2'>
                            <a href='${link}' class='hover:text-red-600 transition'>${judul}</a>
                        </h3>
                    </div>
                    <div class='mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400'>
                        <span>${tanggal}</span>
                        <a href='${link}' class='text-red-600 font-semibold hover:underline'>Baca</a>
                    </div>
                `;
                gridPilihanDiv.appendChild(card);
            });
            pilihanContainer.appendChild(gridPilihanDiv);
        }

        const sosialEntries = entries.slice(12, 16);
        sosialContainer.innerHTML = "";
        sosialEntries.forEach(entry => {
            const judul = entry.title.$t;
            const link = entry.link.find(l => l.rel === 'alternate')?.href || '#';
            const img = ambilGambar(entry);
            const label = deteksiKategoriOtomatis(entry);
            const tanggal = new Date(entry.published.$t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            const itemDiv = document.createElement('div');
            itemDiv.className = "flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition";
            itemDiv.innerHTML = `
                <a href='${link}' class='shrink-0'><img src='${img}' alt='Sosial' class='w-20 h-16 md:w-24 md:h-20 object-cover rounded-md'/></a>
                <div class='flex-grow'>
                    <span class='text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase block mb-0.5'>${label}</span>
                    <h4 class='text-xs md:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug'>
                        <a href='${link}' class='hover:text-red-600 transition'>${judul}</a>
                    </h4>
                    <span class='text-[10px] text-gray-400 mt-1 block'><i class='fa-regular fa-clock mr-1'/>${tanggal}</span>
                </div>
            `;
            sosialContainer.appendChild(itemDiv);
        });

        allSisaPosts = entries.slice(16);
        if (allSisaPosts.length > 0 && loadMoreBtnContainer) {
            loadMoreBtnContainer.style.display = 'block';
        }

    } catch (error) {
        console.error("Gagal memuat feed beranda:", error);
    }
}
