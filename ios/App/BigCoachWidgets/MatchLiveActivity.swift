import ActivityKit
import SwiftUI
import WidgetKit

// The match Live Activity's views (docs/specs/ios.md §3 (a), Phase 3): the lock screen,
// and the Dynamic Island's compact, minimal and expanded forms. Static text only: the
// minute is the one the last update carried; nothing counts or animates by itself.
// Colours are the SuperCOOKED tokens (BrandColors.swift, generated). Fonts are the
// system's for now: the brand fonts ship as woff2, which an extension cannot load.
struct MatchLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MatchActivityAttributes.self) { context in
            MatchLockScreenView(attributes: context.attributes, state: context.state)
                .activityBackgroundTint(BrandColor.ink)
                .activitySystemActionForegroundColor(BrandColor.text)
                .widgetURL(MatchActivityAttributes.openURL)
        } dynamicIsland: { context in
            let a = context.attributes
            let s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        CaptainIcon(pose: s.pose, large: true)
                        TeamTag(code: a.homeCode, colour: Color(hex: a.homeColor), mine: a.mine == .home)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TeamTag(code: a.awayCode, colour: Color(hex: a.awayColor), mine: a.mine == .away)
                }
                DynamicIslandExpandedRegion(.center) {
                    ScoreText(home: s.homeScore, away: s.awayScore, size: 24)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 2) {
                        StatusLine(state: s)
                        Text(s.moment)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(BrandColor.text2)
                            .lineLimit(1)
                    }
                }
            } compactLeading: {
                CaptainBadge(pose: s.pose)
            } compactTrailing: {
                // Where the island is squeezed (iOS 27) the icon stands alone, with no score.
                WhenRoomy {
                    ScoreText(home: s.homeScore, away: s.awayScore, size: 14)
                }
            } minimal: {
                CaptainBadge(pose: s.pose)
            }
            .widgetURL(MatchActivityAttributes.openURL)
            .keylineTint(BrandColor.accent)
        }
    }
}

/// The lock screen: both clubs and the score on one row, the half and minute with the
/// state under it, and the last big moment.
struct MatchLockScreenView: View {
    let attributes: MatchActivityAttributes
    let state: MatchActivityAttributes.ContentState

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            CaptainIcon(pose: state.pose, large: true)
            details
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                TeamTag(code: attributes.homeCode, colour: Color(hex: attributes.homeColor), mine: attributes.mine == .home)
                Spacer(minLength: 4)
                ScoreText(home: state.homeScore, away: state.awayScore, size: 30)
                Spacer(minLength: 4)
                TeamTag(code: attributes.awayCode, colour: Color(hex: attributes.awayColor), mine: attributes.mine == .away)
            }
            StatusLine(state: state)
            Text(state.moment)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(BrandColor.text)
                .lineLimit(1)
        }
    }
}

/// A club's colour stripe and code; the player's club starred, as the score bug does.
struct TeamTag: View {
    let code: String
    let colour: Color
    let mine: Bool

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(colour)
                .frame(width: 4, height: 22)
            Text(mine ? "\(code) ★" : code)
                .font(.system(size: 17, weight: .heavy))
                .foregroundColor(mine ? BrandColor.accent : BrandColor.text)
                .lineLimit(1)
        }
    }
}

struct ScoreText: View {
    let home: Int
    let away: Int
    let size: CGFloat

    var body: some View {
        Text("\(home) – \(away)")
            .font(.system(size: size, weight: .black))
            .monospacedDigit()
            .foregroundColor(BrandColor.text)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }
}

/// "2nd half 4'  ·  LIVE", or the break, or paused with the way back.
struct StatusLine: View {
    let state: MatchActivityAttributes.ContentState

    private var label: (text: String, colour: Color) {
        switch state.state {
        case .live: return ("LIVE", BrandColor.accent)
        case .paused: return ("PAUSED · TAP TO RETURN", BrandColor.muted)
        // The break before golden point is a half-time state with half golden.
        case .halfTime: return (state.half == .golden ? "GOLDEN POINT NEXT" : "HALF-TIME", BrandColor.text2)
        case .fullTime: return ("FULL TIME", BrandColor.win)
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            if state.state == .live || state.state == .paused {
                Text(state.clock)
                    .font(.system(size: 13, weight: .semibold))
                    .monospacedDigit()
                    .foregroundColor(BrandColor.text2)
                Text("·").foregroundColor(BrandColor.muted)
            }
            Text(label.text)
                .font(.system(size: 13, weight: .heavy))
                .foregroundColor(label.colour)
        }
        .lineLimit(1)
    }
}

