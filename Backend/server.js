const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { pool, query } = require("./db");
const http = require("http");
const { Server } = require("socket.io");
// const { Transaction } = require("mssql");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
//thông báo
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Client kết nối Socket.io:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client ngắt kết nối Socket.io:", socket.id);
  });
});
// 1. Cấu hình CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "websitetron-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 ngày
    },
  }),
);

// 4. Route kiểm tra server
app.get("/", (req, res) => {
  res.send({ message: "Server đang chạy ổn định!" });
});

app.post("/api/maphong", async (req, res) => {
  try {
    const { maPhong } = req.body;
    if (!maPhong) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập mã đặt phòng" });
    }
    const truyvan =
      "select tenphong, songuoi, loaiphong, to_char(checkin,'HH24:MI DD/MM/YYYY') as checkin, to_char(checkout,'HH24:MI DD/MM/YYYY') as checkout, trangthai from phong where maphong = $1";
    const ketqua = await query(truyvan, [maPhong]);
    if (!ketqua.rows || ketqua.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Mã đặt phòng không tồn tại , vui lòng thử lại",
      });
    }
    //lấy bản ghi đầu tiên từ sql
    const phong = ketqua.rows[0];

    if (phong.trangthai === "Đã xác nhận") {
      return res.status(400).json({
        success: false,
        message:
          "Mã đặt phòng này đã được lễ tân xác nhận, nếu bạn muốn thay đổi gì , xin vui lòng liên hệ với khách sạn",
      });
    } else if (phong.trangthai === "Đã hủy") {
      return res.status(400).json({
        success: false,
        message: "Mã đặt phòng này đã bị hủy.",
      });
    }

    const danhSachKhachCu = await query(
      `SELECT 
        tenkh AS "fullName", 
        socccd AS "idNumber", 
        TO_CHAR(ngaysinh, 'DD/MM/YYYY') AS "dateOfBirth", 
        gioitinh AS "gender", 
        quoctich AS "nationality", 
        quequan AS "hometown", 
        thuongtru AS "address" 
      FROM khachhang 
      WHERE maphong = $1`,
      [maPhong],
    );

    return res.status(200).json({
      success: true,
      data: phong,
      guests: danhSachKhachCu.rows,
    });
  } catch (error) {
    console.error("Lỗi : ", error);
    res.status(500).json({ success: false, message: "Lỗi kết nối" });
  }
});

