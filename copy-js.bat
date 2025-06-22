@echo off
echo Copying JavaScript files to dist...
xcopy "src\js" "dist\src\js" /E /I /Y
echo JavaScript files copied successfully!