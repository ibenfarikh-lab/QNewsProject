document.addEventListener("DOMContentLoaded", function() {
    console.log("Portal Berita siap dijalankan!");
    
    // Muat berita tersimpan dari LocalStorage saat halaman dimuat
    muatBeritaLokal();

    // Fitur pencarian sederhana
    const searchInput = document.querySelector('input[placeholder="Cari berita..."]');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                alert(`Mencari berita dengan kata kunci: "${searchInput.value}"`);
            }
        });
    }
});

// Fungsi Buka/Tutup Modal Post
function bukaModalPost() {
    const modal = document.getElementById('modalPost');
    if (modal) modal.classList.remove('hidden');
}

function tutupModalPost() {
    const modal = document.getElementById('modalPost');
    if (modal) modal.classList.add('hidden');
}

// Fungsi Tangkap/Unggah Gambar dan Kompresi ke Base64
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            const maxSize = 500; // Batasi ukuran maksimum agar hemat penyimpanan LocalStorage
            
            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Ubah ke format Base64 terkompresi
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById("postGambarBase64").value = compressedBase64;
            alert("Foto berhasil dipilih/diambil dari kamera!");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Fungsi Submit Berita Baru
function submitBerita(event) {
    event.preventDefault();
    
    const judul = document.getElementById('postJudul').value;
    const kategori = document.getElementById('postKategori').value;
    const base64Img = document.getElementById('postGambarBase64').value;
    const isi = document.getElementById('postIsi').value;
    
    // Gunakan gambar default jika pengguna tidak mengambil/mengunggah foto
    const gambar = base64Img || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=500&q=80";

    const beritaBaru = {
        judul,
        kategori,
        gambar,
        isi,
        waktu: "Baru saja"
    };

    // Ambil data lama dari LocalStorage, lalu tambahkan yang baru di awal
    let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];
    daftarBerita.unshift(beritaBaru);
    localStorage.setItem('qnews_posts', JSON.stringify(daftarBerita));

    // Reset form, kosongkan base64, tutup modal, dan muat ulang tampilan
    document.getElementById('formPostBerita').reset();
    document.getElementById('postGambarBase64').value = "";
    tutupModalPost();
    muatBeritaLokal();
    
    alert("Berita berhasil dipublikasikan secara lokal!");
}

// Fungsi untuk merender berita dari LocalStorage ke HTML
function muatBeritaLokal() {
    const container = document.getElementById('container-berita-lainnya');
    if (!container) return;

    let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];
    
    // Hapus elemen dinamis lama jika ada agar tidak duplikat saat reload
    const elemenDinamis = container.querySelectorAll('.berita-lokal-item');
    elemenDinamis.forEach(el => el.remove());

    // Masukkan berita dari LocalStorage ke bagian paling depan grid
    daftarBerita.reverse().forEach(berita => {
        const postCard = document.createElement('div');
        postCard.className = "space-y-3 cursor-pointer group bg-white p-3 rounded-lg shadow-sm border border-red-100 berita-lokal-item";
        postCard.innerHTML = `
            <img src="${berita.gambar}" alt="News" class="w-full h-48 object-cover rounded-lg group-hover:opacity-90 transition">
            <span class="text-xs text-red-600 font-semibold">${berita.kategori}</span>
            <h3 class="font-bold text-gray-900 group-hover:text-red-600 transition leading-snug">
                ${berita.judul}
            </h3>
            <p class="text-xs text-gray-500">${berita.isi.substring(0, 80)}...</p>
            <p class="text-[10px] text-red-500 font-medium">${berita.waktu}</p>
        `;
        container.prepend(postCard);
    });
}
