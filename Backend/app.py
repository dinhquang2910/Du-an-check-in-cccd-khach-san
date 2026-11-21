from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import easyocr
import re
import unicodedata

app = Flask(__name__)
CORS(app)

# ==============================
# 1. KHỞI TẠO MÔ HÌNH
# ==============================

model = YOLO("runs/detect/train/weights/best.pt")

print("Đang khởi tạo EasyOCR...")
reader = easyocr.Reader(["vi", "en"], gpu=True)
print("EasyOCR đã sẵn sàng")


# ==============================
# 2. HÀM CHUẨN HÓA VĂN BẢN
# ==============================

def chuan_hoa(text):
    text = str(text).lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(
        char for char in text
        if unicodedata.category(char) != "Mn"
    )
    text = text.replace("đ", "d")
    return re.sub(r"\s+", " ", text).strip()


def clean_address_line(text):
    text = str(text).strip()
    
    # 1. Xóa triệt để các dạng nhãn (có dấu, không dấu, kèm dấu / hoặc :) ở NGAY ĐẦU chuỗi
    text = re.sub(r'(?i)^(?:noi\s*thuong\s*tru|n[ơo]i\s*th[ưươ]ng\s*tr[úu]|que\s*quan|qu[eê]\s*qu[aá]n|place\s*of\s*origin|place\s*of\s*residence|qu[ôo]c\s*t[ịi]ch|gi[ớo]i\s*t[íi]nh)[\s:/\\-]+', '', text)
    
    # 2. Xóa sạch các nhãn rải rác bên trong chuỗi
    text = re.sub(r'(?i)\b(?:noi\s*thuong\s*tru|n[ơo]i\s*th[ưươ]ng\s*tr[úu]|que\s*quan|qu[eê]\s*qu[aá]n|place\s*o[f/]?\s*origin|origin|quo\s*quan|place\s*o[f/]?\s*residence|residence|qu[ôo]c\s*t[ịi]ch|nationality|nauonality|gi[ớo]i\s*t[íi]nh|sex|co\s*gia\s*tri|den\s*ngay|expiry)\b[:\-/]*', '', text)
    
    # 3. Xóa các từ rác do hoa văn chống giả
    text = re.sub(r'(?i)\b(Plecodonin|Plsce|resdenc|residence)\b', '', text)
    
    # 4. Xóa các định dạng ngày tháng hoặc năm lọt vào
    text = re.sub(r'\b\d{1,3}[/.-]\d{1,3}[/.-]\d{2,4}\b', '', text)
    text = re.sub(r'\b\d{1,2}/\d{4}\b', '', text)
    text = re.sub(r'\b(2025|2026|2030|2031|2035|2040)\b', '', text)
    
    text = re.sub(r"\s+", " ", text)
    return text.strip(" :.-/,;")


# ==============================
# HÀM TỰ ĐỘNG XOAY THẲNG ẢNH KHI BỊ NGHIÊNG
# ==============================

