import UIKit
import Capacitor

// The game's screen: Capacitor's bridge view controller, held to a full-screen game
// (docs/specs/ios.md §2). No status bar, even before the web view loads. The home bar
// dims while you play because capacitor.config.ts sets SystemBars `hidden: true`, which
// Capacitor's own prefersHomeIndicatorAutoHidden reads (it is not ours to override).
// A swipe up from the bottom edge, where the match's own bottom bar sits, needs a
// second swipe before it leaves the app. The landscape-only lock is in Info.plist.
// SceneDelegate and Main.storyboard both make this class.
// It also registers the app's own native plugins with the bridge: LiveMatch, the match
// Live Activity (LiveActivity/LiveMatchPlugin.swift, docs/specs/ios.md §3).
class GameViewController: CAPBridgeViewController {
    override var prefersStatusBarHidden: Bool { true }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveMatchPlugin())
    }

    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .bottom }
}
