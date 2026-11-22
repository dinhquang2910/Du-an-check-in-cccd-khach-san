const socket = io("http://localhost:3000");
const trangThaiKetNoi = document.getElementById("trangThaiKetNoi");
const danhSachThongBao = document.getElementById("danhSachThongBao");
const nutXoaThongBao = document.getElementById("nutXoaThongBao");
function dinhDangNgayGio(giaTri) {
  if (!giaTri) {
    const now = new Date();
    const gio = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
    const ngay = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now);
    return `${gio} ${ngay}`;
  }

  const str = String(giaTri).trim();

  const matchISO = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2}:\d{2})/,
  );
  if (matchISO) {
    const [, nam, thang, ngay, gio] = matchISO;
    return `${gio} ${ngay}/${thang}/${nam}`;
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;

  const gio = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  const ngay = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  return `${gio} ${ngay}`;
}
function escapeHTML(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );
}

socket.on("connect", () => {
  trangThaiKetNoi.textContent = "Đã kết nối real-time";
  trangThaiKetNoi.classList.add("connected");
});

socket.on("disconnect", () => {
  trangThaiKetNoi.textContent = "Mất kết nối";
  trangThaiKetNoi.classList.remove("connected");
});

nutXoaThongBao.addEventListener("click", () => {
  danhSachThongBao.innerHTML =
    '<div id="trangThaiTrong" class="empty">Chưa có khách nào đã check-in.</div>';
});

function themCardThongBao(payload, isTop = true) {
  const emptyBox = document.getElementById("trangThaiTrong");
  if (emptyBox) emptyBox.remove();

  const thoiGian = dinhDangNgayGio(payload.checkedInAt);

  const danhSachTenKhach =
    Array.isArray(payload.guests) && payload.guests.length > 0
      ? payload.guests
          .map(
            (g) =>
              `<li><strong>${escapeHTML(g.fullName || "")}</strong> — CCCD: ${escapeHTML(g.idNumber || "")}</li>`,
          )
          .join("")
      : `<li>Số lượng khách: ${escapeHTML(payload.guestCount || 0)}</li>`;

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
          <div class="card-top">
            <span class="booking-code">Mã đặt phòng: ${escapeHTML(payload.bookingCode || "-")} ${payload.tenphong ? `(${escapeHTML(payload.tenphong)})` : ""}</span>
            <span class="time">Lúc ${thoiGian}</span>
          </div>
          <div>Khách hàng vừa hoàn tất check-in online:</div>
          <ul class="guest-list">${danhSachTenKhach}</ul>
        `;

  if (isTop) {
    danhSachThongBao.prepend(card);
  } else {
    danhSachThongBao.appendChild(card);
  }
}

async function taiThongBaoTuDB() {
  try {
    const res = await fetch("http://localhost:3000/api/thongbao-checkin");
    const kq = await res.json();

    if (
      !res.ok ||
      !kq.success ||
      !Array.isArray(kq.data) ||
      kq.data.length === 0
    ) {
      return;
    }

    kq.data.forEach((item) => {
      themCardThongBao(item, false);
    });
  } catch (err) {
    console.error("Không tải được lịch sử thông báo:", err);
  }
}

taiThongBaoTuDB();

socket.on("khach_xac_nhan_checkin", (payload) => {
  themCardThongBao(payload, true);
});
