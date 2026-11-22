// const { json } = require("body-parser");
// const { response } = require("express");

const khuVucBuoc1 = document.getElementById("khuVucBuoc1");
const khuVucBuoc2 = document.getElementById("khuVucBuoc2");
const khuVucBuoc3 = document.getElementById("khuVucBuoc3");

const oNhapMaDatPhong = document.getElementById("oNhapMaDatPhong");
const thongBaoLoiMa = document.getElementById("thongBaoLoiMa");
const khungThongTinDatPhong = document.getElementById("khungThongTinDatPhong");

const nutKiemTraMa = document.getElementById("nutKiemTraMa");
const nutSangBuoc2 = document.getElementById("nutSangBuoc2");

const danhSachKhach = document.getElementById("danhSachKhach");
const nutThemKhach = document.getElementById("nutThemKhach");
const nutNhanDienToanBo = document.getElementById("nutNhanDienToanBo");
const thongBaoLoiKhach = document.getElementById("thongBaoLoiKhach");
const nutSangBuoc3 = document.getElementById("nutSangBuoc3");

const danhSachXemLai = document.getElementById("danhSachXemLai");

const OCR_API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://checkinonlinepython.onrender.com";

function dinhDangNgayThang(chuoiThoiGian) {
  if (!chuoiThoiGian) return "";

  const str = String(chuoiThoiGian).trim();

  if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  const ngay = new Date(str);
  if (Number.isNaN(ngay.getTime())) return str;

  const pad = (n) => String(n).padStart(2, "0");
  const coMuiGio =
    chuoiThoiGian instanceof Date || /[zZ]|[+-]\d{2}:?\d{2}$/.test(str);

  if (coMuiGio) {
    return `${pad(ngay.getUTCHours())}:${pad(ngay.getUTCMinutes())} ${pad(ngay.getUTCDate())}/${pad(ngay.getUTCMonth() + 1)}/${ngay.getUTCFullYear()}`;
  }

  return `${pad(ngay.getHours())}:${pad(ngay.getMinutes())} ${pad(ngay.getDate())}/${pad(ngay.getMonth() + 1)}/${ngay.getFullYear()}`;
}

let danhSachKhachLuuTru = [];
let idKhachTiepTheo = 1;
let daXacNhanMaDatPhong = false;

oNhapMaDatPhong.addEventListener("input", () => {
  daXacNhanMaDatPhong = false;

  khungThongTinDatPhong.classList.add("hidden");
  nutSangBuoc2.classList.add("hidden");
});

