import Capacitor
import Foundation
import WidgetKit

// The ClubWidgets plugin: the game's JavaScript hands the club widgets a new snapshot
// (docs/specs/ios.md §3 (b) and (c), "The bridge"; Phase 5). A local plugin inside the
// app; GameViewController registers it with the bridge. Its JavaScript face is
// src/native/clubWidgetsPlugin.ts, driven by src/native/clubWidgets.ts, which calls it
// only when the snapshot has changed (a week played, a match committed, points spent,
// an injury), never on a clock.
//
//   writeSnapshot({ json }) -> { written }   stores it in the App Group, reloads the widgets
//
// Every call resolves. Without the App Group (not provisioned on this install), or with
// a snapshot this build cannot read, it answers { written: false } and does nothing.
@objc(ClubWidgetsPlugin)
public class ClubWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClubWidgetsPlugin"
    public let jsName = "ClubWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "writeSnapshot", returnType: CAPPluginReturnPromise),
    ]

    @objc func writeSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), ClubSnapshotStore.write(json: json) else {
            call.resolve(["written": false])
            return
        }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["written": true])
    }
}
