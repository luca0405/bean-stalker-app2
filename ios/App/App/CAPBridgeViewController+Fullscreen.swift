import UIKit
import Capacitor

extension CAPBridgeViewController {
    
    open override func viewDidLoad() {
        super.viewDidLoad()
        
        // Force fullscreen configuration
        configureFullscreen()
    }
    
    open override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Ensure fullscreen on every appear
        configureFullscreen()
    }
    
    private func configureFullscreen() {
        // Configure WKWebView for native touch scrolling
        if let webView = self.webView {
            webView.frame = self.view.bounds
            webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            webView.backgroundColor = UIColor.white
            webView.isOpaque = true
            
            // CRITICAL: Disable WebView's own scrolling - let CSS handle it
            webView.scrollView.isScrollEnabled = false
            webView.scrollView.bounces = false
            webView.scrollView.alwaysBounceVertical = false
            webView.scrollView.alwaysBounceHorizontal = false
            webView.scrollView.showsVerticalScrollIndicator = false
            webView.scrollView.showsHorizontalScrollIndicator = false
            
            // Set content insets to zero
            webView.scrollView.contentInset = UIEdgeInsets.zero
            webView.scrollView.scrollIndicatorInsets = UIEdgeInsets.zero
            webView.scrollView.contentInsetAdjustmentBehavior = .never
        }
        
        // Configure view controller for fullscreen
        self.view.frame = UIScreen.main.bounds
        self.view.backgroundColor = UIColor.white
    }
    
    // Show status bar (user wants to see time, battery, signal)
    override open var prefersStatusBarHidden: Bool {
        return false
    }
    
    override open var preferredStatusBarUpdateAnimation: UIStatusBarAnimation {
        return .none
    }
}