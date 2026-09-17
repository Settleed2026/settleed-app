# Settleed App Icon Resources

This folder stores the master icon assets used by Capacitor and @capacitor/assets
to generate all required platform-specific icon sizes.

## Required Files (place here manually)

| File | Size | Source |
|---|---|---|
| `icon.png` | 1024×1024px | From Settleed_App_Icon_Package.zip |
| `splash.png` | 2732×2732px | Create separately (navy #1B3A6B background + centered logo) |

## How to populate this folder

1. Extract `Settleed_App_Icon_Package.zip`
2. Copy the 1024×1024 master icon → `resources/icon.png`
3. Also copy to `public/icon-192.png` and `public/icon-512.png` the
   appropriately sized versions from the zip

## How @capacitor/assets uses this

Once you have a Mac with Xcode installed:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#1B3A6B' --iconBackgroundColorDark '#1B3A6B' --splashBackgroundColor '#1B3A6B' --splashBackgroundColorDark '#1B3A6B'
```

This auto-generates all Xcode icon sizes (20px to 1024px) and launch
screen assets from `resources/icon.png`.

## Apple App Store Icon Requirements

- 1024×1024px PNG (no transparency, no rounded corners — Apple adds rounding)
- No text required in the icon at the 1024px resolution
- The Settleed icon provided meets these requirements
