// Script utama untuk interaksi Portal Berita
document.addEventListener("DOMContentLoaded", function() {
    console.log("Portal Berita siap dijalankan!");

    // Fitur interaksi pencarian sederhana
    const searchInput = document.querySelector('input[placeholder="Cari berita..."]');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                alert(`Mencari berita dengan kata kunci: "${searchInput.value}"`);
            }
        });
    }
});
