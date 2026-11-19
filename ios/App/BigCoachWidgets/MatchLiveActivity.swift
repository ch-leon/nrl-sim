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
                    TeamTag(code: a.homeCode, colour: Color(hex: a.homeColor), mine: a.mine == .home)
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
                // Phase 4 replaces the ball with the captain in s.pose.
                BallGlyph()
            } compactTrailing: {
                ScoreText(home: s.homeScore, away: s.awayScore, size: 14)
            } minimal: {
                BallGlyph()
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
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
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

/// The compact island's leading glyph until Phase 4's captain poses.
struct BallGlyph: View {
    var body: some View {
        Image(systemName: "football.fill")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(BrandColor.accent)
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