function hienThiBuoc(soBuoc) {
  console.trace("Đang chuyển đến bước:", soBuoc);
  khuVucBuoc1.classList.add("hidden");
  khuVucBuoc2.classList.add("hidden");
  khuVucBuoc3.classList.add("hidden");

  document.getElementById("phanThanhCong").classList.add("hidden");
  document.getElementById(`khuVucBuoc${soBuoc}`).classList.remove("hidden");

  for (let i = 1; i <= 3; i++) {
    const chiSo = document.getElementById(`chiSoBuoc${i}`);
    chiSo.classList.remove("hoat-dong", "hoan-thanh");

    if (i < soBuoc) {
      chiSo.classList.add("hoan-thanh");
    } else if (i === soBuoc) {
      chiSo.classList.add("hoat-dong");
    }
  }

  document
    .getElementById("duongNoi1")
    .classList.toggle("hoan-thanh", soBuoc > 1);
  document
    .getElementById("duongNoi2")
    .classList.toggle("hoan-thanh", soBuoc > 2);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

const form = document.getElementById("nutKiemTraMa");
console.log("Phần tử nút kiểm tra là:", form);
form.addEventListener("click", async function (kiemtra) {
  kiemtra.preventDefault();
  const ma = oNhapMaDatPhong.value.trim();
  if (!ma) {
    alert("Vui lòng nhập mã đặt phòng");
    return;
  }
  try {
    const guidi = await fetch("http://localhost:3000/api/maphong", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        maPhong: ma,
      }),
    });
    const ketquanhanve = await guidi.json();
    if (ketquanhanve.success) {
      const thongtinphong = ketquanhanve.data;
      document.getElementById("tenphong1").innerText = thongtinphong.tenphong;
      document.getElementById("loaiphong1").innerText = thongtinphong.loaiphong;
      document.getElementById("songuoi1").innerText = thongtinphong.songuoi;
      document.getElementById("checkin1").innerText = dinhDangNgayThang(
        thongtinphong.checkin,
      );
      document.getElementById("checkout1").innerText = dinhDangNgayThang(
        thongtinphong.checkout,
      );
      if (ketquanhanve.guests && ketquanhanve.guests.length > 0) {
        danhSachKhachLuuTru = ketquanhanve.guests.map((khachCu, index) => ({
          id: idKhachTiepTheo++,
          file: null,
          imageURL: "",
          daNhanDien: true,
          thongTin: {
            fullName: khachCu.fullName || "",
            idNumber: khachCu.idNumber || "",
            dateOfBirth: khachCu.dateOfBirth || "",
            gender: khachCu.gender || "",
            nationality: khachCu.nationality || "",
            hometown: khachCu.hometown || "",
            address: khachCu.address || "",
          },
        }));
        veDanhSachKhach();
      } else {
        danhSachKhachLuuTru = [];
      }
      document
        .getElementById("khungThongTinDatPhong")
        .classList.remove("hidden");
      document.getElementById("nutSangBuoc2").classList.remove("hidden");

      document.getElementById("thongBaoLoiMa").classList.add("hidden");
      daXacNhanMaDatPhong = true;
    } else {
      alert(ketquanhanve.message);
    }
  } catch (error) {
    console.log("Lỗi: ", error);
  }
});

// BƯỚC 2

nutSangBuoc2.addEventListener("click", () => {
  if (!daXacNhanMaDatPhong) {
    alert("Vui lòng kiểm tra mã đặt phòng trước!");
    return;
  }

  hienThiBuoc(2);

  if (danhSachKhachLuuTru.length === 0) {
    themKhachMoi();
  } else {
    veDanhSachKhach();
  }
});

function themKhachMoi() {
  const khach = {
    id: idKhachTiepTheo++,
    file: null,
    imageURL: null,
    daNhanDien: false,
    thongTin: {
      fullName: "",
      idNumber: "",
      dateOfBirth: "",
      gender: "",
      nationality: "",
      hometown: "",
      address: "",
    },
  };

  danhSachKhachLuuTru.push(khach);
  veDanhSachKhach();
}

