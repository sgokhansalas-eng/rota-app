# ROTA — Google Play ve App Store yayın kontrol listesi

## Canlı adresler (20 Kasım 2026)
- Müşteri: https://rota-musteri-giris-yeni.onrender.com/
- Sürücü: https://rota-surucu-giris-guncel.onrender.com/

Bu adresler **mağaza linki değildir**. Paketlerin açacağı gerçek web uygulaması adresleridir.

## Kaynak / paket kimlikleri
| Uygulama | Android applicationId | iOS Bundle Identifier |
|---|---|---|
| Müşteri | `com.rota.app.customer` | `com.rota.ios.customer` |
| Sürücü | `com.rota.app.driver` | `com.rota.ios.driver` |

Her iki uygulamanın mağaza kaydı farklıdır.

## Android / Google Play
- [x] Android WebView bağlantılarını güncel canlı adreslere yönlendir.
- [x] Play için `bundleRelease` ve imza anahtarını yalnızca GitHub Secrets'tan okuyacak yapı oluştur.
- [ ] `store-play-aab.yml` doğrulama çalışmasının her iki uygulama için başarılı olması.
- [ ] Google Play Console geliştirici hesabı erişimi ve uygulama kayıtları.
- [ ] Google Play App Signing / yükleme anahtarı oluşturulması. Yükleme anahtarını kaybetmeyin.
- [ ] GitHub Actions secrets: `ROTA_UPLOAD_KEYSTORE_B64`, `ROTA_UPLOAD_STORE_PASSWORD`, `ROTA_UPLOAD_KEY_ALIAS`, `ROTA_UPLOAD_KEY_PASSWORD`.
- [ ] İmzalı AAB'leri `store-play-aab.yml` üzerinden oluşturma ve Play Console'a yükleme.
- [ ] 512x512 uygulama simgesi, 1024x500 öne çıkan grafik, gerçek cihaz ekran görüntüleri.
- [ ] Veri güvenliği formu, içerik derecelendirmesi, destek bağlantısı, reklam beyanı.
- [ ] Hesap silme için uygulama içi yol ve dışarıdan erişilebilen sayfa; gerçek silme akışının testi.
- [ ] Sürücü arka plan konumu için gerekçe, gerektiğinde Play izin beyanı ve demo videosu.
- [ ] Kapalı test / açık test gerekliliklerinin hesap bazında kontrolü.
- [ ] Gerçek Android cihazla kayıt, oturum, konum, çağrı, eşleşme, 4 haneli kod, iptal, rezervasyon ve sohbet testi.

**Dikkat:** `.github/workflows/build-apks.yml` DEBUG APK üretir; bu dosyalar Google Play için kullanılmaz. Mağazada **imzalı AAB** gereklidir.

## iOS / Apple App Store
- [x] SwiftUI giriş adresleri her iki uygulamada güncellendi.
- [ ] XcodeGen ile her iki iOS hedefinin derleme doğrulaması.
- [ ] Aktif Apple Developer üyeliği ve App Store Connect erişimi teyidi.
- [ ] İki Bundle ID için Apple Developer kaydı ve App Store Connect uygulama kayıtları.
- [ ] GitHub Secrets: `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_API_PRIVATE_KEY`, `APPLE_TEAM_ID`.
- [ ] Otomatik imzalama yetkileri/provisioning; iki imzalı IPA ve TestFlight yüklemesi.
- [ ] Gerçek iPhone'da giriş, kayıt, e-posta, konum, tuşlar, harita, rezervasyon, sürücü kodu ve çağrı testi.
- [ ] iPhone ekran görüntüleri, 1024x1024 ikon, yaş derecelendirmesi, App Privacy, destek ve gizlilik politikası URL'leri.
- [ ] App Store İnceleme (Review) için test hesabı, test adımları ve gerekli açıklamalar.
- [ ] Sürücü arka plan konum kullanımının çalışan, gerekli ve açıklanabilir olduğunun kontrolü.
- [ ] Store Review minimum işlevsellik değerlendirmesi: tek başına web sitesi sarmalayıcısı olmaması ve uygulamaya özgü işlevlerin çalışması.

## Gizlilik ve hukuki uyumluluk — sürümden önce onaylanmalı
- [ ] Gizlilik politikası gerçek uygulama verileri (ad, telefon/e-posta, konum, yolculuk, kimlik ve sürücü belgeleri, saklama/silme, üçüncü taraflar) açısından uzman incelemesinden geçti.
- [ ] Her iki uygulama için sunulacak **aktif HTTPS gizlilik politikası URL'si** belirlendi.
- [ ] Hesap silme talebinin nasıl uygulanacağı, destek süresi ve açık erişimli URL doğrulandı.
- [ ] Türkiye genelinde faaliyetin ve sürücü türlerinin ilgili mevzuat bakımından uygunluğu değerlendirildi.
- [ ] Ücretlendirme, kullanım ücretsizliği ve komisyon koşulları yazılı doğrulandı.
- [ ] Kullanıcı/veri güvenliği, test hesapları, destek ve hukuki işletme/iletişim bilgileri belirlendi.

## Sonuç
Bu repo mağaza **teknik hazırlıklarını** içerir. Dosyalar mağazaya gönderildi ya da onaylandı anlamına gelmez.
Play / App Store indirme bağlantıları ancak uygulamalar ilgili mağazalarda yayımlandıktan sonra paylaşılmalıdır.
