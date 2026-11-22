const hienThi1 = document.getElementById("hienthi");

let tatcacacphong = [];

async function loadroom() {
  try {
    const chuyendi = await fetch("http://localhost:3000/api/hienthiphong");
    if (!chuyendi.ok) {
      throw new Error("không thể lấy danh sách phòng");
    }
    const room = await chuyendi.json();
    tatcacacphong = room;
    hienthiphong(tatcacacphong);
  } catch (error) {
    console.log("lỗi tải phòng: ", error);
    hienThi1.innerHTML = `<p>không tải được phòng</p>`;
  }
}
function dinhDangNgayGio(giaTri) {
  if (!giaTri) return "chưa có";

  if (typeof giaTri === "string") {
    const str = giaTri.trim();
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(str)) {
      return str.slice(0, 16);
    }
    const matchLocal = str.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/,
    );
    if (matchLocal) {
      const [, nam, thang, ngay, gio, phut] = matchLocal;
      return `${gio}:${phut} ${ngay}/${thang}/${nam}`;
    }
  }

  const date = new Date(giaTri);
  if (Number.isNaN(date.getTime())) {
    return String(giaTri);
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("hour")}:${getPart("minute")} ${getPart("day")}/${getPart("month")}/${getPart("year")}`;
}
function hienthiphong(room) {
  hienThi1.innerHTML = "";
  if (room.length === 0) {
    hienThi1.innerHTML = `<p>Không tìm thấy phòng</p>`;
    return;
  }
  room.forEach(function (room2) {
    const khung = document.createElement("div");
    khung.className = "khungchuaphong";
    const anhphong = document.createElement("img");
    anhphong.src = room2.anhphong || "";
    const tenphong = document.createElement("h3");
    tenphong.textContent = room2.tenphong;
    const songuoi = document.createElement("p");
    songuoi.innerHTML =
      "<strong>Số người: </strong>" + (room2.songuoi || "không xác định");
    const loaiphong = document.createElement("p");
    loaiphong.innerHTML =
      "<strong>Loại phòng: </strong>" + (room2.loaiphong || "Không xác định");
    const checkin = document.createElement("p");
    checkin.innerHTML =
      "<strong>Giờ check-in: </strong>" +
      dinhDangNgayGio(room2.checkin || "chưa có");
    const checkout = document.createElement("p");
    checkout.innerHTML =
      "<strong>Giờ check-out: </strong>" +
      dinhDangNgayGio(room2.checkout || "chưa có");
    const button = document.createElement("button");
    button.textContent = "Chi tiết";
    button.addEventListener("click", function () {
      window.location.href =
        "./chitietkhachhangcheckin.html?maphong=" +
        encodeURIComponent(room2.maphong);
    });
    khung.append(
      anhphong,
      tenphong,
      songuoi,
      loaiphong,
      checkin,
      checkout,
      button,
    );
    hienThi1.appendChild(khung);
  });
}
loadroom();
