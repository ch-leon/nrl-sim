import SwiftUI
import WidgetKit

// The club widget (docs/specs/ios.md §3 (b) and (c), Phase 5): your next match, the best
// injured player and how many rounds until he is back, and the level points waiting to be
// spent. Lock Screen (rectangular, inline) and Home Screen (small, medium).
//
// It shows the snapshot the app last wrote (ClubSnapshot, in the App Group) and nothing
// else. Counts are in game rounds and only change when you play, so the timeline is one
// entry with a .never policy: the app reloads it after each change it writes. No date or
// time is shown, nothing counts down by itself, and there is no refresh interval (§6).
// The entry's `date` is WidgetKit's own field, required by the protocol; it is never shown.
struct ClubWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: ClubSnapshotStore.widgetKind, provider: ClubProvider()) { entry in
            ClubWidgetView(snapshot: entry.snapshot)
                .widgetURL(ClubSnapshotStore.openURL)
        }
        .configurationDisplayName("Big Coach")
        .description("Your next match, who is injured and the points you can spend. Counts in rounds; it changes when you play.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .systemSmall, .systemMedium])
    }
}

struct ClubEntry: TimelineEntry {
    let date: Date
    /// Nil before the app has written one (or without the App Group): the empty state.
    let snapshot: ClubSnapshot?
}

struct ClubProvider: TimelineProvider {
    func placeholder(in context: Context) -> ClubEntry {
        ClubEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ClubEntry) -> Void) {
        // The widget gallery shows the sample until the game has written a real one.
        let stored = ClubSnapshotStore.read()
        completion(ClubEntry(date: Date(), snapshot: stored ?? (context.isPreview ? .sample : nil)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ClubEntry>) -> Void) {
        // One entry, now, and never a later one: only the app's next write changes it.
        completion(Timeline(entries: [ClubEntry(date: Date(), snapshot: ClubSnapshotStore.read())], policy: .never))
    }
}

extension ClubSnapshot {
    /// What the widget gallery and the placeholder show.
    static let sample = ClubSnapshot(
        v: 1,
        club: Club(name: "Your club", colors: ["#ff6b1a", "#0b1220"]),
        season: 1,
        week: 7,
        when: "Week 7 of 27 · Season 1",
        next: NextMatch(stage: "Round 7", stageShort: "R7", opponent: "Rivals", opponentShort: "Rivals", venue: "away"),
        noMatch: nil,
        injured: Injured(name: "Your star", position: "halfback", stars: 4, rounds: 2, others: 0),
        points: 3
    )
}

/// The widget's lines, in the game's plain second-person voice.
enum ClubLines {
    static let empty = "Open Big Coach to pick up your season"

    /// "Round 7 v Brisbane · away", or what the game says when there is no match.
    static func match(_ s: ClubSnapshot, short: Bool = false) -> String {
        guard let n = s.next else { return s.noMatch ?? "No match this week" }
        return "\(short ? n.stageShort : n.stage) v \(n.opponentShort) · \(n.venue)"
    }

    /// "Walker back in 2 rounds".
    static func injured(_ i: ClubSnapshot.Injured) -> String {
        "\(i.name) back in \(i.rounds) \(i.rounds == 1 ? "round" : "rounds")"
    }

    /// "+2 more out", or nil with nobody else injured.
    static func others(_ i: ClubSnapshot.Injured) -> String? {
        i.others > 0 ? "+\(i.others) more out" : nil
    }

    /// "3 points to spend", or nil with none.
    static func points(_ s: ClubSnapshot) -> String? {
        guard s.points > 0 else { return nil }
        return "\(s.points) \(s.points == 1 ? "point" : "points") to spend"
    }

    /// "4.5★".
    static func stars(_ i: ClubSnapshot.Injured) -> String {
        let whole = i.stars.rounded(.down) == i.stars
        return (whole ? String(Int(i.stars)) : String(format: "%.1f", i.stars)) + "★"
    }
}

struct ClubWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let snapshot: ClubSnapshot?

    var body: some View {
        switch family {
        case .accessoryInline:
            InlineClubView(snapshot: snapshot)
                .clubWidgetBackground(.clear)
        case .accessoryRectangular:
            RectangularClubView(snapshot: snapshot)
                .clubWidgetBackground(.clear)
        case .systemMedium:
            MediumClubView(snapshot: snapshot)
                .clubWidgetBackground(BrandColor.ink)
        default:
            SmallClubView(snapshot: snapshot)
                .clubWidgetBackground(BrandColor.ink)
        }
    }
}

// MARK: Lock Screen (the system's vibrant rendering: no brand colours)

struct InlineClubView: View {
    let snapshot: ClubSnapshot?

    var body: some View {
        if let s = snapshot {
            Text(ClubLines.match(s, short: true))
        } else {
            Text("Open Big Coach")
        }
    }
}

