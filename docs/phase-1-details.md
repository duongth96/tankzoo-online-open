# Tài liệu Kỹ thuật & Gameplay - Phase 1 (Hiện tại)

## 1. Tổng quan
Tank Điện là một trò chơi bắn tăng trực tuyến nhiều người chơi (IO style) thời gian thực. Người chơi điều khiển xe tăng, di chuyển trên bản đồ rộng lớn, thu thập vật phẩm và tiêu diệt đối thủ để ghi điểm.

## 2. Gameplay

### 2.1. Bản đồ & Môi trường
- **Kích thước:** 4000x4000 pixels.
- **Cấu trúc:**
  - **Procedural Generation:** Bản đồ được tạo ngẫu nhiên dựa trên `mapSeed` từ server, đảm bảo tất cả người chơi nhìn thấy cùng một cấu trúc địa hình.
  - **Chướng ngại vật (Obstacles):**
    - **Hard Obstacles:** Không thể phá hủy, chặn đạn và di chuyển (tường đá, kim loại).
    - **Soft Obstacles:** Có thể phá hủy bằng đạn (thùng gỗ, bụi cây), có thể rớt vật phẩm.

### 2.2. Cơ chế Chiến đấu
- **Máu (Health):** Mặc định 100 HP.
- **Vũ khí cơ bản:**
  - **Sát thương:** 20 (cơ bản) / 40 (khi có buff Damage).
  - **Tầm xa:** Giới hạn 200px. Đạn tự hủy khi bay quá khoảng cách này.
  - **Tốc độ bắn:** Có thời gian hồi chiêu (Cooldown).
- **Hồi sinh:** Tự động hồi sinh sau 3 giây tại vị trí ngẫu nhiên an toàn.

### 2.3. Hệ thống Vật phẩm (Power-ups & Inventory)
Người chơi có thể nhặt các vật phẩm xuất hiện ngẫu nhiên trên bản đồ hoặc rớt ra từ chướng ngại vật.

#### Power-ups (Tác dụng tức thời trong thời gian ngắn):
1.  **Speed (Tốc độ):**
    -   **Hiệu ứng:** Tăng tốc độ di chuyển của xe tăng.
    -   **Visual:** Xe tăng chuyển màu xanh dương (Blue tint).
2.  **Damage (Sát thương):**
    -   **Hiệu ứng:** Tăng đôi sát thương đạn bắn ra.
    -   **Visual:** Xe tăng chuyển màu đỏ (Red tint).
3.  **Invisible (Tàng hình):**
    -   **Hiệu ứng:** Giảm độ hiển thị của xe tăng đối với người chơi khác.
    -   **Visual:**
        -   Bản thân (Local): Bán trong suốt (Alpha 0.5) để người chơi nhận biết trạng thái.
        -   Đối thủ (Enemy): Hoàn toàn hoặc gần như không nhìn thấy.

#### Special Items (Lưu trữ trong túi đồ - Inventory):
1.  **Missile (Tên lửa):**
    -   **Kích hoạt:** Phím `1`.
    -   **Đặc điểm:** Sát thương cực lớn (1000), tốc độ bay nhanh, hình ảnh tên lửa riêng biệt.
2.  **Bomb (Bom hẹn giờ):**
    -   **Kích hoạt:** Phím `2`.
    -   **Đặc điểm:** Đặt bom tại vị trí đứng. Nổ sau 2 giây (Fuse time).
    -   **Sát thương diện rộng:** Bán kính nổ 250px, gây 80 sát thương cho tất cả kẻ địch trong vùng ảnh hưởng.

### 2.4. Điều khiển (Controls)
- **Di chuyển:** `W, A, S, D` hoặc các phím mũi tên.
- **Nhắm bắn:** Chuột (Mouse) điều khiển hướng nòng súng (Turret).
- **Bắn thường:** Chuột trái (Left Click) hoặc phím `Space`.
- **Sử dụng vật phẩm:**
  -   Phím `1`: Bắn Tên lửa.
  -   Phím `2`: Đặt Bom.

## 3. Kiến trúc Kỹ thuật

### 3.1. Client (Game)
- **Framework:** Phaser 3.
- **Ngôn ngữ:** JavaScript (ES6+).
- **Build Tool:** Vite.
- **Mobile Support:** Capacitor (đang tích hợp).
- **Cấu trúc:**
  - `scenes/MainScene.js`: Xử lý logic chính, vòng lặp game, input.
  - `managers/`: Quản lý các thực thể riêng biệt (Player, Obstacle, PowerUp, Map) để code gọn gàng, dễ bảo trì.
  - `utils/socket.js`: Wrapper cho Socket.io client.

### 3.2. Server
- **Platform:** Node.js.
- **Thư viện:** Socket.io, Express.
- **Kiến trúc:** Authoritative Server (Server quyết định logic quan trọng).
- **Xử lý:**
  - Quản lý kết nối/ngắt kết nối.
  - Đồng bộ vị trí (Movement synchronization).
  - Quản lý trạng thái game (Máu, Vật phẩm, Map Seed).
  - Phát hiện va chạm (Collision Detection) cơ bản.

### 3.3. Giao thức Mạng
- **Real-time:** Sử dụng WebSockets qua Socket.io.
- **Events:**
  - `PLAYER_INPUT`, `PLAYER_MOVED`: Đồng bộ di chuyển.
  - `PLAYER_SHOOT`, `BULLET_FIRED`: Đồng bộ bắn đạn.
  - `POWERUP_COLLECTED`: Nhặt vật phẩm.
  - `USE_MISSILE`, `USE_BOMB`: Sử dụng kỹ năng đặc biệt.
  - `PLAYER_HIT`, `PLAYER_DEAD`, `PLAYER_RESPAWN`: Trạng thái chiến đấu.
