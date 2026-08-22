const tickerContainer = document.getElementById('ticker-container');
const totalSlides = tickerContainer.children.length;
let currentIndex = 0;

function slideTicker() {
    currentIndex = (currentIndex + 1) % totalSlides;
    tickerContainer.style.transform = `translateY(-${currentIndex * 48}px)`;
}

// Ganti berita setiap 3.5 detik secara otomatis
setInterval(slideTicker, 3500);
