#!/bin/bash

rm -rf dist/*
mkdir dist/out;
# npm run distlinux;
# zip -r dist/out/SilverStock-linux.zip dist/linux-unpacked;
# osascript -e 'display notification "Belle performance !" with title "Build compilé pour linux"';
npm run distmac;
mv dist/SilverStock*.dmg dist/out/SilverStock.dmg
osascript -e 'display notification "Bravo !" with title "Build compilé pour mac"';
npm run dist64;
mv dist/SilverStock*.exe dist/out/SilverStock-win-64.exe;
osascript -e 'display notification "Incroyable !" with title "Build compilé pour Win64"';
npm run dist32;
mv dist/SilverStock*.exe dist/out/SilverStock-win-32.exe;
osascript -e 'display notification "On applaudit le compilateur !" with title "Build compilé pour Win32"';



