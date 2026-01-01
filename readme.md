# Cấu hình htaccess Vietnix

## cấu hình 1
```
# 1. BẮT BUỘC: Giữ nguyên khối cấu hình của CloudLinux/Vietnix
# (Phần này do hệ thống tự sinh ra khi bạn nhấn "Setup Node.js App")
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/tankzooi/public_html/tank-dien"
PassengerBaseURI "/"
PassengerAppLogFile "/home/tankzooi/logs/nodejs.log"
PassengerNodejs "/home/tankzooi/nodevenv/public_html/tank-dien/22/bin/node"
PassengerAppType node
PassengerStartupFile "index.js"
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

# 2. Cấu hình cho Socket.io và HTTPS
RewriteEngine On

# Ép sử dụng HTTPS (Socket.io chạy ổn định nhất trên wss://)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cấu hình đặc biệt cho WebSocket handshake
# Điều này giúp Passenger biết để không can thiệp vào tiến trình websocket
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule .* - [E=HTTP_UPGRADE:%{HTTP:Upgrade},L]
```

## cấu hình 2
```
RewriteEngine On

# 1. Ưu tiên xử lý WebSocket Handshake trước
RewriteCond %{QUERY_STRING} transport=websocket [NC]
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteRule ^(.*)$ ws://127.0.0.1:3000/$1 [P,L]

# 2. Xử lý các request HTTP bình thường
# Nếu dùng cPanel Nodejs App, đôi khi bạn không cần rule này 
# vì Passenger tự handle. Nếu app không chạy, hãy thử comment dòng dưới.
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```