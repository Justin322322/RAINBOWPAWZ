#!/bin/bash

echo "==================================================="
echo "Rainbow Paws Production Deployment"
echo "==================================================="
echo

echo "This script will build and start the application in production mode."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

# Check for MySQL (simplified check)
echo "Checking for MySQL..."
if ! command -v mysql &> /dev/null && ! pgrep -x "mysqld" > /dev/null; then
    echo "WARNING: MySQL might not be running. Make sure your database is running."
    echo "The application requires a running MySQL database."
    echo
    read -p "Do you want to continue anyway? (y/n): " continue
    if [[ ! "$continue" =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

echo
echo "Step 1: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies."
    echo "Please check your internet connection and try again."
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "Step 2: Building the application for production..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed."
    echo "Please check the error messages above and fix any issues."
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "Step 3: Starting the production server..."
echo
echo "The application is now running in production mode!"
echo "Press Ctrl+C to stop the server."
echo
echo "Access the application at:"
echo "http://localhost:3001 (or your configured port)"
echo

npm start

# This part will only execute if the server is stopped
echo
echo "Server stopped. Thank you for using Rainbow Paws!"
echo
read -p "Press Enter to exit..."
