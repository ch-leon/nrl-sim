import SwiftUI
import WidgetKit

// The widget extension (docs/specs/ios.md §3). Phase 3: the match Live Activity.
// Phase 5: the club widget (next match, injured star back, points to spend; ClubWidget.swift).
@main
struct BigCoachWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MatchLiveActivity()
        ClubWidget()
    }
}
