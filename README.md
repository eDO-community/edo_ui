# [e.DO](http://edo.comau.com) UI for Android and Windows 10

## Requirements

### For all development platform

- Git
- NodeJs 6 lts *[Download](https://nodejs.org)*
- Android SDK
- Ionic 
```
npm install -g ionic cordova
```

### Additional requirements to build on Windows

Visual studio 2015 with: *[Download](https://www.visualstudio.com/vs/older-downloads/)*
- Universal windows app development tools
- Window phone sdk *(needed to compile some cordova plugins)*

## Compile & run

In the project folder install all required dependency with:
```
npm install
```

To test the app in the browser:

```
ionic serve
```

To run it on an android device:

```
ionic cordova run android
```

## Relase Build

### Android
```
ionic cordova build --release --prod android
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore edo-ui-release-key.keystore platforms/android/build/outputs/apk/android-release-unsigned.apk edo-ui
zipalign -v 4 platforms/android/build/outputs/apk/android-release-unsigned.apk platforms/android/build/outputs/apk/edo-ui-signed.apk
```

### Browser
```
ionic cordova build --release --prod browser
```

### Windows 10 universal app
```
ionic cordova build --release --prod windows -- --arch=x64 --appx=uap
```

*Note: if you have issue building SQLite3.UWP make sure you select in SQLite3.UWP's VS project the Platform Toolset v140*
