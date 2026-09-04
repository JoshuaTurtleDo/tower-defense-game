import UIKit
import WebKit

final class GameViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        if #available(iOS 15.4, *) {
            configuration.preferences.isElementFullscreenEnabled = true
        }
        configuration.websiteDataStore = .default()

        let nativeMarker = WKUserScript(
            source: "document.documentElement.classList.add('ios-app');",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(nativeMarker)

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 9 / 255, green: 19 / 255, blue: 14 / 255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let webRoot = Bundle.main.resourceURL?.appendingPathComponent("Web", isDirectory: true) else {
            showLoadError("The bundled game files could not be found.")
            return
        }
        let index = webRoot.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: webRoot)
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .landscapeRight }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showLoadError(error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showLoadError(error.localizedDescription)
    }

    private func showLoadError(_ message: String) {
        let escaped = message
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        webView.loadHTMLString("""
            <meta name="viewport" content="width=device-width">
            <body style="margin:0;background:#09130e;color:#f2ead3;font:16px -apple-system;display:grid;place-items:center;height:100vh;text-align:center">
              <div><h2>Stonewatch Keep could not start</h2><p>\(escaped)</p></div>
            </body>
            """, baseURL: nil)
    }
}
