@echo off
echo ========================================
echo  BankSphere GitHub Update Script
echo ========================================
echo.
echo This will push your files to:
echo https://github.com/karthiivan/BankSphere_DBMS
echo.
echo WARNING: This will replace all files on GitHub!
echo.
pause

echo.
echo Step 1: Initializing Git...
git init

echo.
echo Step 2: Removing old remote (if exists)...
git remote remove origin 2>nul

echo.
echo Step 3: Adding your GitHub repository...
git remote add origin https://github.com/karthiivan/BankSphere_DBMS.git

echo.
echo Step 4: Adding all files...
git add .

echo.
echo Step 5: Committing files...
git commit -m "Complete BankSphere system with deployment guides"

echo.
echo Step 6: Renaming branch to main...
git branch -M main

echo.
echo Step 7: Pushing to GitHub (this will replace old files)...
git push -f origin main

echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo Your files have been pushed to GitHub!
echo.
echo Next steps:
echo 1. Go to: https://github.com/karthiivan/BankSphere_DBMS
echo 2. Refresh the page to see your files
echo 3. Open START_HERE.md to begin deployment
echo.
pause
