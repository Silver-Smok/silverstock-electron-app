require("dotenv").config();

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "icons/logo",
    osxSign: {
      identity: process.env.APPLE_IDENTITY,
      continueOnError: false,
    },
    osxNotarize: {
      tool: "notarytool",
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
    appBundleId: "com.silver-stock",
    name: "SilverStock",
    appCategoryType: "public.app-category.business",
    arch: [
      "x64", 
      "arm64"
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "icons/logo.icns",
        name: "SilverStock",
      },
    },
    {
      name: "@electron-forge/maker-zip",
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "Silver-Smok",
          name: "silverstock-electron-app",
        },
        prerelease: false,
        draft: false,
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
};