function veDanhSachKhach() {
  danhSachKhach.innerHTML = "";

  danhSachKhachLuuTru.forEach((khach, index) => {
    const the = document.createElement("div");
    the.className = "border border-slate-200 rounded-xl p-5";

    the.innerHTML = `
      <div class="flex justify-between items-center mb-4">
          <h4 class="font-bold text-slate-800">
              Khách ${String(index + 1).padStart(2, "0")}
          </h4>
          <button
              type="button"
              class="text-red-500 text-sm hover:underline"
              data-action="xoa"
              data-id="${khach.id}"
          >
              Xóa khách
          </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <label class="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-xl p-6 cursor-pointer transition">
          <span class="text-4xl mb-3">📄</span>
          <span class="font-semibold text-slate-700">
              ${khach.file ? "Chọn ảnh khác" : "Tải ảnh CCCD"}
          </span>
          <span class="text-sm text-slate-400 mt-2">
              JPG, PNG hoặc WEBP
          </span>
          <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              data-action="tai-len"
              data-id="${khach.id}"
          >
      </label>

      <button
              type="button"
              class="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 rounded-xl p-4 cursor-pointer transition"
              data-action="mo-camera"
              data-id="${khach.id}"
          >
              <span class="text-3xl mb-2">📸</span>
              <span class="font-semibold text-sm text-indigo-700">Chụp bằng Camera</span>
              <span class="text-xs text-indigo-400 mt-1">Mở camera điện thoại</span>
          </button>
      </div>

<div id="khungCamera-${khach.id}" class="hidden mt-4 bg-slate-900 rounded-xl p-3 text-center">
          <video autoplay playsinline class="w-full max-h-64 rounded-lg object-contain mx-auto bg-black"></video>
          <div class="flex gap-2 mt-3">
              <button
                  type="button"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-black text-sm font-semibold py-2 rounded-lg transition"
                  data-action="chup-anh"
                  data-id="${khach.id}"
              >
                  📸 Chụp ảnh
              </button>
              <button
                  type="button"
                  class="px-4 bg-slate-700 hover:bg-slate-800 text-white text-sm py-2 rounded-lg transition"
                  data-action="tat-camera"
                  data-id="${khach.id}"
              >
                  ✕ Đóng
              </button>
          </div>
      </div>

      ${
        khach.imageURL
          ? `
          <div class="mt-4">
              <p class="text-sm font-semibold text-slate-600 mb-2">
                  Ảnh CCCD đã chọn
              </p>
              <img
                  src="${khach.imageURL}"
                  class="max-h-56 mx-auto rounded-lg object-contain bg-slate-100 p-2"
                  alt="Ảnh CCCD khách ${index + 1}"
              >
          </div>
      `
          : ""
      }

      ${
        khach.daNhanDien
          ? `
          <div class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p class="text-sm text-green-700 font-semibold">
                  ✓ Nhận diện thành công
              </p>
              <p class="text-xs text-green-600 mt-1">
                  Đã trích xuất thông tin khách.
              </p>
          </div>
      `
          : ""
      }
    `;

    danhSachKhach.appendChild(the);
  });

  const coTepTin = danhSachKhachLuuTru.some((khach) => khach.file !== null);
  if (coTepTin) {
    nutNhanDienToanBo.classList.remove("hidden");
  } else {
    nutNhanDienToanBo.classList.add("hidden");
  }

  const duDieuKien =
    danhSachKhachLuuTru.length > 0 &&
    danhSachKhachLuuTru.every((khach) => khach.daNhanDien);
  nutSangBuoc3.disabled = !duDieuKien;
}

let activeStream = null;

danhSachKhach.addEventListener("click", async (event) => {
  const nut = event.target.closest("button[data-action]");
  if (!nut) return;

  const hanhDong = nut.dataset.action;
  const idKhach = Number(nut.dataset.id);
  const khach = danhSachKhachLuuTru.find((item) => item.id === idKhach);
  if (!khach) return;

  const theKhachDiv = nut.closest(".border");
  const khungCam = theKhachDiv.querySelector(`#khungCamera-${khach.id}`);
  const videoElement = khungCam?.querySelector("video");

  if (hanhDong === "mo-camera") {
    try {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      videoElement.srcObject = activeStream;
      khungCam.classList.remove("hidden");
    } catch (error) {
      alert(
        "Không thể truy cập camera. Vui lòng cấp quyền camera trên trình duyệt!",
      );
    }
  }

  if (hanhDong === "tat-camera") {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
    khungCam.classList.add("hidden");
  }

  // nút chụp ảnh
  if (hanhDong === "chup-anh") {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const tepTin = new File([blob], `cccd_khach_${khach.id}.jpg`, {
          type: "image/jpeg",
        });

        if (khach.imageURL) {
          URL.revokeObjectURL(khach.imageURL);
        }

        khach.file = tepTin;
        khach.imageURL = URL.createObjectURL(tepTin);
        khach.daNhanDien = false;

        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
          activeStream = null;
        }

        veDanhSachKhach();
      },
      "image/jpeg",
      0.95,
    );
  }

  if (hanhDong === "xoa") {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
    const viTri = danhSachKhachLuuTru.findIndex((item) => item.id === idKhach);
    if (viTri !== -1) {
      if (khach.imageURL) {
        URL.revokeObjectURL(khach.imageURL);
      }
      danhSachKhachLuuTru.splice(viTri, 1);
      veDanhSachKhach();
    }
  }
});

// tải và xóa ảnh

