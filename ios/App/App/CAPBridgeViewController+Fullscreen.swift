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
        // Hide status bar
        self.modalPresentationCapturesStatusBarAppearance = true
        
        // Configure WKWebView for fullscreen
        if let webView = self.webView {
            webView.frame = self.view.bounds
            webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            webView.backgroundColor = UIColor.white
            webView.isOpaque = true
            webView.scrollView.backgroundColor = UIColor.white
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            webView.scrollView.automaticallyAdjustsScrollIndicatorInsets = false
            webView.scrollView.bounces = false
            webView.scrollView.alwaysBounceVertical = false
            webView.scrollView.alwaysBounceHorizontal = false
            
            // Remove any content insets
            webView.scrollView.contentInset = UIEdgeInsets.zero
            webView.scrollView.scrollIndicatorInsets = UIEdgeInsets.zero
        }
        
        // Configure view controller
        self.edgesForExtendedLayout = []
        self.extendedLayoutIncludesOpaqueBars = false
        self.automaticallyAdjustsScrollViewInsets = false
        
        // Force view bounds
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