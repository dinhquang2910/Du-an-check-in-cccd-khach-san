from roboflow import Roboflow
from ultralytics import YOLO

# tải bộ dữ liệu
rf = Roboflow(api_key="bx4EAgEaRMBjPboZTj4d")
project = rf.workspace("dinh-hong-quang-51").project("cccd-0nl3b-unzbu")
version = project.version(1)
dataset = version.download("yolov11")

# train
model = YOLO("yolo11n.pt")
model.train(data=f"{dataset.location}/data.yaml", epochs=25, imgsz=640)