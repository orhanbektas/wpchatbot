# 💬 WA Otomasyon

WhatsApp üzerinden toplu ve zamanlanmış mesaj gönderimi için geliştirilmiş, yerel çalışan bir otomasyon paneli.

> Geliştirici: [@orhanbektas](https://www.r10.net/profil/107948-orhanbektas.html) · R10.net

---

## ✅ Özellikler

- 📊 Gerçek zamanlı gösterge paneli
- 📱 QR kod ile WhatsApp bağlantısı
- 👥 Excel / CSV ile toplu kişi aktarımı
- 📣 Toplu ve zamanlanmış kampanya gönderimi
- ⏱️ Mesajlar arası rastgele gecikme (ban önleme)
- 🔥 Isınma modu (günlük limit kademeli artış, 14 gün)
- 🔀 Her mesaja benzersiz suffix (spam algısını azaltır)
- 📎 Fotoğraf / video gönderim desteği
- 📋 Sistem log takibi
- 🌙 Tamamen Türkçe arayüz

---

## ⚙️ Gereksinimler

| Gereksinim | Versiyon |
|------------|----------|
| Node.js | v22 veya üzeri |
| Google Chrome veya Microsoft Edge | Güncel sürüm |
| İşletim Sistemi | Windows 10/11, macOS, Linux |

---

## 🚀 Kurulum

### 1. Projeyi İndir

```bash
git clone https://github.com/orhanbektas/wpchatbot.git
cd whatsapp-automation-v2
```

veya ZIP olarak indirip klasörü açın.

---

### 2. Bağımlılıkları Kur

```bash
npm install --ignore-scripts
```

> `--ignore-scripts` bayrağı Chromium indirmesini engeller. Sistem Chrome/Edge otomatik bulunur.

---

### 3. Başlat

```bash
npm start
```

---

### 4. Paneli Aç

Tarayıcıda şu adrese git:

```
http://localhost:3000
```

---

### 5. WhatsApp Bağla

1. Sol menüden **WhatsApp Bağlantı**'ya tıkla
2. **Bağlan** butonuna bas
3. QR kod ekrana gelene kadar bekle (15–30 saniye)
4. Telefonunda: **WhatsApp → Bağlı Cihazlar → Cihaz Bağla**
5. QR kodu tarat → bağlantı kurulur ✅

---

## 📁 Klasör Yapısı

```
whatsapp-automation-v2/
├── src/
│   ├── core/          # WhatsApp client, kuyruk motoru, anti-ban
│   ├── db/            # SQLite veritabanı modelleri
│   ├── routes/        # API endpoint'leri
│   ├── services/      # İş mantığı
│   ├── utils/         # Yardımcı fonksiyonlar
│   └── web/           # Panel arayüzü (HTML + JS)
├── config/            # Uygulama ayarları
├── app.js             # Giriş noktası
└── package.json
```

---

## ⚠️ Önemli Notlar

- Bu araç **kişisel veya ticari kullanım** için geliştirilmiştir
- WhatsApp'ın kullanım koşullarına aykırı toplu spam gönderimi **hesap banına** yol açar
- Isınma modunu kullanın, günlük limitlere dikkat edin
- `.wwebjs_auth/` klasörünü **asla paylaşmayın** — WhatsApp oturumunuzu içerir

---

## 🔧 Sorun Giderme

**Chrome bulunamadı hatası:**
- Google Chrome veya Microsoft Edge kurulu olduğundan emin olun
- `.env` dosyasında `CHROME_PATH=` satırı varsa silin (otomatik bulunur)

**QR kodu gelmiyor:**
- Chrome'un arka planda açılması 15–30 saniye sürebilir
- Terminalde hata varsa bir issue açın

**Mesaj gönderilmiyor:**
- WhatsApp bağlantısının yeşil (READY) olduğunu kontrol edin
- Isınma limitine ulaşılmış olabilir, Ayarlar sayfasını kontrol edin

---

## 📄 Lisans

MIT License © 2026 orhanbektas

Detaylar için [LICENSE](LICENSE) dosyasına bakın.