danhSachKhach.addEventListener("change", (event) => {
  const oNhap = event.target;
  if (oNhap.dataset.action !== "tai-len") return;

  const idKhach = Number(oNhap.dataset.id);
  const khach = danhSachKhachLuuTru.find((item) => item.id === idKhach);
  if (!khach) return;

  const tepTin = oNhap.files[0];
  if (!tepTin) return;

  const loaiHopLe = ["image/jpeg", "image/png", "image/webp"];
  if (!loaiHopLe.includes(tepTin.type)) {
    alert("Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.");
    oNhap.value = "";
    return;
  }

  if (tepTin.size > 10 * 1024 * 1024) {
    alert("Kích thước ảnh không được vượt quá 10MB.");
    oNhap.value = "";
    return;
  }

  if (khach.imageURL) {
    URL.revokeObjectURL(khach.imageURL);
  }

  khach.file = tepTin;
  khach.imageURL = URL.createObjectURL(tepTin);
  khach.daNhanDien = false;

  veDanhSachKhach();
});

danhSachKhach.addEventListener("click", (event) => {
  const nut = event.target.closest("button[data-action]");
  if (!nut) return;

  const hanhDong = nut.dataset.action;
  const idKhach = Number(nut.dataset.id);
  const khach = danhSachKhachLuuTru.find((item) => item.id === idKhach);
  if (!khach) return;

  if (hanhDong === "xoa") {
    const viTri = danhSachKhachLuuTru.findIndex((item) => item.id === idKhach);
    if (viTri !== -1) {
      if (khach.imageURL) {
        URL.revokeObjectURL(khach.imageURL);
      }
      danhSachKhachLuuTru.splice(viTri, 1);
      veDanhSachKhach();
    }
  }
});

nutThemKhach.addEventListener("click", () => {
  themKhachMoi();
});

// nhận diện bằng AI

