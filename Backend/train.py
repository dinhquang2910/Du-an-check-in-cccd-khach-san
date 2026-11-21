from roboflow import Roboflow
from ultralytics import YOLO

# 1. Tải bộ dữ liệu từ workspace của bạn
rf = Roboflow(api_key="bx4EAgEaRMBjPboZTj4d")
project = rf.workspace("dinh-hong-quang-51").project("cccd-0nl3b-unzbu")
version = project.version(1)
dataset = version.download("yolov11")

# 2. Bắt đầu huấn luyện mô hình YOLO11
model = YOLO("yolo11n.pt")
model.train(data=f"{dataset.location}/data.yaml", epochs=25, imgsz=640)