struct RectangularClubView: View {
    let snapshot: ClubSnapshot?

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            if let s = snapshot {
                Text(ClubLines.match(s))
                    .font(.headline)
                    .widgetAccentable()
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                if let i = s.injured {
                    Label(ClubLines.injured(i), systemImage: "cross.case.fill")
                        .font(.caption)
                        .lineLimit(1)
                }
                if let p = ClubLines.points(s) {
                    Label(p, systemImage: "arrow.up.circle.fill")
                        .font(.caption)
                        .lineLimit(1)
                }
                if s.injured == nil && s.points == 0 {
                    Text(s.when)
                        .font(.caption)
                        .lineLimit(1)
                }
            } else {
                Text(ClubLines.empty)
                    .font(.caption)
                    .lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: Home Screen (SuperCOOKED: ink background, the accent for one highlight)

/// The club's name over a thin bar in its first colour.
struct ClubHeader: View {
    let snapshot: ClubSnapshot

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 1.5)
                .fill(ClubWidgetColor.parse(snapshot.club.colors.first) ?? BrandColor.accent)
                .frame(width: 3, height: 12)
            Text(snapshot.club.name.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(BrandColor.muted)
                .lineLimit(1)
        }
    }
}

/// The next match: the stage in the accent, the opponent, home or away.
struct NextMatchBlock: View {
    let snapshot: ClubSnapshot
    let large: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let n = snapshot.next {
                Text(n.stage.uppercased())
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(BrandColor.accent)
                    .lineLimit(1)
                Text("v \(n.opponentShort)")
                    .font(.system(size: large ? 20 : 17, weight: .bold))
                    .foregroundColor(BrandColor.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(n.venue.capitalized)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(BrandColor.text2)
            } else {
                Text(snapshot.noMatch ?? "No match this week")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(BrandColor.text)
                    .lineLimit(3)
            }
        }
    }
}

struct InjuredLine: View {
    let injured: ClubSnapshot.Injured
    let detailed: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Image(systemName: "cross.case.fill")
                    .font(.system(size: 10))
                    .foregroundColor(BrandColor.neg)
                Text(ClubLines.injured(injured))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(BrandColor.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            if detailed {
                Text([ClubLines.stars(injured), ClubLines.others(injured)].compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 11))
                    .foregroundColor(BrandColor.muted)
                    .lineLimit(1)
            }
        }
    }
}

struct PointsLine: View {
    let text: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "arrow.up.circle.fill")
                .font(.system(size: 10))
                .foregroundColor(BrandColor.pos)
            Text(text)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(BrandColor.text)
                .lineLimit(1)
        }
    }
}

struct EmptyClubView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("BIG COACH")
                .font(.system(size: 11, weight: .heavy))
                .foregroundColor(BrandColor.accent)
            Text(ClubLines.empty)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(BrandColor.text)
                .lineLimit(4)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct SmallClubView: View {
    let snapshot: ClubSnapshot?

    var body: some View {
        if let s = snapshot {
            VStack(alignment: .leading, spacing: 6) {
                ClubHeader(snapshot: s)
                NextMatchBlock(snapshot: s, large: false)
                Spacer(minLength: 0)
                if let i = s.injured {
                    InjuredLine(injured: i, detailed: false)
                }
                if let p = ClubLines.points(s) {
                    PointsLine(text: p)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        } else {
            EmptyClubView()
        }
    }
}

struct MediumClubView: View {
    let snapshot: ClubSnapshot?

    var body: some View {
        if let s = snapshot {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    ClubHeader(snapshot: s)
                    NextMatchBlock(snapshot: s, large: true)
                    Spacer(minLength: 0)
                    Text(s.when)
                        .font(.system(size: 11))
                        .foregroundColor(BrandColor.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                Rectangle()
                    .fill(BrandColor.line)
                    .frame(width: 1)
                VStack(alignment: .leading, spacing: 10) {
                    if let i = s.injured {
                        InjuredLine(injured: i, detailed: true)
                    } else {
                        Text("Nobody injured")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(BrandColor.text2)
                    }
                    if let p = ClubLines.points(s) {
                        PointsLine(text: p)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        } else {
            EmptyClubView()
        }
    }
}

// MARK: Helpers (named for this widget, so they cannot clash with the Live Activity's)

enum ClubWidgetColor {
    /// "#rrggbb" as a colour, or nil.
    static func parse(_ hex: String?) -> Color? {
        guard let hex, hex.count == 7, hex.hasPrefix("#"), let v = UInt32(hex.dropFirst(), radix: 16) else { return nil }
        return Color(.sRGB,
                     red: Double((v >> 16) & 0xff) / 255,
                     green: Double((v >> 8) & 0xff) / 255,
                     blue: Double(v & 0xff) / 255,
                     opacity: 1)
    }
}

extension View {
    /// The widget's background: containerBackground from iOS 17, a plain background before.
    @ViewBuilder
    func clubWidgetBackground(_ colour: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { colour }
        } else {
            background(colour)
        }
    }
}
