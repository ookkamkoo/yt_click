# Raspberry Pi Chromium Launcher

โปรเจกต์ Node.js สำหรับเปิด Chromium บน Raspberry Pi แล้วส่งคีย์ลัดจัดหน้าต่างไปทางซ้ายของหน้าจอ โดยไม่ใช้ ADB และไม่ใช้ Playwright

## ติดตั้งบน Raspberry Pi

```bash
sudo apt update
sudo apt install chromium wtype
npm install
```

`wtype` เป็นตัวส่งคีย์บอร์ดเสมือนไปยัง Wayland desktop session เพื่อให้โปรแกรมส่ง `Super + Left Arrow` ได้.

ติดตั้ง `ydotool` จาก `trixie-backports` เพื่อให้โปรแกรมคลิกพิกัดเมาส์:

```bash
sudo apt -t trixie-backports install ydotool
```

## ตั้งค่า

แก้ `config.json`:

```json
{
  "browser": {
    "url": "https://youtube.com",
    "waitMs": 12000,
    "focus": {
      "x": 400,
      "y": 30
    },
    "focusWaitMs": 3000,
    "firstVideo": {
      "x": 350,
      "y": 250,
      "pageLoadMs": 20000
    }
  }
}
```

`waitMs` คือเวลารอ Chromium เปิดและรับ focus ก่อนส่งคีย์ลัด; ค่าเริ่มต้น `12000` คือ 12 วินาที. `focus` คือพิกัดบนแถบหัว/แท็บของ Chromium เพื่อบังคับให้ Chromium เป็นหน้าต่างที่รับคีย์บอร์ด. `focusWaitMs` คือเวลารอหลังคลิก focus (ค่าเริ่มต้น 3 วินาที). `pageLoadMs` คือเวลารอให้หน้า YouTube โหลดก่อนคลิกวิดีโอแรก; ค่าเริ่มต้น `20000` คือ 20 วินาที. พิกัด `x`/`y` ต้องแก้ให้ตรงกับหน้าจอ Pi ของคุณ

## เริ่มโปรแกรม

เปิด Terminal จากหน้าจอ desktop ของ Raspberry Pi แล้วรัน:

```bash
npm start
```

เมื่อ Chromium เปิดขึ้น โปรแกรมจะส่ง `Super + Left Arrow` เพื่อให้ window manager จัดหน้าต่างไปทางซ้าย จากนั้นตรวจ `browser.url` ที่โปรแกรมกำลังสั่งเปิด; หากเป็นหน้า YouTube Home จะรอหน้าโหลดแล้วคลิกพิกัดวิดีโอแรก

> หากสั่งผ่าน SSH ต้องใช้ user เดียวกับที่ login desktop อยู่ และ desktop session ต้องกำลังทำงาน มิฉะนั้น Chromium จะไม่มีหน้าจอสำหรับเปิด
