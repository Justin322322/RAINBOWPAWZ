@echo off
echo Creating production package...

set PROD_DIR=rainbow_paws_prod

rem Remove existing directory if it exists
if exist %PROD_DIR% (
  echo Removing existing %PROD_DIR% directory...
  rmdir /S /Q %PROD_DIR%
)

rem Create production directory
echo Creating %PROD_DIR% directory...
mkdir %PROD_DIR%

rem Copy essential files and directories
echo Copying essential files...
xcopy .next %PROD_DIR%\.next /E /I /H
xcopy public %PROD_DIR%\public /E /I /H
copy server.js %PROD_DIR%\
copy start-custom.js %PROD_DIR%\
copy package.json %PROD_DIR%\
copy .env.local %PROD_DIR%\

rem Create a README file
echo Creating README.md...
echo # Rainbow Paws Production Build > %PROD_DIR%\README.md
echo. >> %PROD_DIR%\README.md
echo ## How to run >> %PROD_DIR%\README.md
echo 1. Install dependencies: npm install --production >> %PROD_DIR%\README.md
echo 2. Start the server: npm run start:custom >> %PROD_DIR%\README.md
echo 3. Access at http://localhost:3001 >> %PROD_DIR%\README.md
echo. >> %PROD_DIR%\README.md
echo Created: %date% >> %PROD_DIR%\README.md

echo Production package created in: %PROD_DIR%
echo Done!
