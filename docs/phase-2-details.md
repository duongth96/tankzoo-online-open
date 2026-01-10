# Kế hoạch Phát triển - Phase 2 (Đề xuất & Chiến lược)

## 1. Tính năng Gameplay Mới (Feature Suggestions)

### 1.1. Hệ thống Tiến trình (Progression System)
- **Level & XP:** Người chơi nhận kinh nghiệm khi tiêu diệt địch hoặc thắng trận. Lên cấp mở khóa danh hiệu hoặc skin.
- **Tài khoản (Accounts):** Đăng nhập qua Google/Facebook/Email để lưu trữ chỉ số (K/D ratio, số trận thắng, rank).
- **Nhiệm vụ (Quests):**
  - *Daily:* "Tiêu diệt 10 địch", "Nhặt 5 vật phẩm".
  - *Achievement:* "Kẻ hủy diệt (Giết 1000 địch)", "Bất tử (Sống sót 5 phút)".

### 1.2. Chế độ chơi (Game Modes)
- **Team Deathmatch:** Chia 2 phe Xanh/Đỏ. Bên nào đạt mốc điểm trước hoặc nhiều điểm hơn khi hết giờ sẽ thắng.
- **Capture the Flag (Cướp cờ):** Mang cờ từ căn cứ địch về nhà. Yêu cầu phối hợp đồng đội cao.
- **Battle Royale Mini:** Vòng bo thu hẹp dần, người sống sót cuối cùng chiến thắng.

### 1.3. Nâng cấp & Tùy biến (Customization)
- **Hệ thống Tank Class:**
  - *Heavy:* Máu trâu, đi chậm, đạn to.
  - *Scout:* Máu giấy, chạy nhanh, tầm nhìn rộng.
  - *Sniper:* Tầm bắn xa, nạp đạn lâu.
- **Skins:** Thay đổi màu sắc xe, hình dáng nòng súng, hiệu ứng đạn (tracers), hiệu ứng nổ.

### 1.4. Tính năng Xã hội (Social)
- **Chat:** Kênh chat thế giới (Global) và chat đội (Team).
- **Friends & Party:** Kết bạn, mời bạn bè vào cùng phòng chơi.
- **Leaderboard:** Bảng xếp hạng theo ngày/tuần/tháng.

### 1.5. Mobile & Cross-platform
- Hoàn thiện tích hợp Capacitor.
- Thêm Joystick ảo (Virtual Joystick) cho di chuyển và nút bắn cảm ứng.
- Tối ưu hiệu năng cho thiết bị di động cấu hình thấp.

## 2. Cải thiện Kỹ thuật (Technical Improvements)

- **Lag Compensation:** Cải thiện thuật toán dự đoán chuyển động (Client-side Prediction & Server Reconciliation) để game mượt hơn khi mạng lag.
- **Security:** Chống hack (speed hack, aimbot) bằng cách xác thực chặt chẽ hơn trên server.
- **Scalability:** Sử dụng Redis Adapter cho Socket.io để chạy nhiều instance server (Horizontal Scaling) nếu lượng người chơi tăng đột biến.

## 3. Chiến lược Thu hút Người chơi (Market Strategy)

### 3.1. Định vị (Positioning)
- **Target Audience:** Game thủ yêu thích thể loại IO nhanh gọn, nhân viên văn phòng giải trí giờ nghỉ, học sinh sinh viên.
- **USP (Unique Selling Point):** "Vào chơi ngay không cần cài đặt", "Chiến thuật cao với hệ thống vật phẩm đa dạng".

### 3.2. Viral & Community
- **Mời bạn bè:** Link mời trực tiếp vào phòng chơi (Deep linking).
- **Chia sẻ khoảnh khắc:** Tự động tạo ảnh GIF/Video highlight khi đạt Multi-kill để người chơi chia sẻ lên Facebook/TikTok.
- **Discord Server:** Tạo cộng đồng để người chơi báo lỗi, tìm đồng đội, và nhận thông báo cập nhật.

### 3.3. Monetization (Kiếm tiền - Optional)
- **Nguyên tắc:** "Không Pay-to-Win". Chỉ bán vật phẩm trang trí (Cosmetics).
- **Ads:** Xem quảng cáo để hồi sinh nhanh hơn hoặc nhận gấp đôi XP trận đó.
- **Battle Pass:** Vé mùa giải với các phần thưởng độc quyền.