app.post("/api/xacnhangui", async (req, res) => {
  try {
    const { bookingCode, guests } = req.body;
    if (!bookingCode || !guests) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đặt phòng , vui lòng kiểm tra lại",
      });
    }
    await query("DELETE FROM khachhang WHERE maphong = $1", [bookingCode]);
    for (let guest of guests) {
      let formattedDob = guest.dateOfBirth;
      if (formattedDob && formattedDob.includes("/")) {
        const parts = formattedDob.split("/");
        if (parts.length === 3) {
          formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      await query(
        `insert into khachhang (maphong , tenkh,socccd, ngaysinh, gioitinh, quoctich, quequan,thuongtru,ngayvagiocheckin) values ($1,$2,$3,$4,$5,$6,$7,$8,NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
        [
          bookingCode,
          guest.fullName,
          guest.idNumber,
          formattedDob || null,
          guest.gender,
          guest.nationality || "",
          guest.hometown,
          guest.address,
        ],
      );
    }
    await query(
      `update phong set trangthai = 'Chờ xác nhận' where maphong = $1`,
      [bookingCode],
    );
    const gioVN = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date());
    console.log("2. Chuẩn bị emit khach_xac_nhan_checkin");
    io.emit("khach_xac_nhan_checkin", {
      bookingCode,
      guestCount: guests.length,
      guests: guests.map((g) => ({
        fullName: g.fullName,
        idNumber: g.idNumber,
        dateOfBirth: g.dateOfBirth,
        gender: g.gender,
      })),
      checkedInAt: gioVN,
    });
    return res
      .status(200)
      .json({ success: true, message: "Lưu thông tin khách hàng thành công" });
  } catch (error) {
    console.log("lỗi : ", error);
    return res.status(500).json({
      success: false,
      message: "lỗi không thể lưu thông tin khách hàng",
    });
  }
});

app.get("/api/hienthiphong", async (req, res) => {
  try {
    const ketqua = await query(
      `select maphong, anhphong, tenphong , songuoi, loaiphong, checkin, checkout from phong order by tenphong asc`,
    );
    res.json(ketqua.rows);
  } catch (error) {
    console.log("lỗi: ", error);
    return res
      .status(500)
      .json({ success: false, message: "lỗi k thể kết nối server" });
  }
});

app.get("/api/chitietkhach", async (req, res) => {
  try {
    const { maphong } = req.query;
    const ketqua = await query(
      `select makh,tenkh,socccd,to_char(ngaysinh,'DD/MM/YYYY')as ngaysinh,gioitinh,quoctich,quequan,thuongtru,to_char(ngayvagiocheckin,'HH24:MI DD/MM/YYYY') as ngayvagiocheckin,trangthai from khachhang where maphong = $1`,
      [maphong],
    );
    res.json(ketqua.rows);
  } catch (error) {
    console.log("lỗi :", error);
    return res
      .status(500)
      .json({ success: false, message: "lỗi kết nối server" });
  }
});

app.post("/api/xacnhancheckin", async (req, res) => {
  const client = await pool.connect();
  try {
    const { maphong, makh } = req.body;
    await client.query("BEGIN");
    await client.query(
      `update khachhang set trangthai ='Đã xác nhận' where makh=$1 and maphong=$2`,
      [makh, maphong],
    );

    const kiemtrakhach = await client.query(
      `select count(*) as soluongkhachhangchuaxacnhan from khachhang where maphong=$1 and trangthai = 'Chờ xác nhận'`,
      [maphong],
    );
    const soluongkhachhangchuaxacnhan =
      kiemtrakhach.rows[0].soluongkhachhangchuaxacnhan;
    if (Number(soluongkhachhangchuaxacnhan) === 0) {
      await client.query(
        `update phong set trangthai ='Đã xác nhận' where maphong = $1`,
        [maphong],
      );
    }
    await client.query("COMMIT");
    res.json({ success: true, message: "Xác nhận khách hàng thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("Lỗi: ", error);
    return res
      .status(500)
      .json({ success: false, message: "lỗi kết nối server" });
  } finally {
    client.release();
  }
});

app.get("/api/thongbao-checkin", async (req, res) => {
  try {
    const phongRes = await query(`
      SELECT
        p.maphong AS "bookingCode",
        p.tenphong,
        p.loaiphong,
        p.trangthai AS "trangThaiPhong",
        TO_CHAR(MAX(kh.ngayvagiocheckin), 'DD/MM/YYYY HH24:MI') AS "checkedInAt",
        COUNT(kh.makh) AS "guestCount"
      FROM phong p
      LEFT JOIN khachhang kh ON p.maphong = kh.maphong
      WHERE p.trangthai = 'Chờ xác nhận'
      GROUP BY p.maphong, p.tenphong, p.loaiphong, p.trangthai
      ORDER BY MAX(kh.ngayvagiocheckin) DESC
    `);

    const khachRes = await query(`
      SELECT
        kh.makh,
        kh.maphong AS "bookingCode",
        kh.tenkh AS "fullName",
        kh.socccd AS "idNumber",
        TO_CHAR(kh.ngaysinh, 'DD/MM/YYYY') AS "dateOfBirth",
        kh.gioitinh AS "gender",
        TO_CHAR(kh.ngayvagiocheckin, 'HH24:MI DD/MM/YYYY') AS ngayvagiocheckin,
        kh.trangthai AS "trangThaiKhach"
      FROM khachhang kh
      INNER JOIN phong p ON kh.maphong = p.maphong
      WHERE p.trangthai = 'Chờ xác nhận'
      ORDER BY kh.makh ASC
    `);

    const khachTheoPhong = {};
    for (const kh of khachRes.rows) {
      if (!khachTheoPhong[kh.bookingCode]) {
        khachTheoPhong[kh.bookingCode] = [];
      }
      khachTheoPhong[kh.bookingCode].push(kh);
    }

    const danhSach = phongRes.rows.map((item) => ({
      ...item,
      guests: khachTheoPhong[item.bookingCode] || [],
    }));

    return res.status(200).json({
      success: true,
      data: danhSach,
    });
  } catch (error) {
    console.error("Lỗi GET /api/thongbao-checkin:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách thông báo check-in",
    });
  }
});
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
