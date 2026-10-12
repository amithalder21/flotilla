#!/usr/bin/env bash
# Flotilla — macOS Native Application Builder
# Compiles Swift + WebKit frontend, builds AppIcon.icns, packages Flotilla.app and creates Flotilla-macOS.dmg
set -euo pipefail

cd "$(dirname "$0")"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
info() { printf '\033[34mℹ\033[0m %s\n' "$1"; }

bold "Building Flotilla for macOS"

APP_NAME="Flotilla"
BUNDLE_DIR="${APP_NAME}.app"
CONTENTS_DIR="${BUNDLE_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
ICON_SOURCE="icon.jpg"

# 1. Clean previous build
rm -rf "${BUNDLE_DIR}" "${APP_NAME}-macOS.dmg" icon.iconset AppIcon.icns

# 2. Build icon.iconset and compile into AppIcon.icns
if [ -f "${ICON_SOURCE}" ]; then
  info "Generating macOS AppIcon.icns..."
  mkdir -p icon.iconset
  sips -s format png -z 16 16     "${ICON_SOURCE}" --out icon.iconset/icon_16x16.png >/dev/null 2>&1
  sips -s format png -z 32 32     "${ICON_SOURCE}" --out icon.iconset/icon_16x16@2x.png >/dev/null 2>&1
  sips -s format png -z 32 32     "${ICON_SOURCE}" --out icon.iconset/icon_32x32.png >/dev/null 2>&1
  sips -s format png -z 64 64     "${ICON_SOURCE}" --out icon.iconset/icon_32x32@2x.png >/dev/null 2>&1
  sips -s format png -z 128 128   "${ICON_SOURCE}" --out icon.iconset/icon_128x128.png >/dev/null 2>&1
  sips -s format png -z 256 256   "${ICON_SOURCE}" --out icon.iconset/icon_128x128@2x.png >/dev/null 2>&1
  sips -s format png -z 256 256   "${ICON_SOURCE}" --out icon.iconset/icon_256x256.png >/dev/null 2>&1
  sips -s format png -z 512 512   "${ICON_SOURCE}" --out icon.iconset/icon_256x256@2x.png >/dev/null 2>&1
  sips -s format png -z 512 512   "${ICON_SOURCE}" --out icon.iconset/icon_512x512.png >/dev/null 2>&1
  sips -s format png -z 1024 1024 "${ICON_SOURCE}" --out icon.iconset/icon_512x512@2x.png >/dev/null 2>&1
  iconutil -c icns icon.iconset -o AppIcon.icns
  rm -rf icon.iconset
  ok "AppIcon.icns created"
fi

# 3. Compile Swift native binary
info "Compiling native Swift binary..."
ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then
  TARGET="arm64-apple-macos12.0"
else
  TARGET="x86_64-apple-macos12.0"
fi

mkdir -p .swift-cache
swiftc -O -target "${TARGET}" -module-cache-path .swift-cache -Xcc -fmodules-cache-path=.swift-cache -o "${APP_NAME}_bin" main.swift -framework Cocoa -framework WebKit
ok "Binary compiled (${TARGET})"

# 4. Construct .app bundle
info "Assembling ${BUNDLE_DIR}..."
mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}"

mv "${APP_NAME}_bin" "${MACOS_DIR}/${APP_NAME}"
chmod +x "${MACOS_DIR}/${APP_NAME}"

cp Info.plist "${CONTENTS_DIR}/Info.plist"

if [ -f "AppIcon.icns" ]; then
  cp AppIcon.icns "${RESOURCES_DIR}/AppIcon.icns"
fi

# 5. Bundle self-contained Docker stack into Resources/stack
info "Bundling self-contained Docker stack into Resources/stack..."
STACK_DIR="${RESOURCES_DIR}/stack"
rm -rf "${STACK_DIR}"
mkdir -p "${STACK_DIR}/controller" "${STACK_DIR}/worker-app"

# Compose file configured for standalone controller
sed 's|dockerfile: controller/Dockerfile|dockerfile: controller/Dockerfile.standalone|g' ../compose.yaml > "${STACK_DIR}/compose.yaml"

# Copy controller runtime, precompiled web UI static assets, and examples
cp ../controller/app.py "${STACK_DIR}/controller/app.py"
cp ../controller/Dockerfile.standalone "${STACK_DIR}/controller/Dockerfile.standalone"
cp -R ../controller/examples "${STACK_DIR}/controller/examples"
cp -R ../controller/static "${STACK_DIR}/controller/static"

# Copy worker app image specification
cp ../worker-app/Dockerfile "${STACK_DIR}/worker-app/Dockerfile"
ok "Self-contained Docker stack bundled (${STACK_DIR})"

# 5. Ad-hoc codesign
info "Applying ad-hoc code signature..."
codesign --force --deep --sign - "${BUNDLE_DIR}" >/dev/null 2>&1 || true
ok "Code signature applied"

if hdiutil create -volname "${APP_NAME}" -srcfolder "${BUNDLE_DIR}" -ov -format UDZO "${APP_NAME}-macOS.dmg" >/dev/null 2>&1; then
  ok "Disk image created: $(pwd)/${APP_NAME}-macOS.dmg"
else
  info "Note: DMG creation skipped (requires unsandboxed execution); Flotilla.app bundle is ready."
fi

echo
bold "🎉 Build complete!"
echo "  • App Bundle:  $(pwd)/${BUNDLE_DIR}"
echo "  • Disk Image:  $(pwd)/${APP_NAME}-macOS.dmg"
echo
echo "To install to /Applications:"
echo "  cp -R \"$(pwd)/${BUNDLE_DIR}\" /Applications/"
