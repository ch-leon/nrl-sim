import ActivityKit
import Capacitor
import Foundation
import UIKit

// The LiveMatch plugin: the bridge between the game's JavaScript and the match Live
// Activity (docs/specs/ios.md §3, "The bridge"; Phase 3). A local plugin inside the app,
// not an npm package; GameViewController registers it with the bridge. Its JavaScript
// face is src/native/liveMatchPlugin.ts, driven by src/native/liveMatch.ts.
//
//   isAvailable() -> { available }       Live Activities allowed for this app right now
//   startMatch({ attributes, content })  -> { started }
//   updateMatch({ content, alert? })     alert only at full time (§6 Q9)
//   endMatch()                           ends it at once, no lingering result (§6)
//
// Every call resolves. With Live Activities switched off, or refused by the system,
// start answers { started: false } and the rest do nothing: the game never hears of it.
//
// Paused is native: when the app goes to the background (and the match stops with it,
// while the JavaScript may already be suspended) a live activity is updated to paused,
// and set back to live on return. At launch any activity left by an earlier run (the
// app was killed mid-match) is ended.
@objc(LiveMatchPlugin)
public class LiveMatchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveMatchPlugin"
    public let jsName = "LiveMatch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startMatch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateMatch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endMatch", returnType: CAPPluginReturnPromise),
    ]

    private let activities = MatchActivityController()

    override public func load() {
        activities.endLeftovers()
        let centre = NotificationCenter.default
        centre.addObserver(self, selector: #selector(didEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        centre.addObserver(self, selector: #selector(willEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
    }

    @objc func startMatch(_ call: CAPPluginCall) {
        guard let attributes = Self.decode(MatchActivityAttributes.self, call.getObject("attributes")),
              let content = Self.decode(MatchActivityAttributes.ContentState.self, call.getObject("content")) else {
            call.resolve(["started": false])
            return
        }
        activities.start(attributes, content) { started in call.resolve(["started": started]) }
    }

    @objc func updateMatch(_ call: CAPPluginCall) {
        guard let content = Self.decode(MatchActivityAttributes.ContentState.self, call.getObject("content")) else {
            call.resolve()
            return
        }
        let alert = call.getObject("alert").flatMap { a -> MatchActivityController.Alert? in
            guard let title = a["title"] as? String, let body = a["body"] as? String else { return nil }
            return MatchActivityController.Alert(title: title, body: body)
        }
        activities.update(content, alert: alert)
        call.resolve()
    }

    @objc func endMatch(_ call: CAPPluginCall) {
        activities.end()
        call.resolve()
    }

    @objc private func didEnterBackground() {
        activities.setBackground(true)
    }

    @objc private func willEnterForeground() {
        activities.setBackground(false)
    }

    /// A JavaScript object as one of the Codable shapes, or nil if it does not fit.
    private static func decode<T: Decodable>(_ type: T.Type, _ object: JSObject?) -> T? {
        guard let object, JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}

/// Owns the one match activity. Every change runs on the main queue, one after another
/// in the order the calls came, so an update can never overtake the start before it.
final class MatchActivityController {
    struct Alert {
        let title: String
        let body: String
    }

    private var activity: Activity<MatchActivityAttributes>?
    /// The last state the game sent (live, half-time, full-time; never paused).
    private var latest: MatchActivityAttributes.ContentState?
    private var inBackground = false
    private var chain: Task<Void, Never>?

    /// Queue `work` behind everything already queued.
    private func enqueue(_ work: @escaping @MainActor () async -> Void) {
        DispatchQueue.main.async {
            let previous = self.chain
            self.chain = Task { @MainActor in
                await previous?.value
                await work()
            }
        }
    }

    /// What the lock screen should show for the game's state: paused while the app is away.
    private func shown(_ state: MatchActivityAttributes.ContentState) -> MatchActivityAttributes.ContentState {
        guard inBackground, state.state == .live else { return state }
        var paused = state
        paused.state = .paused
        return paused
    }

    /// Ends every match activity this app has, including one from an earlier run.
    private func endAll() async {
        for leftover in Activity<MatchActivityAttributes>.activities {
            await leftover.end(nil, dismissalPolicy: .immediate)
        }
        activity = nil
        latest = nil
    }

    func endLeftovers() {
        enqueue { await self.endAll() }
    }

    func start(_ attributes: MatchActivityAttributes, _ content: MatchActivityAttributes.ContentState, done: @escaping (Bool) -> Void) {
        enqueue {
            await self.endAll()
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                done(false)
                return
            }
            do {
                // pushType nil: updated by the app itself, no push (that needs the paid account).
                self.activity = try Activity.request(
                    attributes: attributes,
                    content: ActivityContent(state: self.shown(content), staleDate: nil),
                    pushType: nil
                )
                self.latest = content
                done(true)
            } catch {
                done(false)
            }
        }
    }

    func update(_ content: MatchActivityAttributes.ContentState, alert: Alert?) {
        enqueue {
            guard let activity = self.activity else { return }
            self.latest = content
            // Only full time asks to light the screen; the game sends no other alert.
            let config = alert.map {
                AlertConfiguration(title: LocalizedStringResource("\($0.title)"), body: LocalizedStringResource("\($0.body)"), sound: .default)
            }
            await activity.update(ActivityContent(state: self.shown(content), staleDate: nil), alertConfiguration: config)
        }
    }

    func end() {
        enqueue { await self.endAll() }
    }

    /// The app went to the background (the match stopped) or came back.
    func setBackground(_ away: Bool) {
        // A few seconds of background time, so the paused update lands before iOS suspends us.
        let app = UIApplication.shared
        var task = UIBackgroundTaskIdentifier.invalid
        if away {
            task = app.beginBackgroundTask(withName: "LiveMatchPaused") {
                app.endBackgroundTask(task)
                task = .invalid
            }
        }
        enqueue {
            defer {
                if task != .invalid {
                    app.endBackgroundTask(task)
                    task = .invalid
                }
            }
            self.inBackground = away
            guard let activity = self.activity, let latest = self.latest, latest.state == .live else { return }
            await activity.update(ActivityContent(state: self.shown(latest), staleDate: nil))
        }
    }
}
