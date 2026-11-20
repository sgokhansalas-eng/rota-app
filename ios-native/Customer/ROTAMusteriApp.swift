import SwiftUI

@main
struct ROTAMusteriApp: App {
    var body: some Scene {
        WindowGroup {
            ROTAWebView(urlString: "https://rota-musteri-giris-yeni.onrender.com/")
        }
    }
}
