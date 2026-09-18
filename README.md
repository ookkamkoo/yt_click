# Android ADB Scheduler

โปรเจกต์ Node.js สำหรับตั้งเวลาแตะและปัดหน้าจอ Android ผ่าน ADB โดยใช้ timezone `Asia/Bangkok` และไม่มี dependency ภายนอก

## เตรียมเครื่อง

1. ติดตั้ง Node.js เวอร์ชัน 18 หรือใหม่กว่า
2. ติดตั้ง [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools) และให้คำสั่ง `adb` อยู่ใน `PATH`
3. เปิด **Developer options** และ **USB debugging** บนโทรศัพท์
4. ต่อโทรศัพท์ อนุญาต RSA debugging หากระบบถาม แล้วตรวจสอบด้วย `adb devices`

## ติดตั้งและเริ่มใช้งาน

```bash
npm install
npm start
```

โปรแกรมอ่าน `config.json` ตรวจสอบความถูกต้อง/สถานะอุปกรณ์ก่อนเริ่ม แล้วตรวจสอบเวลาทุกวินาที เมื่อเวลาตรงกับ schedule จะทำงานครั้งเดียวในนาทีนั้น

```bash
node app.js tap 500 1200
node app.js size
node app.js devices
```

`Ctrl+C` จะหยุด scheduler อย่างถูกต้อง

## config.json

โทรศัพท์เพียงเครื่องเดียวให้ใช้ `"deviceId": ""` ถ้ามีหลายเครื่อง ให้ใส่ serial ที่เห็นจาก `adb devices` เช่น `"deviceId": "R58M123ABC"` โปรแกรมจะใช้ `adb -s DEVICE_ID ...` โดยอัตโนมัติ

รูปแบบแบบสั้นสำหรับ tap หนึ่งครั้ง:

```json
{ "time": "08:00", "x": 500, "y": 1200 }
```

รูปแบบ sequence รองรับ `tap`, `wait`, `swipe`, `text`, `keyevent` และ `repeat`:

```json
{
  "time": "20:00",
  "actions": [
    { "type": "tap", "x": 500, "y": 1200 },
    { "type": "wait", "ms": 1000 },
    { "type": "swipe", "x1": 500, "y1": 1700, "x2": 500, "y2": 500, "duration": 500 }
  ]
}
```

## Chrome ที่เปิดอยู่แล้ว: ค้นหาและวนลูป

ตั้งค่า action `repeat` โดย `count: 0` เพื่อวนต่อเนื่อง (กด `Ctrl+C` เพื่อหยุด) ตัวอย่างใน `config.json` ทำตามลำดับ: แตะช่องค้นหา → พิมพ์ข้อความ → Enter → แตะวิดีโอ → รอ 10 นาที → แตะปุ่ม Next → วนใหม่

แก้ `YOUR_SEARCH_QUERY` และพิกัด `x`/`y` ทุกตำแหน่งให้ตรงกับหน้าจอโทรศัพท์ของคุณ โดยใช้ `node app.js size` เพื่อดูขนาดหน้าจอ. `text` ใช้ ADB `input text`; หากคีย์บอร์ด/อุปกรณ์พิมพ์ Unicode (เช่น ไทย) ไม่ได้ ให้ใช้คำค้นหา ASCII หรือใช้แป้นพิมพ์ Android ที่รองรับ ADB input ก่อน

เวลาต้องเป็น `HH:mm` (00:00 ถึง 23:59); พิกัดและระยะเวลาต้องเป็นตัวเลข และ `wait.ms`/`swipe.duration` ห้ามติดลบ หาก config ไม่ถูกต้อง โปรแกรมจะแสดงตำแหน่งที่ผิดก่อนทำงาน

ตัวอย่าง log:

```text
[2026-09-18 08:00:00] TAP x=500 y=1200 SUCCESS
```
