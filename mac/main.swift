import Cocoa
import WebKit
import Foundation

// MARK: - Process Execution Helpers
func findDockerBinary() -> String? {
    let candidatePaths = [
        "/opt/homebrew/bin/docker",
        "/usr/local/bin/docker",
        "\(NSHomeDirectory())/.orbstack/bin/docker",
        "/usr/bin/docker"
    ]
    for path in candidatePaths {
        if FileManager.default.isExecutableFile(atPath: path) {
            return path
        }
    }
    return nil
}

func runProcess(executable: String, arguments: [String], currentDirectory: String? = nil) -> (exitCode: Int32, output: String) {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    if let dir = currentDirectory {
        process.currentDirectoryURL = URL(fileURLWithPath: dir)
    }
    
    var env = ProcessInfo.processInfo.environment
    let currentPath = env["PATH"] ?? ""
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:" + currentPath
    process.environment = env
    
    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = pipe
    
    do {
        try process.run()
        process.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let out = String(data: data, encoding: .utf8) ?? ""
        return (process.terminationStatus, out)
    } catch {
        return (-1, error.localizedDescription)
    }
}

func readTokenFromEnv(at projectDir: String) -> String {
    let envFile = URL(fileURLWithPath: projectDir).appendingPathComponent(".env")
    guard let content = try? String(contentsOf: envFile, encoding: .utf8) else { return "" }
    for line in content.components(separatedBy: .newlines) {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        if trimmed.hasPrefix("CONTROL_TOKEN=") {
            let parts = trimmed.components(separatedBy: "=")
            if parts.count >= 2 {
                return parts[1...].joined(separator: "=").trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
    }
    return ""
}

func detectProjectPath() -> String {
    if let saved = UserDefaults.standard.string(forKey: "FlotillaProjectPath"),
       FileManager.default.fileExists(atPath: saved + "/compose.yaml") {
        return saved
    }
    
    let knownPaths = [
        "/Users/amithalder/Desktop/vpn-controller",
        NSHomeDirectory() + "/Desktop/vpn-controller",
        FileManager.default.currentDirectoryPath,
        Bundle.main.bundleURL.deletingLastPathComponent().path
    ]
    
    for path in knownPaths {
        if FileManager.default.fileExists(atPath: path + "/compose.yaml") {
            return path
        }
    }
    return FileManager.default.currentDirectoryPath
}

// MARK: - App Delegate
class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var loadingView: NSView!
    var statusLabel: NSTextField!
    var spinner: NSProgressIndicator!
    var retryButton: NSButton!
    
    var projectPath: String = ""
    var controlToken: String = ""
    let controllerURL = URL(string: "http://127.0.0.1:8088")!
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        projectPath = detectProjectPath()
        controlToken = readTokenFromEnv(at: projectPath)
        
        setupMenu()
        setupWindow()
        checkAndBootController()
    }
    
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            window?.makeKeyAndOrderFront(nil)
        }
        return true
    }
    
    // MARK: - Window Setup
    func setupWindow() {
        let rect = NSRect(x: 0, y: 0, width: 1320, height: 860)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "Flotilla"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.minSize = NSSize(width: 960, height: 600)
        window.isReleasedWhenClosed = false
        window.backgroundColor = NSColor(red: 0.03, green: 0.04, blue: 0.06, alpha: 1.0)
        
        // Setup WKWebView with Token Injection
        let userContentController = WKUserContentController()
        if !controlToken.isEmpty {
            let scriptSource = """
            (function() {
                try {
                    localStorage.setItem('mvpn-token', '\(controlToken)');
                } catch(e) {}
            })();
            """
            let userScript = WKUserScript(source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            userContentController.addUserScript(userScript)
        }
        
        let config = WKWebViewConfiguration()
        config.userContentController = userContentController
        config.websiteDataStore = .default()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        webView = WKWebView(frame: rect, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground") // Transparent background
        
        // Setup Loading / Splash View
        loadingView = NSView(frame: rect)
        loadingView.autoresizingMask = [.width, .height]
        loadingView.wantsLayer = true
        loadingView.layer?.backgroundColor = NSColor(red: 0.03, green: 0.04, blue: 0.06, alpha: 1.0).cgColor
        
        let centerBox = NSView(frame: NSRect(x: (rect.width - 400) / 2, y: (rect.height - 240) / 2, width: 400, height: 240))
        centerBox.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
        
        // Title
        let titleLabel = NSTextField(labelWithString: "FLOTILLA")
        titleLabel.frame = NSRect(x: 0, y: 150, width: 400, height: 32)
        titleLabel.alignment = .center
        titleLabel.font = NSFont.monospacedSystemFont(ofSize: 22, weight: .black)
        titleLabel.textColor = NSColor(red: 0.2, green: 0.9, blue: 0.6, alpha: 1.0)
        centerBox.addSubview(titleLabel)
        
        // Subtitle
        let subLabel = NSTextField(labelWithString: "Fleet Egress Control Plane")
        subLabel.frame = NSRect(x: 0, y: 125, width: 400, height: 20)
        subLabel.alignment = .center
        subLabel.font = NSFont.monospacedSystemFont(ofSize: 12, weight: .semibold)
        subLabel.textColor = NSColor.secondaryLabelColor
        centerBox.addSubview(subLabel)
        
        // Spinner
        spinner = NSProgressIndicator(frame: NSRect(x: 184, y: 70, width: 32, height: 32))
        spinner.style = .spinning
        spinner.controlSize = .regular
        spinner.startAnimation(nil)
        centerBox.addSubview(spinner)
        
        // Status text
        statusLabel = NSTextField(labelWithString: "Connecting to controller daemon…")
        statusLabel.frame = NSRect(x: 0, y: 35, width: 400, height: 20)
        statusLabel.alignment = .center
        statusLabel.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        statusLabel.textColor = NSColor.tertiaryLabelColor
        centerBox.addSubview(statusLabel)
        
        // Retry button
        retryButton = NSButton(title: "Retry", target: self, action: #selector(retryBoot))
        retryButton.frame = NSRect(x: 150, y: 0, width: 100, height: 26)
        retryButton.bezelStyle = .rounded
        retryButton.isHidden = true
        centerBox.addSubview(retryButton)
        
        loadingView.addSubview(centerBox)
        
        window.contentView?.addSubview(webView)
        window.contentView?.addSubview(loadingView)
        window.makeKeyAndOrderFront(nil)
    }
    
    // MARK: - Controller Lifecycle
    @objc func retryBoot() {
        retryButton.isHidden = true
        spinner.startAnimation(nil)
        statusLabel.stringValue = "Checking fleet controller…"
        checkAndBootController()
    }
    
    func checkAndBootController() {
        pingController { [weak self] isRunning in
            guard let self = self else { return }
            if isRunning {
                DispatchQueue.main.async {
                    self.showWebview()
                }
            } else {
                DispatchQueue.global(qos: .userInitiated).async {
                    self.bootStack()
                }
            }
        }
    }
    
    func bootStack() {
        guard let docker = findDockerBinary() else {
            DispatchQueue.main.async {
                self.spinner.stopAnimation(nil)
                self.statusLabel.stringValue = "Docker not found. Install Docker Desktop or OrbStack."
                self.retryButton.isHidden = false
            }
            return
        }
        
        DispatchQueue.main.async {
            self.statusLabel.stringValue = "Starting Docker compose stack…"
        }
        
        let result = runProcess(executable: docker, arguments: ["compose", "-p", "mvpn", "up", "-d"], currentDirectory: projectPath)
        if result.exitCode != 0 {
            // Check if Docker daemon is running
            let infoRes = runProcess(executable: docker, arguments: ["info"])
            if infoRes.exitCode != 0 {
                DispatchQueue.main.async {
                    self.statusLabel.stringValue = "Docker daemon is not running. Launching Docker…"
                    NSWorkspace.shared.open(URL(fileURLWithPath: "/Applications/Docker.app"))
                }
            }
        }
        
        // Poll for controller readiness (up to 45 seconds)
        for i in 1...45 {
            Thread.sleep(forTimeInterval: 1.0)
            let sema = DispatchSemaphore(value: 0)
            var ready = false
            self.pingController { isUp in
                ready = isUp
                sema.signal()
            }
            _ = sema.wait(timeout: .now() + 2.0)
            
            if ready {
                DispatchQueue.main.async {
                    self.showWebview()
                }
                return
            }
            
            DispatchQueue.main.async {
                self.statusLabel.stringValue = "Waiting for controller to respond (\(45 - i)s)…"
            }
        }
        
        DispatchQueue.main.async {
            self.spinner.stopAnimation(nil)
            self.statusLabel.stringValue = "Controller did not start in time."
            self.retryButton.isHidden = false
        }
    }
    
    func pingController(completion: @escaping (Bool) -> Void) {
        var req = URLRequest(url: controllerURL)
        req.timeoutInterval = 2.0
        let task = URLSession.shared.dataTask(with: req) { _, response, error in
            if let http = response as? HTTPURLResponse, (http.statusCode == 200 || http.statusCode == 403 || http.statusCode == 400) {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }
    
    func showWebview() {
        statusLabel.stringValue = "Connected! Loading console…"
        webView.load(URLRequest(url: controllerURL))
        
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.35
            loadingView.animator().alphaValue = 0.0
        }, completionHandler: {
            self.loadingView.isHidden = true
            self.spinner.stopAnimation(nil)
        })
    }
    
    // MARK: - Menu Setup
    func setupMenu() {
        let mainMenu = NSMenu()
        
        // Flotilla App Menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "Flotilla")
        appMenu.addItem(NSMenuItem(title: "About Flotilla", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Hide Flotilla", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"))
        let hideOthers = NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthers)
        appMenu.addItem(NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Flotilla", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)
        
        // Edit Menu (Required for ⌘C / ⌘V / ⌘A to work in WebKit!)
        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(NSMenuItem(title: "Undo", action: #selector(UndoManager.undo), keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo", action: #selector(UndoManager.redo), keyEquivalent: "Z"))
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)
        
        // View Menu
        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(NSMenuItem(title: "Reload Dashboard", action: #selector(reloadDashboard), keyEquivalent: "r"))
        viewMenu.addItem(NSMenuItem.separator())
        viewMenu.addItem(NSMenuItem(title: "Actual Size", action: #selector(resetZoom), keyEquivalent: "0"))
        viewMenu.addItem(NSMenuItem(title: "Zoom In", action: #selector(zoomIn), keyEquivalent: "+"))
        viewMenu.addItem(NSMenuItem(title: "Zoom Out", action: #selector(zoomOut), keyEquivalent: "-"))
        viewMenu.addItem(NSMenuItem.separator())
        viewMenu.addItem(NSMenuItem(title: "Toggle Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"))
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)
        
        // Fleet Menu
        let fleetMenuItem = NSMenuItem()
        let fleetMenu = NSMenu(title: "Fleet")
        fleetMenu.addItem(NSMenuItem(title: "Open in External Browser", action: #selector(openExternal), keyEquivalent: "b"))
        fleetMenu.addItem(NSMenuItem.separator())
        fleetMenu.addItem(NSMenuItem(title: "Restart Fleet Containers", action: #selector(restartStack), keyEquivalent: ""))
        fleetMenuItem.submenu = fleetMenu
        mainMenu.addItem(fleetMenuItem)
        
        // Window Menu
        let windowMenuItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"))
        windowMenu.addItem(NSMenuItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: ""))
        windowMenuItem.submenu = windowMenu
        mainMenu.addItem(windowMenuItem)
        
        NSApplication.shared.mainMenu = mainMenu
    }
    
    // MARK: - Actions
    @objc func reloadDashboard() {
        webView?.reload()
    }
    
    @objc func resetZoom() {
        webView?.pageZoom = 1.0
    }
    
    @objc func zoomIn() {
        webView?.pageZoom += 0.1
    }
    
    @objc func zoomOut() {
        webView?.pageZoom = max(0.5, (webView?.pageZoom ?? 1.0) - 0.1)
    }
    
    @objc func openExternal() {
        NSWorkspace.shared.open(controllerURL)
    }
    
    @objc func restartStack() {
        guard let docker = findDockerBinary() else { return }
        loadingView.isHidden = false
        loadingView.alphaValue = 1.0
        statusLabel.stringValue = "Restarting Docker containers…"
        spinner.startAnimation(nil)
        
        DispatchQueue.global(qos: .userInitiated).async {
            _ = runProcess(executable: docker, arguments: ["compose", "-p", "mvpn", "restart", "controller"], currentDirectory: self.projectPath)
            Thread.sleep(forTimeInterval: 2.0)
            DispatchQueue.main.async {
                self.showWebview()
            }
        }
    }
}

// MARK: - Entry Point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
