# Raspberry Pi Chromium Launcher

โปรเจกต์ Node.js สำหรับเปิด Chromium บน Raspberry Pi แล้วส่งคีย์ลัดจัดหน้าต่างไปทางซ้ายของหน้าจอ โดยไม่ใช้ ADB และไม่ใช้ Playwright

## ติดตั้งบน Raspberry Pi

```bash
sudo apt update
sudo apt install chromium wtype
npm install
```

`wtype` เป็นตัวส่งคีย์บอร์ดเสมือนไปยัง Wayland desktop session เพื่อให้โปรแกรมส่ง `Super + Left Arrow` ได้

## ตั้งค่า

แก้ `config.json`:

```json
{
  "browser": {
    "url": "https://youtube.com",
    "waitMs": 2000
  }
}
```

`waitMs` คือเวลารอ Chromium เปิดก่อนส่งคีย์ลัด; เพิ่มเป็น `4000` หาก Pi เปิดเบราว์เซอร์ช้า

## เริ่มโปรแกรม

เปิด Terminal จากหน้าจอ desktop ของ Raspberry Pi แล้วรัน:

```bash
npm start
```

เมื่อ Chromium เปิดขึ้น โปรแกรมจะส่ง `Super + Left Arrow` เพื่อให้ window manager จัดหน้าต่างไปทางซ้าย

> หากสั่งผ่าน SSH ต้องใช้ user เดียวกับที่ login desktop อยู่ และ desktop session ต้องกำลังทำงาน มิฉะนั้น Chromium จะไม่มีหน้าจอสำหรับเปิด
