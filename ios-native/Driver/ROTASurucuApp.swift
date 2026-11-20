import SwiftUI

@main
struct ROTASurucuApp: App {
    var body: some Scene {
        WindowGroup {
            ROTAWebView(urlString: "https://rota-surucu-giris-guncel.onrender.com/")
        }
    }
}