/// The image and the spoken name of each pose.
extension MatchActivityAttributes.Pose {
    var imageName: String {
        switch self {
        case .carry: return "CaptainCarry"
        case .try: return "CaptainTry"
        case .tackle: return "CaptainTackle"
        case .fulltime: return "CaptainFulltime"
        }
    }

    var label: String {
        switch self {
        case .carry: return "Captain with the ball"
        case .try: return "Try"
        case .tackle: return "Tackled"
        case .fulltime: return "Full time"
        }
    }
}

/// How big the captain is drawn, as a pure function of the screen's scale, so pixel art stays crisp.
///
/// The pictures are the game's art pixels enlarged x2 (80 x 82 image pixels for 40 x 41 art
/// pixels). A picture is sharp when every art pixel covers a whole number of device pixels, so the
/// size in points is `art pixels x device pixels per art pixel / screen scale`, with that
/// whole number chosen per scale:
///   3x screen: small 2 device pixels per art pixel = 26.7 x 27.3 pt (80 x 82 px); large 4 = 53.3 x 54.7 pt (160 x 164 px).
///   2x screen: small 2 = 40 x 41 pt (80 x 82 px); large 3 = 60 x 61.5 pt (120 x 123 px).
/// Small is what the island's compact and minimal slots take (about 27 pt tall on the phones that
/// have an island, all 3x); large is the expanded island and the lock screen, where there is room.
enum CaptainSize {
    /// The art's canvas in art pixels (the PNGs are twice this; tests/native/iosCaptainAssets.test.ts pins it).
    static let artWidth = 40
    static let artHeight = 41

    /// Device pixels one art pixel covers: 2 when small, one more than the scale when large (3x gives 4, 2x gives 3).
    static func devicePixelsPerArtPixel(scale: CGFloat, large: Bool) -> Int {
        let whole = max(2, Int(scale.rounded()))
        return large ? whole + 1 : 2
    }

    static func points(scale: CGFloat, large: Bool) -> CGSize {
        let k = CGFloat(devicePixelsPerArtPixel(scale: scale, large: large))
        let s = max(2, scale.rounded())
        return CGSize(width: CGFloat(artWidth) * k / s, height: CGFloat(artHeight) * k / s)
    }
}

/// The captain, drawn from Assets.xcassets (80 x 82 px declared 3x) at CaptainSize's size.
/// No smoothing, no antialiasing. The pose changes only when an update carries a new one; the
/// system's own content transition shows the change (a plain fade).
struct CaptainIcon: View {
    let pose: MatchActivityAttributes.Pose
    let large: Bool
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        let size = CaptainSize.points(scale: displayScale, large: large)
        Image(pose.imageName)
            .resizable()
            .interpolation(.none)
            .antialiased(false)
            .frame(width: size.width, height: size.height)
            .accessibilityLabel(pose.label)
            .id(pose)
            .transition(.opacity)
    }
}

/// The captain for the compact and minimal islands: small, and in a 28-point circle
/// where the system gives the reduced-width layout.
struct CaptainBadge: View {
    let pose: MatchActivityAttributes.Pose

    var body: some View {
        if #available(iOS 27.0, *) {
            TightBadge(pose: pose)
        } else {
            CaptainIcon(pose: pose, large: false)
        }
    }
}

@available(iOS 27.0, *)
private struct TightBadge: View {
    let pose: MatchActivityAttributes.Pose
    @Environment(\.isDynamicIslandLimitedInWidth) private var limited

    var body: some View {
        if limited {
            CaptainIcon(pose: pose, large: false)
                .frame(width: 28, height: 28)
                .background(BrandColor.ink)
                .clipShape(Circle())
        } else {
            CaptainIcon(pose: pose, large: false)
        }
    }
}

/// Its content unless the island is squeezed (iOS 27's reduced-width layout): then nothing.
struct WhenRoomy<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        if #available(iOS 27.0, *) {
            RoomyContent(content: content)
        } else {
            content()
        }
    }
}

@available(iOS 27.0, *)
private struct RoomyContent<Content: View>: View {
    let content: () -> Content
    @Environment(\.isDynamicIslandLimitedInWidth) private var limited

    var body: some View {
        if !limited { content() }
    }
}

extension Color {
    /// "#rrggbb" (the clubs' colours from the game); the accent for anything else.
    init(hex: String) {
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let n = UInt32(digits, radix: 16) else {
            self = BrandColor.accent
            return
        }
        self = Color(.sRGB,
                     red: Double((n >> 16) & 0xff) / 255,
                     green: Double((n >> 8) & 0xff) / 255,
                     blue: Double(n & 0xff) / 255,
                     opacity: 1)
    }
}
