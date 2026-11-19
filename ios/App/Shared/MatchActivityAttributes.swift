import ActivityKit
import Foundation

// The Live Activity for the match you are playing (docs/specs/ios.md §3 (a), Phase 3).
// Compiled into both targets from this one file (ios/App/Shared is in both): the app's
// LiveMatchPlugin starts, updates and ends it; the BigCoachWidgets extension draws it.
//
// Field for field the TypeScript side's TickerAttributes and TickerContent
// (src/native/liveMatchTicker.ts), which the plugin decodes from JSON. Change one,
// change both. The whole payload is a few hundred bytes (Apple's limit is 4 KB).
//
// The minute and the clock line are as of the last update. Nothing here ticks by itself:
// no timer text, no timer progress bar, no stale date (§6, nothing timed).
struct MatchActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var homeScore: Int
        var awayScore: Int
        var half: Half
        /// The match minute of the last event before this update.
        var minute: Int
        /// "2nd half 4'", "Half-time", "Golden point 1'", "Full time".
        var clock: String
        /// The last big moment, one line ("TRY, Walker (BRI) 3'").
        var moment: String
        var state: MatchState
        /// The captain's pose. Phase 3 shows a ball for each; Phase 4 draws the poses.
        var pose: Pose
    }

    enum Half: String, Codable, Hashable {
        case first, second, golden
    }

    /// Live while the match plays. Paused is set by the plugin when the app goes to the
    /// background (the match stops then), and cleared when it comes back. Half-time is
    /// also the break before golden point (half == .golden).
    enum MatchState: String, Codable, Hashable {
        case live
        case paused
        case halfTime = "half-time"
        case fullTime = "full-time"
    }

    enum Pose: String, Codable, Hashable {
        case carry, `try`, tackle, fulltime
    }

    enum Side: String, Codable, Hashable {
        case home, away
    }

    /// The clubs' three-letter codes, as the match's score bug shows them.
    var homeCode: String
    var awayCode: String
    /// The player's club: starred, as the score bug stars it.
    var mine: Side
    /// Each club's first colour, "#rrggbb".
    var homeColor: String
    var awayColor: String

    /// Where a tap on the lock screen or the island goes. The scheme is in the app's
    /// Info.plist. Expected (not yet seen on a phone): the app opens where it was, and a
    /// match in progress resumes as it does after any return to the app.
    static let openURL = URL(string: "bigcoach://match")!
}
