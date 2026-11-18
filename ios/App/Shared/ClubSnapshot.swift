import Foundation

// What the club widgets show (docs/specs/ios.md §3 (b) and (c), Phase 5). Compiled into
// both targets from this one file (ios/App/Shared is in both): the app's ClubWidgetsPlugin
// writes it to the App Group, the BigCoachWidgets extension reads it and draws it.
//
// Field for field the TypeScript side's ClubSnapshot (src/native/clubSnapshot.ts), which
// the game builds from its state. Change one, change both. Everything counts in game
// rounds and only changes when you play: no date, no time, nothing that ticks.
struct ClubSnapshot: Codable, Equatable {
    struct Club: Codable, Equatable {
        var name: String
        /// The club's two colours, "#rrggbb".
        var colors: [String]
    }

    struct NextMatch: Codable, Equatable {
        /// "Round 7", "Pre-season trial 1", "Semi final", "Week 5 · League · round 3".
        var stage: String
        /// "R7", "Trial 1", "SF", "W5".
        var stageShort: String
        var opponent: String
        /// The opponent's place name, "Broken Hill" for "Broken Hill Brollys".
        var opponentShort: String
        /// "home", "away" or "neutral".
        var venue: String
    }

    struct Injured: Codable, Equatable {
        var name: String
        var position: String
        /// Half-star steps, as the squad shows them.
        var stars: Double
        /// Week advances until he is fit.
        var rounds: Int
        /// How many others are out injured as well.
        var others: Int
    }

    /// Schema version. A widget only draws the versions it knows (supported).
    var v: Int
    var club: Club
    var season: Int
    var week: Int
    /// The game's clock line: "Week 7 of 27 · Season 2".
    var when: String
    var next: NextMatch?
    /// With no next match: what the game says instead ("No more matches this season").
    var noMatch: String?
    var injured: Injured?
    /// Level points banked across the squad. 0 hides the line.
    var points: Int

    /// The schema versions this build can draw.
    static let supported = 1...1
}

/// Where the snapshot lives: the App Group both targets share. Writes are the app's,
/// reads the extension's. Without the group (it was not provisioned) both do nothing.
enum ClubSnapshotStore {
    static let group = "group.au.com.supercooked.bigrugbycoach.dev"
    static let key = "clubSnapshot"
    /// The widget kind, for reloads (ClubWidget in the extension).
    static let widgetKind = "BigCoachClub"
    /// Where a tap on a club widget goes. The scheme is in the app's Info.plist; the
    /// app opens where it was.
    static let openURL = URL(string: "bigcoach://club")!

    /// The group's defaults, or nil when the container is unavailable.
    private static var defaults: UserDefaults? {
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil else { return nil }
        return UserDefaults(suiteName: group)
    }

    /// The snapshot as the app last wrote it, or nil (none yet, an unknown version, or no group).
    static func read() -> ClubSnapshot? {
        guard let data = defaults?.data(forKey: key),
              let snapshot = try? JSONDecoder().decode(ClubSnapshot.self, from: data),
              ClubSnapshot.supported.contains(snapshot.v) else { return nil }
        return snapshot
    }

    /// Stores `json` if it is a snapshot this build can read. False when it is not, or there is no group.
    static func write(json: String) -> Bool {
        guard let data = json.data(using: .utf8),
              let snapshot = try? JSONDecoder().decode(ClubSnapshot.self, from: data),
              ClubSnapshot.supported.contains(snapshot.v),
              let defaults else { return false }
        defaults.set(data, forKey: key)
        return true
    }
}
