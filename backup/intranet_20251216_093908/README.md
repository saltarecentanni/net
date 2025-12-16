# TIESSE Intranet Web App

Minimal intranet-deployable project for the TIESSE Network Manager.

How to run (on your PC/server):

1. Install dependencies:

```bash
cd intranet
npm install
```

2. Start the server:

```bash
npm start
```

3. Open in your intranet browser: `http://<server-ip>:3000/`

Notes:
- The app serves the UI and provides `/data` endpoints to persist the exported data to `network_manager.json` in the same folder as the server.
- The client will try to load/save from the server and fallback to `localStorage` if the server is unreachable.

Portability:
- To move the app to another PC, copy the entire `intranet/` folder (including `network_manager.json` if you want to keep data), then either run the Node server (`npm install && npm start`) or use PHP/your existing webserver as described below.

Deploy to an existing web server (no Node required)
- Copy the contents of `intranet/` (all files) to your webserver document root (e.g., Apache `www` folder). Ensure `index.html` and `data.php` are in the same folder.
- If your server supports PHP, the client will call `/data` and `data.php` will read/write `network_manager.json` in the same folder. No other software required.
- Access the app from the network via e.g.:
	- http://10.121.10.101:8080/
	- http://127.0.0.1:8080/
	- http://172.17.48.1:8080/

Notes:
- If your server is static-only (no PHP), use the Node server (`npm start`) or the PowerShell `serve.ps1` method described in README to provide the `/data` endpoint.
- `network_manager.json` will be created/updated by `data.php` and should be writable by the webserver user.