def can_chinh_anh_nghieng(anh_cat):
    try:
        h_orig, w_orig = anh_cat.shape[:2]
        padded = cv2.copyMakeBorder(anh_cat, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
        
        gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            rect = cv2.minAreaRect(largest_cnt)
            angle = rect[2]
            
            if angle < -45:
                angle = 90 + angle
            
            if 0.5 < abs(angle) < 45:
                (h, w) = padded.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                anh_xoay = cv2.warpAffine(
                    padded, M, (w, h), 
                    flags=cv2.INTER_CUBIC, 
                    borderMode=cv2.BORDER_REPLICATE
                )
                anh_xoay = anh_xoay[30:30+h_orig, 30:30+w_orig]
                return anh_xoay
    except Exception as e:
        print("Lỗi xoay ảnh nghiêng:", str(e))
        
    return anh_cat


# ==============================
# HÀM GOM NHÓM TỪ THÀNH DÒNG VĂN BẢN KÈM TỌA ĐỘ Y
# ==============================

def gom_nhom_dong_ocr(ocr_results, y_tolerance=12):
    boxes = []
    for item in ocr_results:
        box = item[0]
        text = item[1].strip()
        if not text:
            continue
        pts = np.array(box, dtype=np.int32)
        x_min = np.min(pts[:, 0])
        y_min = np.min(pts[:, 1])
        x_max = np.max(pts[:, 0])
        y_max = np.max(pts[:, 1])
        boxes.append({
            'x1': x_min, 'y1': y_min, 'x2': x_max, 'y2': y_max,
            'text': text,
            'cy': (y_min + y_max) / 2
        })
        
    boxes = sorted(boxes, key=lambda b: b['cy'])
    lines = []
    current_line = []
    
    for box in boxes:
        if not current_line:
            current_line.append(box)
        else:
            avg_cy = sum(b['cy'] for b in current_line) / len(current_line)
            if abs(box['cy'] - avg_cy) <= y_tolerance:
                current_line.append(box)
            else:
                current_line = sorted(current_line, key=lambda b: b['x1'])
                lines.append(current_line)
                current_line = [box]
                
    if current_line:
        current_line = sorted(current_line, key=lambda b: b['x1'])
        lines.append(current_line)
        
    formatted_lines = []
    for line in lines:
        line_text = " ".join([b['text'] for b in line])
        avg_y = sum(b['cy'] for b in line) / len(line)
        formatted_lines.append({'text': line_text, 'y': avg_y})
        
    return formatted_lines


# ==============================
# 3. BÓC TÁCH THÔNG TIN CCCD SẠCH SẼ & CHÍNH XÁC
# ==============================

def phan_tich_cccd_lines(formatted_lines):
    full_name = ""
    id_number = ""
    dob = ""
    gender = "Nam"
    nationality = "Việt Nam"
    hometown_lines = []
    address_lines = []

    line_texts = [item['text'] for item in formatted_lines]
    norm_lines = [chuan_hoa(l) for l in line_texts]

    # 1. Tìm số CCCD (12 chữ số)
    for line in line_texts:
        clean_digits = re.sub(r'\D', '', line)
        if len(clean_digits) == 12:
            id_number = clean_digits
            break
    if not id_number:
        for line in line_texts:
            match = re.search(r'\b\d{12}\b', line)
            if match:
                id_number = match.group(0)
                break

    # 2. Tìm Ngày sinh
    for line in line_texts:
        match = re.search(r'(\d{2})[/. -](\d{2})[/. -](\d{4})', line)
        if match:
            if not any(k in chuan_hoa(line) for k in ["den", "gia tri", "expiry"]):
                dob = f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
                break

    # 3. Tìm Giới tính
    for n_line in norm_lines:
        if re.search(r'\bnu\b', n_line):
            gender = "Nữ"
            break
        elif re.search(r'\bnam\b', n_line):
            gender = "Nam"
            break

    # 4. Tìm Quốc tịch
    for n_line in norm_lines:
        if "viet" in n_line or "nam" in n_line or "v.nam" in n_line:
            nationality = "Việt Nam"
            break

    # 5. Tìm Họ và tên
    name_idx = -1
    for i, n_line in enumerate(norm_lines):
        if "ho va ten" in n_line or "full name" in n_line or ("ho" in n_line and "ten" in n_line):
            if i + 1 < len(line_texts):
                next_line = line_texts[i + 1].strip()
                if not any(kw in chuan_hoa(next_line) for kw in ["ngay sinh", "date", "so", "no", "gioi tinh"]):
                    full_name = clean_address_line(next_line).upper()
                    name_idx = i + 1
                    break
                    
    if not full_name:
        for i, line in enumerate(line_texts):
            cleaned = clean_address_line(line)
            words = cleaned.split()
            if 2 <= len(words) <= 5 and cleaned.isupper() and not any(char.isdigit() for char in cleaned):
                n_clean = chuan_hoa(cleaned)
                excluded = ["cong hoa", "xa hoi", "chu nghia", "viet nam", "doc lap", "tu do", "hanh phuc", "can cuoc", "cong dan", "citizen", "identity", "card"]
                if not any(ex in n_clean for ex in excluded):
                    full_name = cleaned
                    name_idx = i
                    break

    # 6. Xác định vùng chứa địa chỉ theo cấu trúc tuần tự tuyệt đối
    header_end_idx = -1
    for i, n_line in enumerate(norm_lines):
        if any(k in n_line for k in ["gioi tinh", "sex", "quoc tich", "nationality", "nam", "nu"]):
            header_end_idx = i

    if header_end_idx == -1 and name_idx != -1:
        header_end_idx = name_idx + 2

    # Tìm mốc hạn sử dụng ở cuối thẻ để cắt đuôi
    expiry_idx = len(line_texts)
    for i in range(header_end_idx + 1 if header_end_idx != -1 else 0, len(line_texts)):
        n_line = norm_lines[i]
        if any(k in n_line for k in ["co gia tri", "expiry", "date", "den nag", "den ngay"]):
            expiry_idx = i
            break

    # Quét toàn bộ các dòng hợp lệ nằm giữa header và expiry
    valid_address_lines = []
    start_scan = header_end_idx + 1 if header_end_idx != -1 else 3
    
    for j in range(start_scan, expiry_idx):
        if j >= len(line_texts):
            break
        l = line_texts[j]
        l_norm = chuan_hoa(l)
        
        # Bỏ qua dòng chứa từ khóa hạn sử dụng hoặc năm hết hạn
        if any(k in l_norm for k in ["co gia tri", "expiry", "date", "den ngay", "2026", "2031", "2030"]):
            continue
            
        # Nếu dòng chứa từ khóa nhãn ngắn, bóc tách lấy phần giá trị phía sau
        if any(kw in l_norm for kw in ["que", "origin", "thuong", "tru", "residence"]) and len(l_norm) < 35:
            if ":" in l or "/" in l:
                parts = re.split(r'[:/]', l, 1)
                if len(parts) > 1:
                    val = clean_address_line(parts[1])
                    if val and len(val) > 1 and val not in valid_address_lines:
                        valid_address_lines.append(val)
            continue
            
        cleaned = clean_address_line(l)
        if cleaned and not re.search(r'\d{12}', cleaned) and len(cleaned) > 1:
            if cleaned not in valid_address_lines:
                valid_address_lines.append(cleaned)

    # 7. Phân bổ tuần tự: Dòng đầu tiên là Quê quán, các dòng sau là Nơi thường trú
    if len(valid_address_lines) > 0:
        hometown_lines.append(valid_address_lines[0])
    
    if len(valid_address_lines) > 1:
        for line in valid_address_lines[1:]:
            if line not in address_lines:
                address_lines.append(line)

    hometown = ", ".join(hometown_lines)
    address = ", ".join(address_lines)

    return {
        "fullName": full_name,
        "idNumber": id_number,
        "dateOfBirth": dob,
        "gender": gender,
        "nationality": nationality,
        "hometown": hometown,
        "address": address
    }


# ==============================
# 4. API NHẬN DIỆN CCCD
# ==============================

@app.route("/api/nhan-dien-cccd", methods=["POST"])
def nhan_dien_cccd():
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "message": "Không tìm thấy file ảnh!"}), 400

        file = request.files["file"]
        npimg = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"success": False, "message": "File ảnh bị lỗi!"}), 400

        # YOLO nhận diện khung thẻ
        results = model(img, conf=0.30, imgsz=960, verbose=False)
        boxes = results[0].boxes

        if boxes is None or len(boxes) == 0:
            return jsonify({
                "success": False,
                "message": "Không nhận diện được CCCD. Vui lòng chụp lại ảnh rõ nét"
            }), 400

        x1_min = float('inf')
        y1_min = float('inf')
        x2_max = float('-inf')
        y2_max = float('-inf')

        for box in boxes:
            coords = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, coords)
            x1_min = min(x1_min, x1)
            y1_min = min(y1_min, y1)
            x2_max = max(x2_max, x2)
            y2_max = max(y2_max, y2)

        height, width = img.shape[:2]
        padding = 50

        x1 = max(0, x1_min - padding)
        y1 = max(0, y1_min - padding)
        x2 = min(width, x2_max + padding)
        y2 = min(height, y2_max + padding)

        anh_cccd = img[y1:y2, x1:x2]

        if anh_cccd.size == 0:
            return jsonify({"success": False, "message": "Không thể cắt vùng CCCD!"}), 400

        # Tự động xoay thẳng ảnh nếu bị nghiêng nhẹ
        anh_cccd = can_chinh_anh_nghieng(anh_cccd)

        # Phóng to ảnh để EasyOCR đọc nét hơn
        anh_cccd = cv2.resize(anh_cccd, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        # Đọc chi tiết từng từ bằng EasyOCR
        ocr_results = reader.readtext(anh_cccd, detail=1, paragraph=False)

        # Gom nhóm từ thành các dòng văn bản kèm tọa độ Y
        formatted_lines = gom_nhom_dong_ocr(ocr_results, y_tolerance=12)

        print("\nKẾT QUẢ GOM NHÓM DÒNG OCR")
        for i, item in enumerate(formatted_lines):
            print(f"[{i}] (y={item['y']:.1f}) {item['text']}")
        print("=========================\n")

        # Phân tích và bóc tách thông tin
        data = phan_tich_cccd_lines(formatted_lines)

        print(" DỮ LIỆU TRẢ VỀ FRONTEND ")
        for key, value in data.items():
            print(f"{key}: {value}")
        print("==========================")

        return jsonify({
            "success": True,
            "data": data
        })

    except Exception as e:
        print("Lỗi nhận diện CCCD:", str(e))
        return jsonify({
            "success": False,
            "message": "Lỗi xử lý ảnh CCCD!",
            "error": str(e)
        }), 500


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=True)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)