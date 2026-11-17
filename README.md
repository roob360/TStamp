# TStamp

Aplikasi desktop (Electron) untuk menambahkan timestamp, lokasi, hashtag, dan logo pada foto, untuk kebutuhan laporan logbook.

## Fitur

- Input foto lewat drag and drop, Ctrl+V, atau tombol Tambah foto. Bisa banyak foto sekaligus.
- Tanggal dan jam bisa diatur per foto, atau diterapkan ke semua foto.
- Jam acak dalam rentang yang ditentukan (default 09.00 sampai 17.00).
- Lokasi, hashtag, dan logo bisa diubah. Pengaturan diingat.
- Simpan satu foto, simpan semua ke satu folder, atau salin ke clipboard (tombol atau Ctrl+C).

## Menjalankan

Butuh Node.js.

```
npm install
npm start
```

Di Windows bisa dengan klik dua kali `jalankan.bat`.

## Membuat .exe portable

```
npm run build
```

Hasilnya `dist\TStamp.exe`. Di Windows bisa dengan klik dua kali `build.bat`.

## Font teks pada foto

Teks pada foto memakai Roboto bila tersedia. Pasang Roboto di sistem, atau taruh `Roboto-Regular.ttf` di folder `fonts`. Tanpa itu, dipakai Segoe UI.

## Tampilan

Antarmuka mengikuti design system "macOS 27" (tema terang dan gelap mengikuti pengaturan sistem).
