@echo off
echo Creating tests directory structure...

mkdir tests 2>nul
echo. > tests\__init__.py

echo Tests directory created successfully!
echo.
echo Now run the following commands:
echo 1. pip install -r requirements.txt
echo 2. pip install -r requirements-dev.txt
echo 3. pytest
echo.
pause
