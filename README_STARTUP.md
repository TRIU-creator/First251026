# AWCMS Startup Guide

## Quick Start (Windows)

### First Time Setup
1. **Install Dependencies**: Double-click `install_dependencies.bat`
   - This will check for Node.js/npm, create `.env` if missing, and install all required packages
   - Takes 3-10 minutes depending on internet speed

2. **Configure Environment**: Edit `.env` file with your credentials (already configured with defaults)

3. **Start Server**: Double-click `start_wms.bat`
   - Server will start on http://localhost:3000
   - Press Ctrl+C to stop

### Regular Use
Just double-click `start_wms.bat` to start the application.

## Manual Setup (Command Line)

If batch scripts don't work, you can run commands manually:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
# or
node node_modules/tsx/dist/cli.mjs server.ts
```

## Default Login Credentials

From `.env`:
- **Admin**: hire.vinayyadav@gmail.com / Vinay@123
- **Warehouse Manager**: vinaykumar21@amityonline.com / Vinay@123
- **Technical Inspector**: hashsalted@gmail.com / Vinay@123
- **Viewer**: vinay_227051@saitm.org / Vinay@123

## Troubleshooting

### Node.js not found
Download and install Node.js LTS from [nodejs.org](https://nodejs.org/)

### Port 3000 already in use
Kill the process using port 3000:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Dependencies fail to install
Try:
```bash
npm install --legacy-peer-deps --force
```

### Server won't start
Check logs in `server.out.log` and `server.err.log` if running in background

## System Requirements
- Windows 10/11
- Node.js 18+ (tested with v22.20.0)
- 2GB RAM minimum, 4GB recommended
- 500MB disk space
