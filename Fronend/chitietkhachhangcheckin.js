const hienthi = document.getElementById("hienthikhach");
const hoho = new URLSearchParams(window.location.search);
const maphong = hoho.get("maphong");
let tatcacackhach = [];

async function loadkhach() {
  if (!maphong) {
    console.log("không tìm thấy mã phòng");
    return;
  }
  try {
    const guidi = await fetch(
      `/api/chitietkhach?maphong=${encodeURIComponent(maphong)}`,
    );
    if (!guidi.ok) {
      throw new Error("không thể lấy danh sách khách hàng");
    }
    const khachhang = await guidi.json();
    tatcacackhach = khachhang;
    hienthikhach(tatcacackhach);
  } catch (error) {
    console.log("lỗi :", error);
  }
}
function dinhDangNgayGio(giaTri) {
  if (!giaTri) return "chưa có";

  const str = String(giaTri).trim();

  // 1. Đã là định dạng "HH:mm DD/MM/YYYY" thì trả về luôn
  if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // 2. Chuỗi "YYYY-MM-DD HH:mm:ss" hoặc "YYYY-MM-DDTHH:mm:ss" KHÔNG có Z / +-HH:mm
  const matchLocal = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/,
  );
  if (matchLocal) {
    const [, nam, thang, ngay, gio, phut] = matchLocal;
    return `${gio}:${phut} ${ngay}/${thang}/${nam}`;
  }

  // 3. Đối tượng Date hoặc chuỗi ISO có múi giờ (Z / +07:00...) -> quy về giờ Việt Nam
  const date = new Date(giaTri);
  if (Number.isNaN(date.getTime())) {
    return str;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("hour")}:${getPart("minute")} ${getPart("day")}/${getPart("month")}/${getPart("year")}`;
}
function dinhDangNgaySinh(gt) {
  if (!gt) return "chưa có";

  const str = String(gt).trim();

  // 1. Đã là "DD/MM/YYYY" thì trả về luôn
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // 2. Chuỗi "YYYY-MM-DD" (kể cả khi kèm theo " HH:mm:ss" hoặc "THH:mm:ss")
  const matchDate = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchDate) {
    const [, nam, thang, ngay] = matchDate;
    return `${ngay}/${thang}/${nam}`;
  }

  // 3. Đối tượng Date hoặc chuỗi ngày hợp lệ khác
  const date = new Date(gt);
  if (Number.isNaN(date.getTime())) {
    return str;
  }

  const pad = (n) => String(n).padStart(2, "0");
  const ngay = pad(date.getUTCDate());
  const thang = pad(date.getUTCMonth() + 1);
  const nam = date.getUTCFullYear();
  return `${ngay}/${thang}/${nam}`;
}
function hienthikhach(khachhang) {
  hienthi.innerHTML = "";
  if (khachhang.length === 0) {
    hienthi.innerHTML = "<h3>Phòng này chưa có khách hàng nào check in</h3>";
    return;
  }
  khachhang.forEach(function (khachhang2) {
    const khung = document.createElement("div");
    khung.className = "khungchuakhach";
    const tenkh = document.createElement("h2");
    tenkh.textContent = khachhang2.tenkh;
    const cccd = document.createElement("p");
    cccd.innerHTML =
      "<strong>Số CCCD: </strong>" + (khachhang2.socccd || "chưa xác định");
    const ngaysinh = document.createElement("p");
    ngaysinh.innerHTML =
      "<strong>Ngày sinh: </strong>" +
      dinhDangNgaySinh(khachhang2.ngaysinh || "không xác định");
    const gioitinh = document.createElement("p");
    gioitinh.innerHTML =
      "<strong>Giới tính: </strong>" +
      (khachhang2.gioitinh || "không xác định");
    const quoctich = document.createElement("p");
    quoctich.innerHTML =
      "<strong>Quốc tịch: </strong>" +
      (khachhang2.quoctich || "không xác định");
    const quequan = document.createElement("p");
    quequan.innerHTML =
      "<strong>Quê quán: </strong>" + (khachhang2.quequan || "không xác định");
    const thuongtru = document.createElement("p");
    thuongtru.innerHTML =
      "<strong>Thường trú: </strong>" +
      (khachhang2.thuongtru || "không xác định");
    const thoigiankhachcheckin = document.createElement("p");
    thoigiankhachcheckin.innerHTML =
      "<strong>Thời gian khách hàng đã check-in online: </strong>" +
      dinhDangNgayGio(khachhang2.ngayvagiocheckin || "không xác định");
    const trangthai = document.createElement("button");
    trangthai.type = "button";
    trangthai.textContent = khachhang2.trangthai;
    trangthai.addEventListener("click", async () => {
      if (trangthai == "Đã xác nhận") {
        return;
      }
      const xacnhan = confirm(
        "Bạn có chắc chắn xác nhận thông tin của khách hàng này không.",
      );
      if (!xacnhan) {
        return;
      }
      trangthai.disabled = true;
      try {
        const guixacnhancheckin = await fetch("/api/xacnhancheckin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            maphong: maphong,
            makh: khachhang2.makh,
          }),
        });
        if (!guixacnhancheckin.ok) {
          throw new Error("Xác nhận thông tin khách hàng thất bại");
        }
        await loadkhach();
      } catch (error) {
        console.log("lỗi :", error);
        alert("Không thể xác nhận khách hàng");
        trangthai.disabled = false;
      }
    });
    khung.append(
      tenkh,
      cccd,
      ngaysinh,
      gioitinh,
      quoctich,
      quequan,
      thuongtru,
      thoigiankhachcheckin,
      trangthai,
    );
    hienthi.appendChild(khung);
  });
}
loadkhach();
