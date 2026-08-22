document.addEventListener("DOMContentLoaded", function() {
    console.log("Portal Berita siap dijalankan!");
    muatBeritaLokal();

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
    document.getElementById('editPostId').value = "";
    document.getElementById('modalTitleText').innerText = "Buat Berita / Post Baru";
    document.getElementById('formPostBerita').reset();
    document.getElementById('postGambarBase64').value = "";
    const modal = document.getElementById('modalPost');
    if (modal) modal.classList.remove('hidden');
}

function tutupModalPost() {
    const modal = document.getElementById('modalPost');
    if (modal) modal.classList.add('hidden');
}

// Fungsi Tangkap/Unggah Gambar dari Galeri atau Kamera
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
            const maxSize = 500;
            
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
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById("postGambarBase64").value = compressedBase64;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Fungsi Submit (Simpan Baru atau Simpan Perubahan Edit)
function submitBerita(event) {
    event.preventDefault();
    
    const editId = document.getElementById('editPostId').value;
    const judul = document.getElementById('postJudul').value.trim();
    const kategori = document.getElementById('postKategori').value;
    const urlGambar = document.getElementById('postUrlGambar').value.trim();
    const base64Img = document.getElementById('postGambarBase64').value;
    const isi = document.getElementById('postIsi').value.trim();
    
    if (!judul || !isi) {
        alert("Judul dan isi berita wajib diisi!");
        return;
    }

    let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];

    if (editId) {
        // Mode Edit: Cari dan perbarui data berdasarkan ID
        let index = daftarBerita.findIndex(b => b.id == editId);
        if (index !== -1) {
            let gambarFinal = base64Img || urlGambar || daftarBerita[index].gambar;
            daftarBerita[index].judul = judul;
            daftarBerita[index].kategori = kategori;
            daftarBerita[index].gambar = gambarFinal;
            daftarBerita[index].isi = isi;
        }
        alert("Berita berhasil diperbarui!");
    } else {
        // Mode Tambah Baru
        let gambarFinal = base64Img || urlGambar || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=500&q=80";
        const beritaBaru = {
            id: Date.now(),
            judul,
            kategori,
            gambar: gambarFinal,
            isi,
            waktu: "Baru saja"
        };
        daftarBerita.unshift(beritaBaru);
        alert("Berita berhasil dipublikasikan!");
    }

    localStorage.setItem('qnews_posts', JSON.stringify(daftarBerita));
    document.getElementById('formPostBerita').reset();
    document.getElementById('postGambarBase64').value = "";
    tutupModalPost();
    muatBeritaLokal();
}

// Fungsi Mulai Edit Post (Masukkan data ke Modal)
function mulaiEditPost(id) {
    let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];
    let berita = daftarBerita.find(b => b.id == id);
    if (!berita) return;

    document.getElementById('editPostId').value = berita.id;
    document.getElementById('modalTitleText').innerText = "Edit Berita / Post";
    document.getElementById('postJudul').value = berita.judul;
    document.getElementById('postKategori').value = berita.kategori;
    document.getElementById('postUrlGambar').value = berita.gambar.startsWith('data:') ? '' : berita.gambar;
    document.getElementById('postIsi').value = berita.isi;
    document.getElementById('postGambarBase64').value = berita.gambar.startsWith('data:') ? berita.gambar : '';

    const modal = document.getElementById('modalPost');
    if (modal) modal.classList.remove('hidden');
}

// Fungsi Hapus Post
function hapusPost(id) {
    if (confirm("Apakah Anda yakin ingin menghapus berita ini?")) {
        let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];
        daftarBerita = daftarBerita.filter(b => b.id != id);
        localStorage.setItem('qnews_posts', JSON.stringify(daftarBerita));
        muatBeritaLokal();
        alert("Berita berhasil dihapus!");
    }
}

// Fungsi untuk merender berita dari LocalStorage ke HTML
function muatBeritaLokal() {
    const container = document.getElementById('container-berita-lainnya');
    if (!container) return;

    let daftarBerita = JSON.parse(localStorage.getItem('qnews_posts')) || [];
    
    const elemenDinamis = container.querySelectorAll('.berita-lokal-item');
    elemenDinamis.forEach(el => el.remove());

    daftarBerita.forEach(berita => {
        const postCard = document.createElement('div');
        postCard.className = "space-y-3 group bg-white p-3 rounded-lg shadow-sm border border-red-100 berita-lokal-item flex flex-col justify-between";
        postCard.innerHTML = `
            <div>
                <img src="${berita.gambar}" alt="News" class="w-full h-48 object-cover rounded-lg mb-2">
                <span class="text-xs text-red-600 font-semibold">${berita.kategori}</span>
                <h3 class="font-bold text-gray-900 leading-snug mt-1">
                    ${berita.judul}
                </h3>
                <p class="text-xs text-gray-500 mt-1">${berita.isi.substring(0, 80)}...</p>
            </div>
            <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                <span class="text-[10px] text-red-500 font-medium">${berita.waktu}</span>
                <div class="space-x-1">
                    <button onclick="mulaiEditPost(${berita.id})" class="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded font-semibold hover:bg-blue-100 transition">Edit</button>
                    <button onclick="hapusPost(${berita.id})" class="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded font-semibold hover:bg-red-100 transition">Hapus</button>
                </div>
            </div>
        `;
        container.prepend(postCard);
    });
}