nutNhanDienToanBo.addEventListener("click", async (event) => {
  event.preventDefault();
  console.log("ĐÃ BẤM NÚT NHẬN DIỆN AI");
  const chuaXacMinh = danhSachKhachLuuTru.filter(
    (khach) => khach.file && !khach.daNhanDien,
  );

  if (chuaXacMinh.length === 0) {
    alert("Tất cả khách đã có ảnh được nhận diện xong!");
    return;
  }

  nutNhanDienToanBo.disabled = true;
  nutNhanDienToanBo.textContent = " AI đang xử lý ảnh CCCD...";
  thongBaoLoiKhach.classList.add("hidden");

  try {
    let soKhachThatBai = 0;

    for (let khach of chuaXacMinh) {
      const formData = new FormData();
      formData.append("file", khach.file);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let response;
      try {
        response = await fetch(`${OCR_API_BASE}/api/nhan-dien-cccd`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json().catch(() => null);

      console.log("KẾT QUẢ FLASK");
      console.log("Khách:", khach.id);
      console.log("HTTP Status:", response.status);
      console.log("Response:", result);

      // Kiểm tra phản hồi
      if (!response.ok || !result || !result.success || !result.data) {
        soKhachThatBai++;

        console.error(`Khách ${khach.id} nhận diện thất bại:`, result);

        continue;
      }

      const data = result.data;

      // Chuẩn hóa dữ liệu nhận được
      const thongTinMoi = {
        fullName: String(data.fullName ?? "").trim(),
        idNumber: String(data.idNumber ?? "").trim(),
        dateOfBirth: String(data.dateOfBirth ?? "").trim(),
        gender: String(data.gender ?? "").trim(),
        nationality: String(data.nationality ?? "").trim(),
        hometown: String(data.hometown ?? "").trim(),
        address: String(data.address ?? "").trim(),
      };

      console.table(thongTinMoi);

      // Kiểm tra dữ liệu thực tế
      const coDuLieuThucTe = Boolean(
        thongTinMoi.fullName ||
        thongTinMoi.idNumber ||
        thongTinMoi.dateOfBirth ||
        thongTinMoi.hometown ||
        thongTinMoi.address,
      );

      if (!coDuLieuThucTe) {
        soKhachThatBai++;

        console.error(
          `Khách ${khach.id}: OCR không trích xuất được thông tin!`,
        );

        continue;
      }

      // Lưu thông tin
      khach.thongTin = thongTinMoi;
      khach.daNhanDien = true;

      console.log(`Khách ${khach.id} đã nhận diện thành công!`, khach.thongTin);
    }
    if (soKhachThatBai === 0) {
      alert("Đã xử lý nhận diện thành công tất cả khách!");
    } else {
      alert(
        `Có ${soKhachThatBai} khách chưa nhận diện được thông tin. Vui lòng kiểm tra lại`,
      );
    }
  } catch (error) {
    console.error("Lỗi kết nối tới Server AI:", error);

    alert("Không thể kết nối đến Server Python (Flask).");
  } finally {
    nutNhanDienToanBo.disabled = false;

    nutNhanDienToanBo.textContent = "Nhận diện toàn bộ danh sách CCCD bằng AI";

    veDanhSachKhach();
  }
  return false;
});

//3: XEM LẠI VÀ CHỈNH SỬA THÔNG TIN

function lamSachHTML(giaTri) {
  return String(giaTri ?? "").replace(/[&<>"']/g, (kyTu) => {
    const kyHieu = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return kyHieu[kyTu];
  });
}

function veDanhSachXemLai() {
  danhSachXemLai.innerHTML = "";

  danhSachKhachLuuTru.forEach((khach, index) => {
    const thongTin = khach.thongTin;
    const the = document.createElement("div");
    the.className = "border border-slate-200 rounded-xl p-5";

    the.innerHTML = `
        <div class="flex justify-between items-center mb-5">
            <h4 class="font-bold text-slate-800">
                Khách ${String(index + 1).padStart(2, "0")}
            </h4>
            <span class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                Đã nhận diện
            </span>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 mb-5">
            <img
                src="${khach.imageURL}"
                class="max-h-48 mx-auto object-contain rounded-lg"
                alt="Ảnh CCCD"
            >
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                    type="text"
                    class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    data-truong="fullName"
                    data-id="${khach.id}"
                    value="${lamSachHTML(thongTin.fullName)}"
                    required
                >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Số CCCD *</label>
                    <input
                        type="text"
                        maxlength="12"
                        inputmode="numeric"
                        class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        data-truong="idNumber"
                        data-id="${khach.id}"
                        value="${lamSachHTML(thongTin.idNumber)}"
                        required
                    >
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh *</label>
                    <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        data-truong="dateOfBirth"
                        data-id="${khach.id}"
                        value="${lamSachHTML(thongTin.dateOfBirth)}"
                        required
                    >
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Giới tính</label>
                    
<select
    class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    data-truong="gender"
    data-id="${khach.id}"
>
    <option value="" ${!thongTin.gender ? "selected" : ""}>
        Chưa nhận diện
    </option>

    <option value="Nam" ${thongTin.gender === "Nam" ? "selected" : ""}>
        Nam
    </option>

    <option value="Nữ" ${thongTin.gender === "Nữ" ? "selected" : ""}>
        Nữ
    </option>

    <option value="Khác" ${thongTin.gender === "Khác" ? "selected" : ""}>
        Khác
    </option>
</select>

                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Quốc tịch</label>
                    <input
                        type="text"
                        class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        data-truong="nationality"
                        data-id="${khach.id}"
                        value="${lamSachHTML(thongTin.nationality)}"
                    >
                </div>
            </div>

            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Quê quán</label>
                <input
                    type="text"
                    class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    data-truong="hometown"
                    data-id="${khach.id}"
                    value="${lamSachHTML(thongTin.hometown)}"
                >
            </div>

            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nơi thường trú</label>
                <textarea
                    rows="2"
                    class="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    data-truong="address"
                    data-id="${khach.id}"
                >${lamSachHTML(thongTin.address)}</textarea>
            </div>
        </div>
    `;
    danhSachXemLai.appendChild(the);
  });
}

danhSachXemLai.addEventListener("input", capNhatThongTinKhach);
danhSachXemLai.addEventListener("change", capNhatThongTinKhach);

function capNhatThongTinKhach(event) {
  const oNhap = event.target;
  const truong = oNhap.dataset.truong;
  const idKhach = Number(oNhap.dataset.id);

  if (!truong) return;
  const khach = danhSachKhachLuuTru.find((item) => item.id === idKhach);
  if (!khach) return;

  khach.thongTin[truong] = oNhap.value;
}

nutSangBuoc3.addEventListener("click", () => {
  if (danhSachKhachLuuTru.length === 0) return;

  if (!danhSachKhachLuuTru.every((khach) => khach.daNhanDien)) {
    thongBaoLoiKhach.textContent =
      "Vui lòng nhận diện CCCD của tất cả khách trước khi tiếp tục.";
    thongBaoLoiKhach.classList.remove("hidden");
    return;
  }

  thongBaoLoiKhach.classList.add("hidden");
  veDanhSachXemLai();
  hienThiBuoc(3);
});

document.getElementById("nutQuayLaiBuoc1").addEventListener("click", () => {
  hienThiBuoc(1);
});

document.getElementById("nutQuayLaiBuoc2").addEventListener("click", () => {
  hienThiBuoc(2);
});

// BƯỚC 3: gửi thông tin

document
  .getElementById("formKhachHang")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const hopKiemXacNhan = document.getElementById("hopKiemXacNhan");
    const thongBaoLoiForm = document.getElementById("thongBaoLoiForm");

    thongBaoLoiForm.classList.add("hidden");

    if (danhSachKhachLuuTru.length === 0) {
      thongBaoLoiForm.textContent = "Danh sách khách đang trống.";
      thongBaoLoiForm.classList.remove("hidden");
      return;
    }

    for (let i = 0; i < danhSachKhachLuuTru.length; i++) {
      const tt = danhSachKhachLuuTru[i].thongTin;

      if (
        !tt.fullName.trim() ||
        !tt.idNumber.trim() ||
        !tt.dateOfBirth.trim()
      ) {
        thongBaoLoiForm.textContent = `Vui lòng hoàn thiện họ tên, số CCCD và ngày sinh của khách ${i + 1}.`;
        thongBaoLoiForm.classList.remove("hidden");
        return;
      }

      if (!/^\d{12}$/.test(tt.idNumber)) {
        thongBaoLoiForm.textContent = `Số CCCD của khách ${i + 1} phải gồm đúng 12 chữ số.`;
        thongBaoLoiForm.classList.remove("hidden");
        return;
      }
    }

    if (!hopKiemXacNhan.checked) {
      thongBaoLoiForm.textContent =
        "Bạn cần xác nhận thông tin của tất cả khách trước khi gửi.";
      thongBaoLoiForm.classList.remove("hidden");
      return;
    }

    const duLieuCheckin = {
      bookingCode: oNhapMaDatPhong.value.trim(),
      guests: danhSachKhachLuuTru.map((khach) => ({ ...khach.thongTin })),
    };
    try {
      const response = await fetch("http://localhost:3000/api/xacnhangui", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(duLieuCheckin),
      });
      const ketqua = await response.json();
      if (!response.ok || !ketqua.success) {
        thongBaoLoiForm.textContent =
          ketqua.message || "Lỗi khi lưu thông tin.";
        thongBaoLoiForm.classList.remove("hidden");
        return;
      }
      console.log("Dữ liệu check-in gửi đi:", duLieuCheckin);

      document.getElementById("maDatPhongThanhCong").textContent =
        oNhapMaDatPhong.value.trim();

      khuVucBuoc1.classList.add("hidden");
      khuVucBuoc2.classList.add("hidden");
      khuVucBuoc3.classList.add("hidden");

      document.getElementById("phanThanhCong").classList.remove("hidden");
      document.getElementById("chiSoBuoc3").classList.add("hoan-thanh");
      document.getElementById("duongNoi2").classList.add("hoan-thanh");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Lỗi kết nối tới Server:", error);
      thongBaoLoiForm.textContent =
        "Không thể kết nối đến server backend. Vui lòng kiểm tra lại";
      thongBaoLoiForm.classList.remove("hidden");
    }
  });
console.log("INDEX.JS ĐƯỢC KHỞI TẠO");

hienThiBuoc(1);
