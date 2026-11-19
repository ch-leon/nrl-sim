import SwiftUI
import WidgetKit

// The widget extension (docs/specs/ios.md §3). Phase 3: the match Live Activity.
// Phase 5 adds the club widgets (next fixture, injured star back) to this bundle.
@main
struct BigCoachWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MatchLiveActivity()
    }
}
