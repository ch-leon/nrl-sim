# scripts/ios/add-widget-target.rb — adds the widget extension (BigCoachWidgets) to the
# iPhone project, ios/App/App.xcodeproj, without the Xcode GUI (docs/specs/ios.md §4,
# Phase 3). Run once; running it again changes nothing. The result is committed, so
# nobody needs to run it unless the project is ever rebuilt from Capacitor's template.
#
#   /opt/homebrew/bin/xcodeproj --version   # the CocoaPods xcodeproj gem, 1.27 or newer
#   GEM_HOME=/opt/homebrew/Cellar/cocoapods/<version>/libexec \
#     /opt/homebrew/opt/ruby/bin/ruby scripts/ios/add-widget-target.rb
#
# What it sets up:
# - BigCoachWidgets: an app extension (WidgetKit), au.com.supercooked.bigrugbycoach.dev.widgets,
#   iOS 16.2, iPhone only, signing team unset, embedded in App.app/PlugIns.
# - Folders Xcode keeps in step with the disk (file-system-synchronised groups, Xcode 16+),
#   so a later phase adds a Swift file or an asset catalogue by dropping it in the folder,
#   with no project.pbxproj edit:
#     ios/App/BigCoachWidgets/   the extension (its Info.plist and entitlements excepted)
#     ios/App/Shared/            compiled into both App and the extension (MatchActivityAttributes)
#     ios/App/App/LiveActivity/  the App target's native code for it (LiveMatchPlugin)
# - The App Group group.au.com.supercooked.bigrugbycoach.dev on both targets, through
#   entitlements files (App Groups work on a free Apple ID). No paid-only capability.
require 'xcodeproj'

ROOT = File.expand_path('../../ios/App', __dir__)
PROJECT = File.join(ROOT, 'App.xcodeproj')
NAME = 'BigCoachWidgets'
BUNDLE_ID = 'au.com.supercooked.bigrugbycoach.dev.widgets'
DEPLOYMENT = '16.2'

project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' } or abort('no App target')
if project.targets.any? { |t| t.name == NAME }
  puts "#{NAME} is already in #{PROJECT}; nothing to do."
  exit 0
end

# File-system-synchronised groups need the Xcode 16 project format.
project.instance_variable_set(:@object_version, '77')
project.root_object.compatibility_version = 'Xcode 16.0'

def synced_group(project, parent, path)
  group = project.new(Xcodeproj::Project::Object::PBXFileSystemSynchronizedRootGroup)
  group.path = path
  group.source_tree = '<group>'
  parent.children << group
  group
end

# --- The extension target -------------------------------------------------------------
ext = project.new_target(:app_extension, NAME, :ios, DEPLOYMENT, nil, :swift)
ext.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = BUNDLE_ID
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['SWIFT_VERSION'] = '5.0'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['CODE_SIGN_ENTITLEMENTS'] = "#{NAME}/#{NAME}.entitlements"
  s['GENERATE_INFOPLIST_FILE'] = 'YES'
  s['INFOPLIST_FILE'] = "#{NAME}/Info.plist"
  s['INFOPLIST_KEY_CFBundleDisplayName'] = 'Big Coach'
  s['MARKETING_VERSION'] = '1.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  s['SKIP_INSTALL'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['SWIFT_EMIT_LOC_STRINGS'] = 'YES'
  s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = ''
  s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = ''
  s.delete('DEVELOPMENT_TEAM')
end
# The new-target helper links Foundation by hand, from a pinned SDK path; Swift links
# what it imports, so drop it and the Frameworks group it made.
ext.frameworks_build_phase.files.to_a.each do |build_file|
  ref = build_file.file_ref
  build_file.remove_from_project
  ref&.remove_from_project
end
frameworks = project.main_group.children.find { |c| c.display_name == 'Frameworks' && c.isa == 'PBXGroup' }
if frameworks
  frameworks.children.to_a.each { |g| g.remove_from_project if g.isa == 'PBXGroup' && g.children.empty? }
  frameworks.remove_from_project if frameworks.children.empty?
end

main = project.main_group
widgets = synced_group(project, main, NAME)
shared = synced_group(project, main, 'Shared')
app_group = main.children.find { |c| c.respond_to?(:path) && c.path == 'App' } or abort('no App group')
live_activity = synced_group(project, app_group, 'LiveActivity')

# Info.plist and the entitlements are build settings, not resources to copy.
exceptions = project.new(Xcodeproj::Project::Object::PBXFileSystemSynchronizedBuildFileExceptionSet)
exceptions.target = ext
exceptions.membership_exceptions = ['Info.plist', "#{NAME}.entitlements"]
widgets.exceptions << exceptions

ext.file_system_synchronized_groups << widgets
ext.file_system_synchronized_groups << shared
app.file_system_synchronized_groups << shared
app.file_system_synchronized_groups << live_activity

# --- The app: embeds the extension, Live Activities on, the App Group -----------------
app.add_dependency(ext)
embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(ext.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

app_entitlements = app_group.new_reference('App.entitlements')
app_entitlements.last_known_file_type = 'text.plist.entitlements'
app.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end

attributes = project.root_object.attributes
attributes['TargetAttributes'] ||= {}
attributes['TargetAttributes'][ext.uuid] = { 'CreatedOnToolsVersion' => '27.2' }

project.save
puts "Added #{NAME} to #{PROJECT}."
